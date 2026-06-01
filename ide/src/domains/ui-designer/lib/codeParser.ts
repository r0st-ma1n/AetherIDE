import type {
  UiComponent,
  UISpec,
  UISpecComponent,
  UiComponentType,
  UiComponentParams,
  CppDeserializerMap,
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

const AETHER_DESERIALIZERS = {
  id: (attrs) => attrs.get('id') ?? '',
  type: (attrs) => (attrs.get('type') ?? '') as UiComponentType,
  position: (attrs) => ({
    x: Number(attrs.get('x') ?? 0),
    y: Number(attrs.get('y') ?? 0),
  }),
  size: (attrs) => ({
    width: Number(attrs.get('w') ?? 100),
    height: Number(attrs.get('h') ?? 40),
  }),
  params: (attrs): UiComponentParams | undefined => {
    const min = attrs.get('min');
    const max = attrs.get('max');
    const def = attrs.get('default');
    if (min === undefined || max === undefined || def === undefined)
      return undefined;
    const result: UiComponentParams = {
      min: Number(min),
      max: Number(max),
      default: Number(def),
    };
    const step = attrs.get('step');
    if (step !== undefined) result.step = Number(step);
    return result;
  },
  color: (attrs) => attrs.get('color'),
} satisfies CppDeserializerMap;

export function parseUIFromCpp(src: string): UISpec {
  const components: UISpecComponent[] = [];

  for (const line of src.split('\n')) {
    const match = line.match(/\/\/\s*AETHER\s+(.+)/);
    if (!match) continue;

    const attrs = parseAttrs(match[1]);
    const id = AETHER_DESERIALIZERS.id(attrs);
    const type = AETHER_DESERIALIZERS.type(attrs);
    if (!id || !VALID_TYPES.has(type)) continue;

    const component: UISpecComponent = {
      id,
      type,
      position: AETHER_DESERIALIZERS.position(attrs),
      size: AETHER_DESERIALIZERS.size(attrs),
    };

    const params = AETHER_DESERIALIZERS.params(attrs);
    if (params !== undefined) component.params = params;

    const color = AETHER_DESERIALIZERS.color(attrs);
    if (color !== undefined) component.color = color;

    components.push(component);
  }

  return { components };
}
