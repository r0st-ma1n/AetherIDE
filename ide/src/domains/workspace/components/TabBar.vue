<template>
  <header class="tab-bar">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="tab-bar__tab"
      :class="{ 'tab-bar__tab--active': tab.id === activeTabId }"
      @click="$emit('activate', tab.id)"
    >
      <span class="tab-bar__title">{{ tab.title }}</span>
      <span v-if="tab.isDirty" class="tab-bar__dirty">*</span>
      <span
        class="tab-bar__close"
        title="Close tab"
        @click.stop="$emit('close', tab.id)"
      >
        x
      </span>
    </button>
  </header>
</template>

<script setup lang="ts">
import type { WorkspaceTab } from '@/shared/types';

defineProps<{
  tabs: WorkspaceTab[];
  activeTabId: string | null;
}>();

defineEmits<{
  activate: [tabId: string];
  close: [tabId: string];
}>();
</script>

<style scoped>
.tab-bar {
  position: relative;
  z-index: 4000;
  display: flex;
  background-color: #2d2d2d;
  border-bottom: 1px solid #1e1e1e;
  flex-shrink: 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.tab-bar__tab {
  position: relative;
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 0 0 auto;
  border: none;
  padding: 10px 15px;
  background: none;
  color: #969696;
  cursor: pointer;
  font-size: 13px;
  border-top: 2px solid transparent;
}

.tab-bar__title {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-bar__tab--active {
  color: #ffffff;
  background-color: #1e1e1e;
  border-top-color: #007acc;
}

.tab-bar__dirty {
  color: #ffb86c;
}

.tab-bar__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  color: #969696;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.tab-bar__close:hover {
  background-color: #3a3d41;
  color: #ffffff;
}
</style>
