import type { UiComponent, UISpec, UISpecComponent, UiComponentType } from '@/shared/types';

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

export function parseUIFromCpp(src: string): UISpec {
  const components: UISpecComponent[] = [];

  for (const line of src.split('\n')) {
    const match = line.match(/\/\/\s*AETHER\s+(.+)/);
    if (!match) continue;

    const attrs: Record<string, string> = {};
    for (const part of match[1].trim().split(/\s+/)) {
      const eq = part.indexOf('=');
      if (eq > 0) attrs[part.slice(0, eq)] = part.slice(eq + 1);
    }

    const id = attrs['id'];
    const type = attrs['type'] as UiComponentType;
    if (!id || !VALID_TYPES.has(type)) continue;

    const component: UISpecComponent = {
      id,
      type,
      position: { x: Number(attrs['x'] ?? 0), y: Number(attrs['y'] ?? 0) },
      size: { width: Number(attrs['w'] ?? 100), height: Number(attrs['h'] ?? 40) },
    };

    if (attrs['min'] !== undefined && attrs['max'] !== undefined && attrs['default'] !== undefined) {
      component.params = {
        min: Number(attrs['min']),
        max: Number(attrs['max']),
        default: Number(attrs['default']),
      };
    }

    if (attrs['color'] !== undefined) {
      component.color = attrs['color'];
    }

    components.push(component);
  }

  return { components };
}
