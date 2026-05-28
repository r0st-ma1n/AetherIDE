import type { UiComponent, UISpec } from '@/shared/types';

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

export interface Templates {
  header: string;
  cpp: string;
  components: Record<string, string>;
}

export function validateCppSyntax(code: string): {
  valid: boolean;
  error?: string;
} {
  const stack: string[] = [];
  const pairs: Record<string, string> = { '}': '{', ')': '(', ']': '[' };

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    if (char === '{' || char === '(' || char === '[') {
      stack.push(char);
    } else if (char === '}' || char === ')' || char === ']') {
      if (stack.length === 0 || stack.pop() !== pairs[char]) {
        return {
          valid: false,
          error: `Unmatched closing bracket '${char}' near index ${i}`,
        };
      }
    }
  }

  return stack.length === 0
    ? { valid: true }
    : { valid: false, error: 'Unclosed brackets remaining in code' };
}

export function generatePluginCode(
  components: UiComponent[],
  className: string,
  templates: Templates,
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
    .map((c) => `    aether::${c.type} ${c.safeId};`)
    .join('\n');
  const eventHandlersDeclarations = safeComponents
    .map(
      (c) => `    void on${capitalize(c.safeId)}ValueChanged(float newValue);`
    )
    .join('\n');

  const setupComponents = safeComponents
    .map(
      (c) => `    // Setup ${c.safeId}
    ${c.safeId}.setBounds(${c.position.x}, ${c.position.y}, ${c.size.width}, ${c.size.height});
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

  const headerCode = renderTemplate(templates.header, {
    className,
    includes: getUserCode(headerUserCode, 'Includes'),
    publicMethods: getUserCode(headerUserCode, 'PublicMethods', '    '),
    componentDeclarations,
    eventHandlersDeclarations,
    privateMembers: getUserCode(headerUserCode, 'PrivateMembers', '    '),
  });

  const cppCode = renderTemplate(templates.cpp, {
    className,
    setupComponents,
    setupUI: getUserCode(cppUserCode, 'SetupUI', '    '),
    eventHandlersImplementations,
    customMethods: getUserCode(cppUserCode, 'CustomMethods'),
  });

  return { headerCode, cppCode };
}

export function generateCppFromUI(spec: UISpec): string {
  return spec.components
    .map((c) => {
      const parts = [
        `id=${c.id}`,
        `type=${c.type}`,
        `x=${c.position.x}`,
        `y=${c.position.y}`,
        `w=${c.size.width}`,
        `h=${c.size.height}`,
      ];
      if (c.params !== undefined) {
        parts.push(
          `min=${c.params.min}`,
          `max=${c.params.max}`,
          `default=${c.params.default}`
        );
      }
      if (c.color !== undefined) {
        parts.push(`color=${c.color}`);
      }
      return `// AETHER ${parts.join(' ')}\n${c.id}.setBounds(${c.position.x}, ${c.position.y}, ${c.size.width}, ${c.size.height});`;
    })
    .join('\n');
}
