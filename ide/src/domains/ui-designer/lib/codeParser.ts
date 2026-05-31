import type { UiComponent, UiComponentType, UISpec } from '@/shared/types';

const AETHER_LINE_RE = /^\/\/ @aether (.+)$/;
const VALID_TYPES = new Set<string>(['Knob', 'Slider', 'Button']);

function parseAttrs(attrStr: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrStr)) !== null) map.set(m[1], m[2]);
  return map;
}

export function parseUIFromCpp(src: string): UISpec {
  const components: UiComponent[] = [];
  for (const rawLine of src.split('\n')) {
    const match = rawLine.trim().match(AETHER_LINE_RE);
    if (!match) continue;
    const attrs = parseAttrs(match[1]);
    const id = attrs.get('id');
    const type = attrs.get('type');
    if (!id || !type || !VALID_TYPES.has(type)) continue;
    const comp: UiComponent = {
      id,
      type: type as UiComponentType,
      position: {
        x: Number(attrs.get('x') ?? 0),
        y: Number(attrs.get('y') ?? 0),
      },
      size: {
        width: Number(attrs.get('w') ?? 100),
        height: Number(attrs.get('h') ?? 40),
      },
    };
    const minVal = attrs.get('min');
    const maxVal = attrs.get('max');
    const defVal = attrs.get('default');
    if (minVal !== undefined || maxVal !== undefined || defVal !== undefined) {
      comp.params = {};
      if (minVal !== undefined) comp.params.min = Number(minVal);
      if (maxVal !== undefined) comp.params.max = Number(maxVal);
      if (defVal !== undefined) comp.params.default = Number(defVal);
    }
    const color = attrs.get('color');
    if (color !== undefined) comp.color = color;
    components.push(comp);
  }
  return { components };
}

export function parseGeneratedCode(source: string): UiComponent[] {
  const components: UiComponent[] = [];
  const lines = source.split('\n');
  let currentId: string | null = null;
  let currentType: UiComponent['type'] | null = null;

  for (const line of lines) {
    const commentMatch = line.match(
      /\/\/\s*COMPONENT:\s*(.*?)\s*\|\s*TYPE:\s*(Knob|Slider|Button)/
    );

    if (commentMatch) {
      currentId = commentMatch[1] ?? null;
      currentType = (commentMatch[2] as UiComponent['type']) ?? null;
      continue;
    }

    const boundsMatch = line.match(
      /\.setBounds\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/
    );

    if (boundsMatch && currentId && currentType) {
      components.push({
        id: currentId,
        type: currentType,
        position: {
          x: Number.parseInt(boundsMatch[1] ?? '0', 10),
          y: Number.parseInt(boundsMatch[2] ?? '0', 10),
        },
        size: {
          width: Number.parseInt(boundsMatch[3] ?? '100', 10),
          height: Number.parseInt(boundsMatch[4] ?? '40', 10),
        },
      });
      currentId = null;
      currentType = null;
    }
  }

  return components;
}
