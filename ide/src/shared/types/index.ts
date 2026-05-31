export type WorkspaceTabKind = 'code' | 'designer';

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

export interface UISpecComponent {
  id: string;
  type: UiComponentType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  params?: { min: number; max: number; default: number };
  color?: string;
}

export interface UISpec {
  components: UISpecComponent[];
}
export type DesignerGridStep = 5 | 10 | 20;

export interface UiComponentParams {
  min: number;
  max: number;
  default: number;
}

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
}

export interface UiComponent {
  id: string;
  type: UiComponentType;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  params?: Partial<UiComponentParams>;
  color?: string;
}
