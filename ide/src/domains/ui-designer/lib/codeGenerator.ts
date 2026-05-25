import type { UiComponent } from '@/shared/types';

function sanitizeIdentifier(value: string) {
  return value.replace(/[^a-zA-Z0-9_]/g, '');
}

export function generateCodePreview(components: UiComponent[]) {
  return `${components.length} UI components`;
}

export function generateHeaderFromUi(
  components: UiComponent[],
  className: string
) {
  let code =
    '// GENERATED CODE - DO NOT MODIFY COMMENTS\n' +
    '#pragma once\n\n' +
    '#include "apf/PluginProcessor.h"\n\n' +
    `class ${className}UI {\n` +
    'public:\n' +
    '    void setup() {\n';

  components.forEach((component) => {
    const safeId = sanitizeIdentifier(component.id);
    code +=
      `        // COMPONENT: ${component.id} | TYPE: ${component.type}\n` +
      `        ${safeId}.setBounds(${component.position.x}, ${component.position.y}, 100, 40);\n`;
  });

  code += '    }\n\nprivate:\n';

  components.forEach((component) => {
    const safeId = sanitizeIdentifier(component.id);
    code += `        apf::${component.type} ${safeId};\n`;
  });

  code += '};\n';

  return code;
}
