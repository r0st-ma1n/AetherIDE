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
  gap: 8px;
  padding: 12px 16px 0;
}

.tab-bar__tab {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  border: 1px solid #2f3541;
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  padding: 10px 14px;
  background-color: #181b21;
  color: #93a0b5;
  cursor: pointer;
}

.tab-bar__tab--active {
  background-color: #20252d;
  color: #f3f5f7;
}

.tab-bar__dirty {
  color: #ffb86c;
}

.tab-bar__close {
  color: #6e7b90;
}
</style>
