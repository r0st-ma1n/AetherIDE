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
        <span>X</span>
        <strong>{{ selectedComponent.position.x }}</strong>
      </div>
      <div class="property-row">
        <span>Y</span>
        <strong>{{ selectedComponent.position.y }}</strong>
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
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 100vh;
}

.panel__header {
  padding: 16px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #8f9bb0;
  border-bottom: 1px solid #2c3340;
}

.panel__body,
.panel__empty {
  padding: 16px;
}

.property-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #273040;
  color: #d6deea;
}

.panel__empty {
  color: #74829a;
}
</style>
