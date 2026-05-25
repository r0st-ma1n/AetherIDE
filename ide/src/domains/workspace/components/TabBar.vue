<template>
  <header class="tab-bar">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="tab-bar__tab"
      :class="{ 'tab-bar__tab--active': tab.id === activeTabId }"
      @click="$emit('activate', tab.id)"
    >
      <span>{{ tab.title }}</span>
      <span v-if="tab.isDirty" class="tab-bar__dirty">*</span>
      <span class="tab-bar__close" @click.stop="$emit('close', tab.id)">x</span>
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
  display: flex;
  background-color: #2d2d2d;
  border-bottom: 1px solid #1e1e1e;
  flex-shrink: 0;
}

.tab-bar__tab {
  display: flex;
  gap: 8px;
  align-items: center;
  border: none;
  padding: 10px 15px;
  background: none;
  color: #969696;
  cursor: pointer;
  font-size: 13px;
  border-top: 2px solid transparent;
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
  color: #969696;
}
</style>
