import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { parseUiDocument, serializeUiDocument } from '@/domains/ui-designer/lib/uiDocument';
import type { UiComponent, UiComponentType } from '@/shared/types';

const PALETTE = [
  { type: 'Knob' as UiComponentType, label: 'Dial / Knob' },
  { type: 'Slider' as UiComponentType, label: 'Fader / Slider' },
  { type: 'Button' as UiComponentType, label: 'Toggle Button' },
];

export const useUiDesignerStore = defineStore('ui-designer', () => {
  const components = ref<UiComponent[]>([]);
  const selectedComponentId = ref<string | null>(null);
  const draggingPaletteType = ref<UiComponentType | null>(null);

  const selectedComponent = computed(
    () => components.value.find((component) => component.id === selectedComponentId.value) ?? null,
  );

  async function loadDocument(filePath: string) {
    const source = await window.prototypeIDE.readFile(filePath);
    components.value = parseUiDocument(source);
    selectedComponentId.value = components.value[0]?.id ?? null;
  }

  async function saveDocument(filePath: string) {
    await window.prototypeIDE.writeFile(filePath, serializeUiDocument(components.value));
  }

  function addComponent(type: UiComponentType) {
    const next: UiComponent = {
      id: `${type.toLowerCase()}-${Date.now()}`,
      type,
      position: {
        x: 120 + components.value.length * 16,
        y: 80 + components.value.length * 16,
      },
    };

    components.value.push(next);
    selectedComponentId.value = next.id;
  }

  function selectComponent(componentId: string) {
    selectedComponentId.value = componentId;
  }

  function placeComponent(type: UiComponentType, position: UiComponent['position']) {
    const next: UiComponent = {
      id: `${type.toLowerCase()}-${Date.now()}`,
      type,
      position,
    };

    components.value.push(next);
    selectedComponentId.value = next.id;
  }

  function moveComponent(componentId: string, position: UiComponent['position']) {
    const component = components.value.find((item) => item.id === componentId);

    if (component) {
      component.position = position;
    }
  }

  function startPaletteDrag(type: UiComponentType) {
    draggingPaletteType.value = type;
  }

  function finishPaletteDrag() {
    draggingPaletteType.value = null;
  }

  return {
    components,
    draggingPaletteType,
    finishPaletteDrag,
    loadDocument,
    palette: PALETTE,
    placeComponent,
    moveComponent,
    saveDocument,
    selectedComponent,
    selectedComponentId,
    addComponent,
    selectComponent,
    startPaletteDrag,
  };
});
