import type {
  AetherProject,
  AetherProjectComponent,
  UISpec,
  UISpecComponent,
  UiComponentParams,
} from '@/shared/types';
import { CURRENT_AETHER_SCHEMA_VERSION } from '@/shared/schemas/migrateAetherProject';

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Build a complete params object only when min/max/default are all present.
 */
export function normalizeUiComponentParams(
  params: Partial<UiComponentParams> | undefined
): UiComponentParams | undefined {
  if (!params) {
    return undefined;
  }

  const min = readNumber(params.min);
  const max = readNumber(params.max);
  const defaultValue = readNumber(params.default);

  if (min === undefined || max === undefined || defaultValue === undefined) {
    return undefined;
  }

  const step = readNumber(params.step);
  return {
    min,
    max,
    default: defaultValue,
    ...(step !== undefined ? { step } : {}),
  };
}

function toAetherProperties(
  component: UISpecComponent
): AetherProjectComponent['properties'] {
  return {
    ...(component.params !== undefined && {
      min: component.params.min,
      max: component.params.max,
      default: component.params.default,
      ...(component.params.step !== undefined && {
        step: component.params.step,
      }),
    }),
    ...(component.color !== undefined && { color: component.color }),
  };
}

function fromAetherComponent(
  component: AetherProjectComponent
): UISpecComponent {
  const params = normalizeUiComponentParams({
    min: readNumber(component.properties.min),
    max: readNumber(component.properties.max),
    default: readNumber(component.properties.default),
    step: readNumber(component.properties.step),
  });
  const color = readString(component.properties.color);

  return {
    id: component.id,
    type: component.type,
    position: { x: component.x, y: component.y },
    size: { width: component.width, height: component.height },
    ...(params !== undefined ? { params } : {}),
    ...(color !== undefined ? { color } : {}),
  };
}

export function toAetherProject(
  components: UISpecComponent[],
  version = CURRENT_AETHER_SCHEMA_VERSION,
  canvas?: { width: number; height: number }
): AetherProject {
  return {
    version,
    components: components.map(
      (component): AetherProjectComponent => ({
        type: component.type,
        id: component.id,
        x: component.position.x,
        y: component.position.y,
        width: component.size.width,
        height: component.size.height,
        properties: toAetherProperties(component),
      })
    ),
    ...(canvas !== undefined
      ? { canvasWidth: canvas.width, canvasHeight: canvas.height }
      : {}),
  };
}

export function fromAetherProject(project: AetherProject): UISpec {
  return {
    components: project.components.map(fromAetherComponent),
  };
}

export function toUISpec(components: UISpecComponent[]): UISpec {
  return { components };
}

export const DEFAULT_CANVAS_WIDTH = 600;
export const DEFAULT_CANVAS_HEIGHT = 400;

export function aetherProjectToDocument(project: AetherProject): {
  components: UISpecComponent[];
  canvasWidth: number;
  canvasHeight: number;
} {
  return {
    components: fromAetherProject(project).components,
    canvasWidth: project.canvasWidth ?? DEFAULT_CANVAS_WIDTH,
    canvasHeight: project.canvasHeight ?? DEFAULT_CANVAS_HEIGHT,
  };
}
