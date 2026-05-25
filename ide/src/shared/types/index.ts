export type WorkspaceTabKind = 'code' | 'designer';

export interface WorkspaceTab {
  id: string;
  title: string;
  filePath: string;
  kind: WorkspaceTabKind;
  isDirty: boolean;
}

export type UiComponentType = 'Knob' | 'Slider' | 'Button';

export interface UiComponent {
  id: string;
  type: UiComponentType;
  position: {
    x: number;
    y: number;
  };
}
