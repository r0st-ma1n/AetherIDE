import processorCppTemplate from '@/domains/templates/assets/Processor.cpp.template?raw';
import processorHeaderTemplate from '@/domains/templates/assets/Processor.h.template?raw';
import { extractUserCode } from '@/domains/ui-designer/lib/codeGenerator';
import type {
  AetherParameter,
  AetherPluginInfo,
  AetherProjectMeta,
} from '@/shared/types';

/** Body of processBlock() in a new project: copies input to output. */
const DEFAULT_PROCESS_BLOCK = `    // Pass-through. Replace with your DSP; read parameters through the pointers above.
    // Rules for the audio thread: docs/framework/plugin-contract.md.
    const aether::AudioBuffer& input = context.input;
    aether::AudioBuffer& output = context.output;
    for (int ch = 0; ch < output.numChannels(); ++ch) {
        float* out = output.channel(ch);
        const float* in = ch < input.numChannels() ? input.channel(ch) : nullptr;
        for (int i = 0; i < output.numSamples(); ++i) {
            out[i] = in != nullptr ? in[i] : 0.0f;
        }
    }`;

const USER_CODE_DEFAULTS: Record<string, string> = {
  Includes: '',
  PublicMethods: '',
  PrivateMembers: '',
  Constructor: '',
  PrepareToPlay: '',
  ProcessBlock: DEFAULT_PROCESS_BLOCK,
  ReleaseResources: '',
  CustomMethods: '',
};

/** Class name of the generated processor for project class @p className. */
export function processorClassName(className: string): string {
  return `${className}Processor`;
}

/** C++ string literal for @p value. */
export function cppString(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
  return `"${escaped}"`;
}

/** C++ float literal for @p value: 1 → "1.0f", 0.25 → "0.25f", 1e-7 → "1e-7f". */
export function cppFloat(value: number): string {
  const text = String(value);
  return /[.e]/.test(text) ? `${text}f` : `${text}.0f`;
}

/**
 * Member names for parameter pointers: "gain" → "gainParameter_". Characters that are
 * not valid in an identifier become "_"; clashes get a number: "mix_a2Parameter_".
 */
export function parameterMemberNames(
  parameters: readonly AetherParameter[]
): Map<string, string> {
  const names = new Map<string, string>();
  const taken = new Set<string>();
  for (const param of parameters) {
    const base = param.id.replace(/[^A-Za-z0-9_]/g, '_');
    let name = `${base}Parameter_`;
    for (let n = 2; taken.has(name); n += 1) name = `${base}${n}Parameter_`;
    taken.add(name);
    names.set(param.id, name);
  }
  return names;
}

function parseVersion(version: string): string {
  const [major = '1', minor = '0', patch = '0'] = version.split('.');
  return `{${major}, ${minor}, ${patch}}`;
}

function pluginInfoFields(plugin: AetherPluginInfo): string {
  const fields = [
    `.name = ${cppString(plugin.name)}`,
    `.vendor = ${cppString(plugin.vendor)}`,
    `.id = ${cppString(plugin.id)}`,
    `.version = ${parseVersion(plugin.version)}`,
    // Always listed: GCC's -Wmissing-field-initializers flags omitted std::string members.
    `.url = ${cppString(plugin.url ?? '')}`,
    `.email = ${cppString(plugin.email ?? '')}`,
    // Only effects exist in the framework for v1; Instrument fails the build below.
    `.category = aether::PluginCategory::Effect`,
  ];
  return fields.map((field) => `        ${field},`).join('\n');
}

function categoryCheck(plugin: AetherPluginInfo): string {
  return plugin.category === 'Instrument'
    ? '\n#error "Instrument plugins are not supported yet: set plugin.category to Effect"\n'
    : '';
}

function parameterOptions(param: AetherParameter): string {
  if (param.type !== 'float') return '';
  const options = [
    ...(param.step ? [`.step = ${cppFloat(param.step)}`] : []),
    ...(param.unit ? [`.unit = ${cppString(param.unit)}`] : []),
  ];
  return options.length > 0 ? `, {${options.join(', ')}}` : '';
}

function addParameterCall(param: AetherParameter): string {
  const id = cppString(param.id);
  const name = cppString(param.name);
  switch (param.type) {
    case 'float':
      return `parameters_.addFloat(${id}, ${name}, ${cppFloat(param.min)}, ${cppFloat(param.max)}, ${cppFloat(param.default)}${parameterOptions(param)})`;
    case 'bool':
      return `parameters_.addBool(${id}, ${name}, ${param.default})`;
    case 'choice':
      return `parameters_.addChoice(${id}, ${name}, {${param.choices.map(cppString).join(', ')}}, ${param.default})`;
  }
}

function renderTemplate(template: string, data: Record<string, string>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) =>
    data[key] !== undefined ? data[key] : ''
  );
}

export interface ProcessorSourcesInput {
  /** Project class name, e.g. "GainPlugin"; the processor is "<className>Processor". */
  className: string;
  meta: AetherProjectMeta;
  existingHeader?: string;
  existingCpp?: string;
  /** Bodies for USER CODE regions missing from the existing files (new projects). */
  userCodeDefaults?: Partial<Record<string, string>>;
}

/**
 * `<className>Processor.h/.cpp` from the `.aether` metadata and parameters.
 * Everything outside USER CODE regions is regenerated; the regions are kept.
 */
export function generateProcessorCode(input: ProcessorSourcesInput): {
  headerCode: string;
  cppCode: string;
} {
  const processorClass = processorClassName(input.className);
  const { plugin, parameters } = input.meta;
  const members = parameterMemberNames(parameters);
  const userCode = {
    ...extractUserCode(input.existingHeader ?? ''),
    ...extractUserCode(input.existingCpp ?? ''),
  };
  const user = (block: string) =>
    userCode[block] ??
    input.userCodeDefaults?.[block] ??
    USER_CODE_DEFAULTS[block]!;

  const parameterMembers = parameters
    .map(
      (param) =>
        `    aether::AudioProcessorParameter* ${members.get(param.id)} = nullptr;\n`
    )
    .join('');
  const parameterSetup = parameters
    .map(
      (param) => `    ${members.get(param.id)} = &${addParameterCall(param)};\n`
    )
    .join('');

  const common = {
    aetherFile: `${input.className}.aether`,
    processorClass,
  };

  const headerCode = renderTemplate(processorHeaderTemplate, {
    ...common,
    includes: user('Includes'),
    publicMethods: user('PublicMethods'),
    parameterMembers: parameterMembers ? `${parameterMembers}\n` : '',
    privateMembers: user('PrivateMembers'),
  });

  const cppCode = renderTemplate(processorCppTemplate, {
    ...common,
    categoryCheck: categoryCheck(plugin),
    pluginInfoFields: pluginInfoFields(plugin),
    parameterSetup: parameterSetup ? `${parameterSetup}\n` : '',
    constructor: user('Constructor'),
    prepareToPlay: user('PrepareToPlay'),
    processBlock: user('ProcessBlock'),
    releaseResources: user('ReleaseResources'),
    customMethods: user('CustomMethods'),
  });

  return { headerCode, cppCode };
}
