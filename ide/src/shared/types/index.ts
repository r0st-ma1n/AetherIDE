export type WorkspaceTabKind = 'code' | 'designer';

export interface RecentProjectEntry {
  path: string;
  name: string;
  openedAt: number;
}

export interface WorkspaceTab {
  id: string;
  title: string;
  filePath: string;
  kind: WorkspaceTabKind;
  isDirty: boolean;
}

export interface ProjectFileEntry {
  name: string;
  path: string;
}

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  children: FileTreeNode[];
}

export type UiComponentType = 'Knob' | 'Slider' | 'Button';

export interface UiComponentParams {
  min: number;
  max: number;
  default: number;
  step?: number;
}

/**
 * Canonical in-memory UI component.
 * Designer, codegen, and document adapters all speak this shape.
 */
export interface UISpecComponent {
  id: string;
  type: UiComponentType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  params?: UiComponentParams;
  color?: string;
}

/**
 * @deprecated Use UISpecComponent. Kept as an alias during the P1 migration.
 */
export type UiComponent = UISpecComponent;

/**
 * Compile-time contract: every field of UISpecComponent must have a serializer.
 * Adding a field to UISpecComponent without updating the generator breaks TS compilation.
 */
export type CppSerializerMap = {
  readonly [K in keyof Required<UISpecComponent>]: (
    val: UISpecComponent[K],
    out: string[]
  ) => void;
};

/**
 * Compile-time contract: every field of UISpecComponent must have a deserializer.
 * Adding a field to UISpecComponent without updating the parser breaks TS compilation.
 */
export type CppDeserializerMap = {
  readonly [K in keyof Required<UISpecComponent>]: (
    attrs: Map<string, string>
  ) => UISpecComponent[K];
};

export interface UISpec {
  components: UISpecComponent[];
}

export type DesignerGridStep = 5 | 10 | 20;

/**
 * On-disk `.aether` component shape (flat geometry + opaque properties bag).
 * Convert via toAetherProject / fromAetherProject — do not use in designer state.
 */
export interface AetherProjectComponent {
  type: UiComponentType;
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties: Record<string, unknown>;
}

export interface AetherProject {
  version: number;
  components: AetherProjectComponent[];
  /** Designer canvas size in px; optional for older files. */
  canvasWidth?: number;
  canvasHeight?: number;
  /** Set by New Project wizard; optional for older files. */
  pluginType?: 'Effect' | 'Instrument';
}
