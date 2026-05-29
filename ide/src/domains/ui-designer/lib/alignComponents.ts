import type { UiComponent } from '@/shared/types';

export type AlignType =
  | 'left'
  | 'right'
  | 'center'
  | 'top'
  | 'bottom'
  | 'middle';

export type DistributeAxis = 'x' | 'y';

type Bounds = Pick<UiComponent, 'id' | 'position' | 'size'>;

export function alignComponents(
  components: Bounds[],
  type: AlignType
): Map<string, UiComponent['position']> {
  const result = new Map<string, UiComponent['position']>();
  if (components.length < 2) return result;

  const minX = Math.min(...components.map((c) => c.position.x));
  const maxX = Math.max(...components.map((c) => c.position.x + c.size.width));
  const minY = Math.min(...components.map((c) => c.position.y));
  const maxY = Math.max(...components.map((c) => c.position.y + c.size.height));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  for (const comp of components) {
    let x = comp.position.x;
    let y = comp.position.y;

    switch (type) {
      case 'left':
        x = minX;
        break;
      case 'right':
        x = maxX - comp.size.width;
        break;
      case 'center':
        x = Math.round(centerX - comp.size.width / 2);
        break;
      case 'top':
        y = minY;
        break;
      case 'bottom':
        y = maxY - comp.size.height;
        break;
      case 'middle':
        y = Math.round(centerY - comp.size.height / 2);
        break;
    }

    result.set(comp.id, { x, y });
  }

  return result;
}

export function distributeComponents(
  components: Bounds[],
  axis: DistributeAxis
): Map<string, UiComponent['position']> {
  const result = new Map<string, UiComponent['position']>();
  if (components.length < 3) return result;

  if (axis === 'x') {
    const sorted = [...components].sort((a, b) => a.position.x - b.position.x);
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const totalWidth = sorted.reduce((sum, c) => sum + c.size.width, 0);
    const span = last.position.x + last.size.width - first.position.x;
    const gap = (span - totalWidth) / (components.length - 1);

    let cursor = first.position.x;
    for (const comp of sorted) {
      result.set(comp.id, { x: Math.round(cursor), y: comp.position.y });
      cursor += comp.size.width + gap;
    }
  } else {
    const sorted = [...components].sort((a, b) => a.position.y - b.position.y);
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const totalHeight = sorted.reduce((sum, c) => sum + c.size.height, 0);
    const span = last.position.y + last.size.height - first.position.y;
    const gap = (span - totalHeight) / (components.length - 1);

    let cursor = first.position.y;
    for (const comp of sorted) {
      result.set(comp.id, { x: comp.position.x, y: Math.round(cursor) });
      cursor += comp.size.height + gap;
    }
  }

  return result;
}
