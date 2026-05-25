import type { UiComponent } from '@/shared/types';

function sanitizeIdentifier(value: string) {
  return value.replace(/[^a-zA-Z0-9_]/g, '');
}

export function generateCodePreview(components: UiComponent[]) {
  return `${components.length} UI components`;
}

// Извлекает пользовательский код между метками
export function extractUserCode(sourceCode: string): Record<string, string> {
  const userCode: Record<string, string> = {};
  const regex =
    /\/\/ --- USER CODE BEGIN: ([\w_]+) ---\n([\s\S]*?)\/\/ --- USER CODE END: \1 ---/g;
  let match;

  while ((match = regex.exec(sourceCode)) !== null) {
    // Сохраняем код, удаляя лишние пробелы/переносы только в самом конце
    userCode[match[1]] = match[2].replace(/\s+$/, '');
  }

  return userCode;
}

function getUserCode(
  userCodeDict: Record<string, string>,
  blockName: string,
  defaultIndent = ''
): string {
  if (userCodeDict[blockName] !== undefined) {
    return userCodeDict[blockName];
  }
  return defaultIndent;
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Простой шаблонизатор в стиле Handlebars (Jinja2)
function renderTemplate(template: string, data: Record<string, string>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
    data[key] !== undefined ? data[key] : ''
  );
}

const HEADER_TEMPLATE = `// GENERATED CODE - DO NOT MODIFY COMMENTS
#pragma once

#include "apf/PluginProcessor.h"
#include "apf/Parameter.h"

// --- USER CODE BEGIN: Includes ---
{{includes}}
// --- USER CODE END: Includes ---

class {{className}}UI {
public:
    void setupUI(apf::PluginProcessor& processor);

    // --- USER CODE BEGIN: PublicMethods ---
{{publicMethods}}
    // --- USER CODE END: PublicMethods ---

private:
{{componentDeclarations}}

    // Event Handlers
{{eventHandlersDeclarations}}

    // --- USER CODE BEGIN: PrivateMembers ---
{{privateMembers}}
    // --- USER CODE END: PrivateMembers ---
};
`;

const CPP_TEMPLATE = `// GENERATED CODE - DO NOT MODIFY COMMENTS
#include "{{className}}.h"

void {{className}}UI::setupUI(apf::PluginProcessor& processor) {
{{setupComponents}}

    // --- USER CODE BEGIN: SetupUI ---
{{setupUI}}
    // --- USER CODE END: SetupUI ---
}

{{eventHandlersImplementations}}

// --- USER CODE BEGIN: CustomMethods ---
{{customMethods}}
// --- USER CODE END: CustomMethods ---
`;

export function generatePluginCode(
  components: UiComponent[],
  className: string,
  existingHeader: string = '',
  existingCpp: string = ''
) {
  const headerUserCode = extractUserCode(existingHeader);
  const cppUserCode = extractUserCode(existingCpp);

  const safeComponents = components.map((c) => ({
    ...c,
    safeId: sanitizeIdentifier(c.id),
  }));

  const componentDeclarations = safeComponents
    .map((c) => `    apf::${c.type} ${c.safeId};`)
    .join('\n');
  const eventHandlersDeclarations = safeComponents
    .map(
      (c) => `    void on${capitalize(c.safeId)}ValueChanged(float newValue);`
    )
    .join('\n');

  const setupComponents = safeComponents
    .map(
      (c) => `    // Setup ${c.safeId}
    ${c.safeId}.setBounds(${c.position.x}, ${c.position.y}, 100, 40);
    if (auto* param = processor.getParameter("${c.id}")) {
        ${c.safeId}.setParameter(param);
    }
    ${c.safeId}.onValueChanged = this { on${capitalize(c.safeId)}ValueChanged(val); };`
    )
    .join('\n\n');

  const eventHandlersImplementations = safeComponents
    .map(
      (
        c
      ) => `void ${className}UI::on${capitalize(c.safeId)}ValueChanged(float newValue) {
    // --- USER CODE BEGIN: on${capitalize(c.safeId)}ValueChanged ---
${getUserCode(cppUserCode, `on${capitalize(c.safeId)}ValueChanged`, '    ')}
    // --- USER CODE END: on${capitalize(c.safeId)}ValueChanged ---
}`
    )
    .join('\n\n');

  const headerCode = renderTemplate(HEADER_TEMPLATE, {
    className,
    includes: getUserCode(headerUserCode, 'Includes'),
    publicMethods: getUserCode(headerUserCode, 'PublicMethods', '    '),
    componentDeclarations,
    eventHandlersDeclarations,
    privateMembers: getUserCode(headerUserCode, 'PrivateMembers', '    '),
  });

  const cppCode = renderTemplate(CPP_TEMPLATE, {
    className,
    setupComponents,
    setupUI: getUserCode(cppUserCode, 'SetupUI', '    '),
    eventHandlersImplementations,
    customMethods: getUserCode(cppUserCode, 'CustomMethods'),
  });

  return { headerCode, cppCode };
}
