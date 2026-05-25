<template>
  <section class="panel">
    <header class="panel__header">Inspector</header>
    <div class="panel__body" v-if="selectedComponent">
      <div class="property-row">
        <span>ID</span>
        <strong>{{ selectedComponent.id }}</strong>
      </div>
      <div class="property-row">
        <span>Type</span>
        <strong>{{ selectedComponent.type }}</strong>
      </div>
      <div class="property-row">
        <span>Left</span>
        <strong>{{ selectedComponent.position.x }}px</strong>
      </div>
      <div class="property-row">
        <span>Top</span>
        <strong>{{ selectedComponent.position.y }}px</strong>
      </div>
    </div>
    <div v-else class="panel__empty">Select a component in the designer.</div>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useUiDesignerStore } from '@/domains/ui-designer/stores/uiDesignerStore';

const designerStore = useUiDesignerStore();
const { selectedComponent } = storeToRefs(designerStore);
</script>

<style scoped>
.panel {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.panel__header {
  padding: 10px;
  font-size: 11px;
  text-transform: uppercase;
  color: #888;
  letter-spacing: 0.8px;
  border-bottom: 1px solid #2d2d2d;
}

.panel__body,
.panel__empty {
  padding: 10px;
  flex: 1;
}

.property-row {
  display: flex;
  justify-content: space-between;
  padding: 0 0 10px;
  color: #cccccc;
}

.panel__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(204, 204, 204, 0.5);
  font-size: 12px;
}
</style>
