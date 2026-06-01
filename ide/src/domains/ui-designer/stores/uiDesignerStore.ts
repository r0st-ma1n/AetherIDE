import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  alignComponents,
  distributeComponents,
  type AlignType,
  type DistributeAxis,
} from '@/domains/ui-designer/lib/alignComponents';
import {
  parseUiDocument,
  serializeUiDocument,
} from '@/domains/ui-designer/lib/uiDocument';

import type {
  DesignerGridStep,
  UiComponent,
  UiComponentParams,
  UiComponentType,
} from '@/shared/types';

const PALETTE = [
  { type: 'Knob' as UiComponentType, label: 'Dial / Knob' },
  { type: 'Slider' as UiComponentType, label: 'Fader / Slider' },
  { type: 'Button' as UiComponentType, label: 'Toggle Button' },
];

const GRID_STEPS: DesignerGridStep[] = [5, 10, 20];
const DEFAULT_COMPONENT_SIZE = {
  width: 100,
  height: 40,
};

export const useUiDesignerStore = defineStore('ui-designer', () => {
  const currentDocumentPath = ref<string | null>(null);
  const components = ref<UiComponent[]>([]);
  const selectedComponentId = ref<string | null>(null);
  const selectionGroup = ref<string[]>([]);
  const draggingPaletteType = ref<UiComponentType | null>(null);
  const gridStep = ref<DesignerGridStep>(10);
  const snapToGridEnabled = ref(true);
  const canvasWidth = ref(600);
  const canvasHeight = ref(400);

  const selectedComponent = computed(
    () =>
      components.value.find(
        (component) => component.id === selectedComponentId.value
      ) ?? null
  );

  async function loadDocument(filePath: string) {
    const source = await window.prototypeIDE.readFile(filePath);
    currentDocumentPath.value = filePath;
    const doc = parseUiDocument(source);
    components.value = doc.components;
    canvasWidth.value = doc.canvasWidth;
    canvasHeight.value = doc.canvasHeight;
    selectedComponentId.value = doc.components[0]?.id ?? null;
  }

  async function saveDocument(filePath: string) {
    currentDocumentPath.value = filePath;
    await window.prototypeIDE.writeFile(
      filePath,
      serializeUiDocument(
        components.value,
        canvasWidth.value,
        canvasHeight.value
      )
    );
  }

  function setCanvasSize(w: number, h: number) {
    canvasWidth.value = Math.max(100, Math.min(w, 2000));
    canvasHeight.value = Math.max(100, Math.min(h, 2000));
  }

  function addComponent(type: UiComponentType) {
    const next: UiComponent = {
      id: `${type.toLowerCase()}-${Date.now()}`,
      type,
      position: {
        x: 120 + components.value.length * 16,
        y: 80 + components.value.length * 16,
      },
      size: { ...DEFAULT_COMPONENT_SIZE },
    };

    components.value.push(next);
    selectedComponentId.value = next.id;
  }

  function selectComponent(componentId: string) {
    selectedComponentId.value = componentId;
    selectionGroup.value = [];
  }

  function clearSelection() {
    selectedComponentId.value = null;
    selectionGroup.value = [];
  }

  function toggleGroupSelection(componentId: string) {
    let baseGroup = [...selectionGroup.value];

    // Bootstrap: if no group yet, seed it with the currently active component
    if (baseGroup.length === 0 && selectedComponentId.value !== null) {
      baseGroup = [selectedComponentId.value];
    }

    const idx = baseGroup.indexOf(componentId);
    selectionGroup.value =
      idx === -1
        ? [...baseGroup, componentId]
        : baseGroup.filter((id) => id !== componentId);

    selectedComponentId.value = componentId;
  }

  function alignGroup(type: AlignType) {
    const targets = components.value.filter((c) =>
      selectionGroup.value.includes(c.id)
    );
    const positions = alignComponents(targets, type);
    for (const [id, position] of positions) {
      const comp = components.value.find((c) => c.id === id);
      if (comp) comp.position = position;
    }
  }

  function distributeGroup(axis: DistributeAxis) {
    const targets = components.value.filter((c) =>
      selectionGroup.value.includes(c.id)
    );
    const positions = distributeComponents(targets, axis);
    for (const [id, position] of positions) {
      const comp = components.value.find((c) => c.id === id);
      if (comp) comp.position = position;
    }
  }

  function placeComponent(
    type: UiComponentType,
    position: UiComponent['position']
  ) {
    const next: UiComponent = {
      id: `${type.toLowerCase()}-${Date.now()}`,
      type,
      position,
      size: { ...DEFAULT_COMPONENT_SIZE },
    };

    components.value.push(next);
    selectedComponentId.value = next.id;
  }

  function moveComponent(
    componentId: string,
    position: UiComponent['position']
  ) {
    const component = components.value.find((item) => item.id === componentId);

    if (component) {
      component.position = position;
    }
  }

  function resizeComponent(
    componentId: string,
    bounds: Pick<UiComponent, 'position' | 'size'>
  ) {
    const component = components.value.find((item) => item.id === componentId);

    if (component) {
      component.position = bounds.position;
      component.size = bounds.size;
    }
  }

  function startPaletteDrag(type: UiComponentType) {
    draggingPaletteType.value = type;
  }

  function finishPaletteDrag() {
    draggingPaletteType.value = null;
  }

  function setGridStep(step: DesignerGridStep) {
    gridStep.value = step;
  }

  function setSnapToGridEnabled(enabled: boolean) {
    snapToGridEnabled.value = enabled;
  }

  function updateComponentType(componentId: string, type: UiComponentType) {
    const component = components.value.find((item) => item.id === componentId);
    if (component) {
      component.type = type;
    }
  }

  function updateComponentParams(
    componentId: string,
    params: Partial<UiComponentParams>
  ) {
    const component = components.value.find((item) => item.id === componentId);
    if (component) {
      component.params = { ...component.params, ...params };
    }
  }

  function updateComponentColor(componentId: string, color: string) {
    const component = components.value.find((item) => item.id === componentId);
    if (component) {
      component.color = color;
    }
  }

  return {
    alignGroup,
    components,
    currentDocumentPath,
    distributeGroup,
    gridStep,
    gridSteps: GRID_STEPS,
    draggingPaletteType,
    finishPaletteDrag,
    loadDocument,
    palette: PALETTE,
    placeComponent,
    moveComponent,
    resizeComponent,
    saveDocument,
    selectedComponent,
    selectedComponentId,
    selectionGroup,
    clearSelection,
    canvasWidth,
    canvasHeight,
    setCanvasSize,
    setGridStep,
    setSnapToGridEnabled,
    snapToGridEnabled,
    addComponent,
    selectComponent,
    toggleGroupSelection,
    startPaletteDrag,
    updateComponentType,
    updateComponentParams,
    updateComponentColor,
  };
});
