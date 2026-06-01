<template>
  <section class="panel">
    <header class="panel__header">Inspector</header>
    <div class="panel__body" v-if="selectedComponent">
      <div class="property-group">
        <div class="group-title">Component</div>
        <div class="property-row">
          <span class="property-label">Type</span>
          <select
            class="property-select"
            :value="selectedComponent.type"
            @change="onTypeChange"
          >
            <option
              v-for="item in store.palette"
              :key="item.type"
              :value="item.type"
            >
              {{ item.label }}
            </option>
          </select>
        </div>
        <div class="property-row property-row--muted">
          <span class="property-label">ID</span>
          <span class="property-value--id">{{ selectedComponent.id }}</span>
        </div>
      </div>

      <div class="property-group">
        <div class="group-title">Layout</div>
        <div class="property-row">
          <span class="property-label">X</span>
          <input
            class="property-input"
            type="number"
            step="1"
            :value="selectedComponent.position.x"
            @change="onPositionChange('x', $event)"
          />
        </div>
        <div class="property-row">
          <span class="property-label">Y</span>
          <input
            class="property-input"
            type="number"
            step="1"
            :value="selectedComponent.position.y"
            @change="onPositionChange('y', $event)"
          />
        </div>
        <div class="property-row">
          <span class="property-label">W</span>
          <input
            class="property-input"
            type="number"
            step="1"
            min="1"
            :value="selectedComponent.size.width"
            @change="onSizeChange('width', $event)"
          />
        </div>
        <div class="property-row">
          <span class="property-label">H</span>
          <input
            class="property-input"
            type="number"
            step="1"
            min="1"
            :value="selectedComponent.size.height"
            @change="onSizeChange('height', $event)"
          />
        </div>
      </div>

      <div class="property-group" v-if="hasParams">
        <div class="group-title">Parameters</div>
        <div class="property-row">
          <span class="property-label">Min</span>
          <input
            class="property-input"
            type="number"
            step="1"
            :value="selectedComponent.params?.min ?? 0"
            @change="onParamChange('min', $event)"
          />
        </div>
        <div class="property-row">
          <span class="property-label">Max</span>
          <input
            class="property-input"
            type="number"
            step="1"
            :value="selectedComponent.params?.max ?? 100"
            @change="onParamChange('max', $event)"
          />
        </div>
        <div class="property-row">
          <span class="property-label">Default</span>
          <input
            class="property-input"
            type="number"
            step="1"
            :value="selectedComponent.params?.default ?? 50"
            @change="onParamChange('default', $event)"
          />
        </div>
        <div class="property-row">
          <span class="property-label">Step</span>
          <input
            class="property-input"
            type="number"
            step="0.01"
            min="0"
            :value="selectedComponent.params?.step ?? 0"
            @change="onParamChange('step', $event)"
          />
        </div>
      </div>

      <div class="property-group">
        <div class="group-title">Style</div>
        <div class="property-row">
          <span class="property-label">Color</span>
          <div class="color-row">
            <input
              class="property-color"
              type="color"
              :value="selectedComponent.color ?? '#4a9eff'"
              @input="onColorChange"
            />
            <span class="color-value">{{
              selectedComponent.color ?? '#4a9eff'
            }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="panel__empty">Select a component in the designer.</div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useUiDesignerStore } from '@/domains/ui-designer/stores/uiDesignerStore';
import type { UiComponentType } from '@/shared/types';

const store = useUiDesignerStore();
const { selectedComponent } = storeToRefs(store);

const hasParams = computed(
  () =>
    selectedComponent.value?.type === 'Knob' ||
    selectedComponent.value?.type === 'Slider'
);

function onTypeChange(event: Event) {
  const type = (event.target as HTMLSelectElement).value as UiComponentType;
  if (selectedComponent.value) {
    store.updateComponentType(selectedComponent.value.id, type);
  }
}

function onPositionChange(axis: 'x' | 'y', event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  if (selectedComponent.value) {
    store.moveComponent(selectedComponent.value.id, {
      ...selectedComponent.value.position,
      [axis]: value,
    });
  }
}

function onSizeChange(dim: 'width' | 'height', event: Event) {
  const value = Math.max(1, Number((event.target as HTMLInputElement).value));
  if (selectedComponent.value) {
    store.resizeComponent(selectedComponent.value.id, {
      position: selectedComponent.value.position,
      size: { ...selectedComponent.value.size, [dim]: value },
    });
  }
}

function onParamChange(
  param: 'min' | 'max' | 'default' | 'step',
  event: Event
) {
  const value = Number((event.target as HTMLInputElement).value);
  if (selectedComponent.value) {
    store.updateComponentParams(selectedComponent.value.id, { [param]: value });
  }
}

function onColorChange(event: Event) {
  const color = (event.target as HTMLInputElement).value;
  if (selectedComponent.value) {
    store.updateComponentColor(selectedComponent.value.id, color);
  }
}
</script>

<style scoped>
.panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow-y: auto;
}

.panel__header {
  padding: 10px;
  font-size: 11px;
  text-transform: uppercase;
  color: #888;
  letter-spacing: 0.8px;
  border-bottom: 1px solid #2d2d2d;
  flex-shrink: 0;
}

.panel__body {
  padding: 8px 0;
  flex: 1;
}

.property-group {
  padding: 0 0 4px;
  border-bottom: 1px solid #2d2d2d;
  margin-bottom: 4px;
}

.property-group:last-child {
  border-bottom: none;
}

.group-title {
  padding: 4px 10px 6px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #666;
}

.property-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 10px;
  color: #cccccc;
  min-height: 26px;
}

.property-row--muted {
  opacity: 0.5;
}

.property-label {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
  min-width: 52px;
}

.property-value--id {
  font-size: 11px;
  color: #aaa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
  text-align: right;
}

.property-input {
  width: 80px;
  background: #1a1a1a;
  border: 1px solid #3a3a3a;
  border-radius: 3px;
  color: #e0e0e0;
  font-size: 12px;
  padding: 3px 6px;
  text-align: right;
  outline: none;
  transition: border-color 0.15s;
}

.property-input:focus {
  border-color: #4a9eff;
}

.property-input::-webkit-inner-spin-button,
.property-input::-webkit-outer-spin-button {
  opacity: 0.4;
}

.property-select {
  width: 140px;
  background: #1a1a1a;
  border: 1px solid #3a3a3a;
  border-radius: 3px;
  color: #e0e0e0;
  font-size: 12px;
  padding: 3px 6px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;
}

.property-select:focus {
  border-color: #4a9eff;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.property-color {
  width: 28px;
  height: 22px;
  border: 1px solid #3a3a3a;
  border-radius: 3px;
  background: none;
  padding: 1px;
  cursor: pointer;
  outline: none;
}

.property-color:focus {
  border-color: #4a9eff;
}

.color-value {
  font-size: 11px;
  color: #aaa;
  font-family: monospace;
}

.panel__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: rgba(204, 204, 204, 0.5);
  font-size: 12px;
  padding: 10px;
}
</style>
