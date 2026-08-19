import type {
  UiComponent,
  UISpec,
  UISpecComponent,
  CppSerializerMap,
} from '@/shared/types';

export const AETHER_UI_BEGIN = '// --- AETHER UI BEGIN ---';
export const AETHER_UI_END = '// --- AETHER UI END ---';

const AETHER_SERIALIZERS = {
  id: (val, out) => out.push(`id=${val}`),
  type: (val, out) => out.push(`type=${val}`),
  position: (val, out) => {
    out.push(`x=${val.x}`);
    out.push(`y=${val.y}`);
  },
  size: (val, out) => {
    out.push(`w=${val.width}`);
    out.push(`h=${val.height}`);
  },
  params: (val, out) => {
    if (val === undefined) return;
    out.push(`min=${val.min}`, `max=${val.max}`, `default=${val.default}`);
    if (val.step !== undefined) out.push(`step=${val.step}`);
  },
  color: (val, out) => {
    if (val !== undefined) out.push(`color=${val}`);
  },
} satisfies CppSerializerMap;

export function formatAetherComment(component: UISpecComponent): string {
  const parts: string[] = [];
  AETHER_SERIALIZERS.id(component.id, parts);
  AETHER_SERIALIZERS.type(component.type, parts);
  AETHER_SERIALIZERS.position(component.position, parts);
  AETHER_SERIALIZERS.size(component.size, parts);
  AETHER_SERIALIZERS.params(component.params, parts);
  AETHER_SERIALIZERS.color(component.color, parts);
  return `// AETHER ${parts.join(' ')}`;
}

/**
 * Machine-owned UI block: AETHER markers + setBounds calls.
 * Parse back with parseUIFromCpp (reads // AETHER lines only).
 */
export function generateCppFromUI(spec: UISpec): string {
  const lines: string[] = [AETHER_UI_BEGIN];
  for (const component of spec.components) {
    const safeId = sanitizeIdentifier(component.id);
    lines.push(formatAetherComment(component));
    lines.push(
      `${safeId}.setBounds(${component.position.x}, ${component.position.y}, ${component.size.width}, ${component.size.height});`
    );
  }
  lines.push(AETHER_UI_END);
  return lines.join('\n');
}

/**
 * Replace an existing AETHER UI block in source, or append one before the
 * last closing brace of setupUI if markers are missing.
 */
export function upsertAetherUiBlock(source: string, block: string): string {
  const begin = source.indexOf(AETHER_UI_BEGIN);
  const end = source.indexOf(AETHER_UI_END);

  if (begin !== -1 && end !== -1 && end > begin) {
    const endLine = end + AETHER_UI_END.length;
    const afterEnd = source[endLine] === '\n' ? endLine + 1 : endLine;
    return `${source.slice(0, begin)}${block}${source.slice(afterEnd)}`;
  }

  return source;
}

function sanitizeIdentifier(value: string) {
  return value.replace(/[^a-zA-Z0-9_]/g, '');
}

export function generateCodePreview(components: UiComponent[]) {
  return `${components.length} UI components`;
}

export function extractUserCode(sourceCode: string): Record<string, string> {
  const userCode: Record<string, string> = {};
  const regex =
    /\/\/ --- USER CODE BEGIN: ([\w_]+) ---\n([\s\S]*?)\/\/ --- USER CODE END: \1 ---/g;
  let match;

  while ((match = regex.exec(sourceCode)) !== null) {
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

function buildSetupComponentsBlock(
  components: Array<UiComponent & { safeId: string }>
): string {
  if (components.length === 0) {
    return `    ${AETHER_UI_BEGIN}\n    ${AETHER_UI_END}`;
  }

  const body = components
    .map((component) => {
      return `    ${formatAetherComment(component)}
    ${component.safeId}.setBounds(${component.position.x}, ${component.position.y}, ${component.size.width}, ${component.size.height});
    if (auto* param = processor.getParameter("${component.id}")) {
        ${component.safeId}.setParameter(param);
    }
    ${component.safeId}.onValueChanged = [this](float val) {
        on${capitalize(component.safeId)}ValueChanged(val);
    };`;
    })
    .join('\n\n');

  return `    ${AETHER_UI_BEGIN}\n${body}\n    ${AETHER_UI_END}`;
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

  const setupComponents = buildSetupComponentsBlock(safeComponents);

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
