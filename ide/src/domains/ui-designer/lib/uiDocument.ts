import type {
  AetherProject,
  AetherProjectMeta,
  UISpecComponent,
} from '@/shared/types';
import {
  aetherProjectToDocument,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  normalizeUiComponentParams,
  toAetherProject,
} from '@/shared/lib/uiModel';
import {
  defaultProjectMeta,
  pluginNameFromPath,
} from '@/shared/lib/projectMeta';
import {
  AetherMigrationError,
  migrateAetherProject,
} from '@/shared/schemas/migrateAetherProject';
import { validateAetherProject } from '@/shared/schemas/validateAetherProject';

export interface UiDocumentData {
  components: UISpecComponent[];
  canvasWidth: number;
  canvasHeight: number;
  /** `plugin` and `parameters`; the designer keeps them as-is on save. */
  meta: AetherProjectMeta;
}

interface RawUiComponent {
  id: string;
  type: UISpecComponent['type'];
  left?: string;
  top?: string;
  width?: string | number;
  height?: string | number;
  x?: number;
  y?: number;
  position?: {
    x: number;
    y: number;
  };
  size?: {
    width: number;
    height: number;
  };
  params?: Partial<NonNullable<UISpecComponent['params']>>;
  color?: string;
}

function parsePixels(value: string | number | undefined, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string' || !value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/** Legacy `.ui` JSON used before S2-T2. Kept for read compatibility. */
export function parseUiDocument(
  source: string,
  pluginName?: string
): UiDocumentData {
  const parsed = JSON.parse(source) as {
    components?: RawUiComponent[];
    canvasWidth?: number;
    canvasHeight?: number;
  };

  const components: UISpecComponent[] = (parsed.components ?? []).map(
    (component) => {
      const params = normalizeUiComponentParams(component.params);
      return {
        id: component.id,
        type: component.type,
        position: component.position ?? {
          x: component.x ?? parsePixels(component.left, 80),
          y: component.y ?? parsePixels(component.top, 80),
        },
        size: component.size ?? {
          width: parsePixels(component.width, 100),
          height: parsePixels(component.height, 40),
        },
        ...(params !== undefined ? { params } : {}),
        ...(component.color !== undefined ? { color: component.color } : {}),
      };
    }
  );

  return {
    components,
    canvasWidth: parsed.canvasWidth ?? DEFAULT_CANVAS_WIDTH,
    canvasHeight: parsed.canvasHeight ?? DEFAULT_CANVAS_HEIGHT,
    meta: defaultProjectMeta(pluginName),
  };
}

/** @deprecated Prefer serializeAetherDocument for new saves. */
export function serializeUiDocument(
  components: UISpecComponent[],
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

/** @param pluginName name for files migrated from schema v1 (no `plugin` section). */
export function parseAetherDocument(
  source: string,
  pluginName?: string
): UiDocumentData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error('Invalid .aether file: not valid JSON.');
  }

  let migrated: AetherProject;
  try {
    migrated = migrateAetherProject(parsed, { pluginName });
  } catch (error) {
    const message =
      error instanceof AetherMigrationError
        ? error.message
        : 'Failed to migrate .aether file.';
    throw new Error(message, { cause: error });
  }

  const result = validateAetherProject(migrated);
  if (!result.valid) {
    throw new Error(
      `Invalid .aether file: ${result.errors.join('; ') || 'schema validation failed.'}`
    );
  }

  return aetherProjectToDocument(migrated);
}

export function serializeAetherDocument(
  components: UISpecComponent[],
  canvasWidth: number,
  canvasHeight: number,
  meta: AetherProjectMeta
): string {
  const project = toAetherProject(components, meta, {
    width: canvasWidth,
    height: canvasHeight,
  });
  const result = validateAetherProject(project);
  if (!result.valid) {
    throw new Error(
      `Cannot save .aether file: ${result.errors.join('; ') || 'schema validation failed.'}`
    );
  }
  return JSON.stringify(project, null, 2);
}

export function parseDesignerDocument(
  source: string,
  filePath: string
): UiDocumentData {
  if (filePath.endsWith('.aether')) {
    return parseAetherDocument(source, pluginNameFromPath(filePath));
  }
  if (filePath.endsWith('.ui')) {
    return parseUiDocument(source, pluginNameFromPath(filePath));
  }
  throw new Error(
    `Unsupported designer document: ${filePath}. Expected .aether or legacy .ui.`
  );
}

export function serializeDesignerDocument(
  filePath: string,
  components: UISpecComponent[],
  canvasWidth: number,
  canvasHeight: number,
  meta: AetherProjectMeta
): string {
  if (filePath.endsWith('.aether')) {
    return serializeAetherDocument(components, canvasWidth, canvasHeight, meta);
  }
  if (filePath.endsWith('.ui')) {
    return serializeUiDocument(components, canvasWidth, canvasHeight);
  }
  throw new Error(
    `Unsupported designer document: ${filePath}. Expected .aether or legacy .ui.`
  );
}
