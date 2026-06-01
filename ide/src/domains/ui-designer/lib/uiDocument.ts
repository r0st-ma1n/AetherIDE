import type { UiComponent } from '@/shared/types';

export interface UiDocumentData {
  components: UiComponent[];
  canvasWidth: number;
  canvasHeight: number;
}

const DEFAULT_CANVAS_WIDTH = 600;
const DEFAULT_CANVAS_HEIGHT = 400;

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

export function parseUiDocument(source: string): UiDocumentData {
  const parsed = JSON.parse(source) as {
    components?: RawUiComponent[];
    canvasWidth?: number;
    canvasHeight?: number;
  };

  const components = (parsed.components ?? []).map((component) => ({
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

  return {
    components,
    canvasWidth: parsed.canvasWidth ?? DEFAULT_CANVAS_WIDTH,
    canvasHeight: parsed.canvasHeight ?? DEFAULT_CANVAS_HEIGHT,
  };
}

export function serializeUiDocument(
  components: UiComponent[],
  canvasWidth: number,
  canvasHeight: number
) {
  return JSON.stringify(
    {
      canvasWidth,
      canvasHeight,
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
