import type { UiComponent } from '@/shared/types';

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

    const boundsMatch = line.match(/\.setBounds\(\s*(\d+)\s*,\s*(\d+)/);

    if (boundsMatch && currentId && currentType) {
      components.push({
        id: currentId,
        type: currentType,
        position: {
          x: Number.parseInt(boundsMatch[1] ?? '0', 10),
          y: Number.parseInt(boundsMatch[2] ?? '0', 10),
        },
      });
      currentId = null;
      currentType = null;
    }
  }

  return components;
}
