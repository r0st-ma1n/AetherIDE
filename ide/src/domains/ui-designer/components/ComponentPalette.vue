<template>
  <section class="panel">
    <header class="panel__header">Palette</header>
    <div class="panel__body">
      <button
        v-for="component in designerStore.palette"
        :key="component.type"
        class="palette-item"
        @click="designerStore.addComponent(component.type)"
      >
        <strong>{{ component.label }}</strong>
        <span>{{ component.type }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useUiDesignerStore } from '@/domains/ui-designer/stores/uiDesignerStore';

const designerStore = useUiDesignerStore();
</script>

<style scoped>
.panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
}

.panel__header {
  padding: 16px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #8f9bb0;
}

.panel__body {
  display: grid;
  gap: 10px;
  padding: 0 12px 16px;
}

.palette-item {
  display: grid;
  gap: 4px;
  border: 1px solid #2e3541;
  border-radius: 14px;
  background: linear-gradient(180deg, #1f2430 0%, #181c24 100%);
  padding: 14px;
  color: #e8edf7;
  text-align: left;
  cursor: pointer;
}

.palette-item span {
  color: #8fa1bd;
  font-size: 12px;
}
</style>
