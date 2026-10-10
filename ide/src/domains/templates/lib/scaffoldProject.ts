import cmakeTemplate from '../assets/CMakeLists.txt.template?raw';
import type {
  PluginType,
  TemplateData,
} from '@/domains/templates/stores/templateStore';
import { generateLinkedPluginSources } from '@/domains/ui-designer/lib/uiSync';
import { generateProcessorCode } from '@/domains/ui-designer/lib/processorGenerator';
import { serializeAetherDocument } from '@/domains/ui-designer/lib/uiDocument';
import {
  AETHER_FRAMEWORK_REPOSITORY,
  AETHER_FRAMEWORK_VERSION,
} from '@/shared/lib/frameworkVersion';
import {
  DEFAULT_PLUGIN_VENDOR,
  defaultProjectMeta,
} from '@/shared/lib/projectMeta';
import type { AetherParameter } from '@/shared/types';

const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function isValidPluginName(name: string): boolean {
  return IDENTIFIER_RE.test(name);
}

export function validatePluginName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Plugin name is required.';
  }
  if (!isValidPluginName(trimmed)) {
    return 'Use a C++ identifier: letters, digits, underscore; must not start with a digit.';
  }
  return null;
}

function renderTemplate(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) =>
    data[key] !== undefined ? data[key] : ''
  );
}

function seedExistingCpp(className: string, pluginType: PluginType): string {
  const hint =
    pluginType === 'Instrument'
      ? '    // TODO: handle MIDI note on/off and voices\n'
      : '    // TODO: wire audio processing parameters\n';

  return `// GENERATED CODE - DO NOT MODIFY COMMENTS
#include "${className}.h"

void ${className}UI::setupUI([[maybe_unused]] aether::PluginProcessor& processor) {
    // --- AETHER UI BEGIN ---
    // --- AETHER UI END ---

    // --- USER CODE BEGIN: SetupUI ---
${hint}    // --- USER CODE END: SetupUI ---
}

// --- USER CODE BEGIN: CustomMethods ---

// --- USER CODE END: CustomMethods ---
`;
}

/** Parameter every new project starts with, driven by GAIN_USER_CODE. */
export const DEFAULT_PARAMETER: AetherParameter = {
  id: 'gain',
  name: 'Gain',
  type: 'float',
  min: 0,
  max: 2,
  default: 1,
};

/**
 * USER CODE of a new project's processor: applies DEFAULT_PARAMETER with a 20 ms ramp, so
 * the plugin changes the sound out of the box without clicks. samples/GainPlugin uses the
 * same code.
 */
export const GAIN_USER_CODE: Record<string, string> = {
  Includes: '#include "aether/SmoothedValue.h"',
  PrivateMembers: `    // Ramps gain changes to avoid clicks.
    aether::SmoothedValue gain_;`,
  PrepareToPlay: '    gain_.reset(setup.sampleRate, 20.0);',
  ProcessBlock: `    // Scales the input by the smoothed gain. Reads the input sample before writing the
    // output one, so in-place processing is safe.
    gain_.setTarget(gainParameter_->value());
    const aether::AudioBuffer& input = context.input;
    aether::AudioBuffer& output = context.output;
    for (int i = 0; i < output.numSamples(); ++i) {
        const float gain = gain_.next();
        for (int ch = 0; ch < output.numChannels(); ++ch) {
            const float in = ch < input.numChannels() ? input.channel(ch)[i] : 0.0f;
            output.channel(ch)[i] = in * gain;
        }
    }`,
};

/** CMakeLists.txt of a project named @p className. */
export function renderProjectCMake(className: string): string {
  return renderTemplate(cmakeTemplate, {
    className,
    aetherVersion: AETHER_FRAMEWORK_VERSION,
    aetherRepository: AETHER_FRAMEWORK_REPOSITORY,
  });
}

export interface ScaffoldProjectInput {
  className: string;
  pluginType: PluginType;
  /** Company or author; defaults to DEFAULT_PLUGIN_VENDOR. */
  vendor?: string;
  templates: TemplateData;
}

export type ScaffoldFileMap = Record<string, string>;

/**
 * Pure scaffold builder — no filesystem. Electron writes the returned map.
 */
export function buildScaffoldFiles(
  input: ScaffoldProjectInput
): ScaffoldFileMap {
  const className = input.className.trim();
  const nameError = validatePluginName(className);
  if (nameError) {
    throw new Error(nameError);
  }

  const { headerCode, cppCode } = generateLinkedPluginSources({
    components: [],
    className,
    templates: input.templates,
    existingHeader: '',
    existingCpp: seedExistingCpp(className, input.pluginType),
  });

  const vendor = input.vendor?.trim() || DEFAULT_PLUGIN_VENDOR;
  const meta = {
    ...defaultProjectMeta(className, input.pluginType, vendor),
    parameters: [DEFAULT_PARAMETER],
  };
  const aether = serializeAetherDocument([], 600, 400, meta);
  const processor = generateProcessorCode({
    className,
    meta,
    userCodeDefaults: GAIN_USER_CODE,
  });

  return {
    [`${className}.h`]: headerCode,
    [`${className}.cpp`]: cppCode,
    [`${className}Processor.h`]: processor.headerCode,
    [`${className}Processor.cpp`]: processor.cppCode,
    [`${className}.aether`]: `${aether}\n`,
    'CMakeLists.txt': renderProjectCMake(className),
    'README.md': `# ${className}

AetherIDE ${input.pluginType} plugin, Aether framework ${AETHER_FRAMEWORK_VERSION}.

## Build

\`\`\`bash
cmake -S . -B build
cmake --build build --config Release
ctest --test-dir build -C Release
\`\`\`

CMake downloads the framework (tag \`v${AETHER_FRAMEWORK_VERSION}\`). To use a local
AetherIDE checkout instead, add \`-DFETCHCONTENT_SOURCE_DIR_AETHER=<AetherIDE root>\`
to the first command.
`,
  };
}
