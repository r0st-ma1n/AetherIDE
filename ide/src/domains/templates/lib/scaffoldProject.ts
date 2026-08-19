import cmakeTemplate from '../assets/CMakeLists.txt.template?raw';
import type {
  PluginType,
  TemplateData,
} from '@/domains/templates/stores/templateStore';
import { generateLinkedPluginSources } from '@/domains/ui-designer/lib/uiSync';
import { serializeAetherDocument } from '@/domains/ui-designer/lib/uiDocument';
import { validateAetherProject } from '@/shared/schemas/validateAetherProject';

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

void ${className}UI::setupUI(aether::PluginProcessor& processor) {
    // --- AETHER UI BEGIN ---
    // --- AETHER UI END ---

    // --- USER CODE BEGIN: SetupUI ---
${hint}    // --- USER CODE END: SetupUI ---
}

// --- USER CODE BEGIN: CustomMethods ---

// --- USER CODE END: CustomMethods ---
`;
}

export interface ScaffoldProjectInput {
  className: string;
  pluginType: PluginType;
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

  const aether = {
    ...JSON.parse(serializeAetherDocument([], 600, 400)),
    pluginType: input.pluginType,
  };

  const aetherCheck = validateAetherProject(aether);
  if (!aetherCheck.valid) {
    throw new Error(
      `Invalid scaffold .aether: ${aetherCheck.errors.join('; ')}`
    );
  }

  return {
    [`${className}.h`]: headerCode,
    [`${className}.cpp`]: cppCode,
    [`${className}.aether`]: `${JSON.stringify(aether, null, 2)}\n`,
    'CMakeLists.txt': `${renderTemplate(cmakeTemplate, { className })}\n`,
    'README.md': `# ${className}

AetherIDE ${input.pluginType} plugin scaffold.

## Build

\`\`\`bash
cmake -S . -B build
cmake --build build
\`\`\`
`,
  };
}
