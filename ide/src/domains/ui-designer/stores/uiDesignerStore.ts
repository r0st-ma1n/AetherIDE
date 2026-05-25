import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { UiComponent, UiComponentType } from '@/shared/types';

const DEFAULT_COMPONENTS: UiComponent[] = [
  {
    id: 'knob-1',
    type: 'Knob',
    position: { x: 80, y: 80 },
  },
];

const PALETTE = [
  { type: 'Knob' as UiComponentType, label: 'Dial / Knob' },
  { type: 'Slider' as UiComponentType, label: 'Fader / Slider' },
  { type: 'Button' as UiComponentType, label: 'Toggle Button' },
];

export const useUiDesignerStore = defineStore('ui-designer', () => {
  const components = ref<UiComponent[]>(DEFAULT_COMPONENTS);
  const selectedComponentId = ref<string | null>(DEFAULT_COMPONENTS[0]?.id ?? null);

  const selectedComponent = computed(
    () => components.value.find((component) => component.id === selectedComponentId.value) ?? null,
  );

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

  return {
    components,
    palette: PALETTE,
    selectedComponent,
    selectedComponentId,
    addComponent,
    selectComponent,
  };
});
