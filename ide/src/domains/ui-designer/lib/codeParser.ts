import type {
  UiComponent,
  UISpec,
  UISpecComponent,
  UiComponentType,
} from '@/shared/types';

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

const VALID_TYPES = new Set<UiComponentType>(['Knob', 'Slider', 'Button']);

function parseAttrs(attrStr: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of attrStr.trim().split(/\s+/)) {
    const eq = part.indexOf('=');
    if (eq > 0) map.set(part.slice(0, eq), part.slice(eq + 1));
  }
  return map;
}

export function parseUIFromCpp(src: string): UISpec {
  const components: UISpecComponent[] = [];

  for (const line of src.split('\n')) {
    const match = line.match(/\/\/\s*AETHER\s+(.+)/);
    if (!match) continue;

    const attrs = parseAttrs(match[1]);
    const id = attrs.get('id');
    const type = attrs.get('type') as UiComponentType;
    if (!id || !VALID_TYPES.has(type)) continue;

    const component: UISpecComponent = {
      id,
      type,
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
    if (minVal !== undefined && maxVal !== undefined && defVal !== undefined) {
      component.params = {
        min: Number(minVal),
        max: Number(maxVal),
        default: Number(defVal),
      };
    }

    if (attrs.get('color') !== undefined) {
      component.color = attrs.get('color');
    }

    components.push(component);
  }

  return { components };
}
