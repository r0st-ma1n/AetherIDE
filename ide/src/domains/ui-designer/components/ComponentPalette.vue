<template>
  <section class="panel">
    <header class="panel__header">Palette</header>
    <div class="panel__body">
      <div
        v-for="component in designerStore.palette"
        :key="component.type"
        class="palette-item"
        draggable="true"
        @dragstart="onDragStart($event, component.type)"
        @dragend="designerStore.finishPaletteDrag()"
        @click="designerStore.addComponent(component.type)"
      >
        <strong>{{ component.label }}</strong>
        <span>{{ component.type }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useUiDesignerStore } from '@/domains/ui-designer/stores/uiDesignerStore';
import type { UiComponentType } from '@/shared/types';

const designerStore = useUiDesignerStore();

function onDragStart(event: DragEvent, type: UiComponentType) {
  designerStore.startPaletteDrag(type);
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', type);
    event.dataTransfer.effectAllowed = 'copy';
  }
}
</script>

<style scoped>
.panel {
  padding: 10px;
  flex: 0 0 auto;
  max-height: 40%;
  overflow-y: auto;
}

.panel__header {
  margin: 0 0 10px;
  font-size: 11px;
  text-transform: uppercase;
  color: #888;
  letter-spacing: 0.8px;
}

.panel__body {
  display: block;
}

.palette-item {
  display: flex;
  width: 100%;
  gap: 8px;
  align-items: center;
  background-color: #2a2d2e;
  padding: 8px 12px;
  margin-bottom: 6px;
  border-radius: 4px;
  border: 1px solid #3c3c3c;
  color: #d4d4d4;
  text-align: left;
  cursor: pointer;
  font-size: 12px;
}

.palette-item::before {
  content: '▤';
  color: #808080;
}

.palette-item span {
  display: none;
}
</style>
