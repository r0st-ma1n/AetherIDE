import type { UiComponent } from '@/shared/types';

interface RawUiComponent {
  id: string;
  type: UiComponent['type'];
  left?: string;
  top?: string;
  width?: string;
  height?: string;
  position?: {
    x: number;
    y: number;
  };
  size?: {
    width: number;
    height: number;
  };
  params?: UiComponent['params'];
  color?: string;
}

function parsePixels(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function parseUiDocument(source: string): UiComponent[] {
  const parsed = JSON.parse(source) as { components?: RawUiComponent[] };

  return (parsed.components ?? []).map((component) => ({
    id: component.id,
    type: component.type,
    position: component.position ?? {
      x: parsePixels(component.left, 80),
      y: parsePixels(component.top, 80),
    },
    size: component.size ?? {
      width: parsePixels(component.width, 100),
      height: parsePixels(component.height, 40),
    },
    ...(component.params !== undefined ? { params: component.params } : {}),
    ...(component.color !== undefined ? { color: component.color } : {}),
  }));
}

export function serializeUiDocument(components: UiComponent[]) {
  return JSON.stringify(
    {
      components: components.map((component) => ({
        id: component.id,
        type: component.type,
        left: `${component.position.x}px`,
        top: `${component.position.y}px`,
        width: `${component.size.width}px`,
        height: `${component.size.height}px`,
        ...(component.params !== undefined ? { params: component.params } : {}),
        ...(component.color !== undefined ? { color: component.color } : {}),
      })),
    },
    null,
    2
  );
}
