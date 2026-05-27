import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  parseUiDocument,
  serializeUiDocument,
} from '@/domains/ui-designer/lib/uiDocument';
import type {
  DesignerGridStep,
  UiComponent,
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
  const draggingPaletteType = ref<UiComponentType | null>(null);
  const gridStep = ref<DesignerGridStep>(10);
  const snapToGridEnabled = ref(true);

  const selectedComponent = computed(
    () =>
      components.value.find(
        (component) => component.id === selectedComponentId.value
      ) ?? null
  );

  async function loadDocument(filePath: string) {
    const source = await window.prototypeIDE.readFile(filePath);
    currentDocumentPath.value = filePath;
    components.value = parseUiDocument(source);
    selectedComponentId.value = components.value[0]?.id ?? null;
  }

  async function saveDocument(filePath: string) {
    currentDocumentPath.value = filePath;
    await window.prototypeIDE.writeFile(
      filePath,
      serializeUiDocument(components.value)
    );
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
  }

  function clearSelection() {
    selectedComponentId.value = null;
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

  return {
    components,
    currentDocumentPath,
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
    clearSelection,
    setGridStep,
    setSnapToGridEnabled,
    snapToGridEnabled,
    addComponent,
    selectComponent,
    startPaletteDrag,
  };
});
