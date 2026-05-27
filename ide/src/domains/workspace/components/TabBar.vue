<template>
  <div class="tab-bar">
    <div
      v-for="tab in workspaceStore.tabs"
      :key="tab.id"
      class="tab"
      :class="{ 'tab--active': workspaceStore.activeTabId === tab.id }"
      @click="handleTabClick(tab.id)"
      @mousedown.middle="handleCloseClick($event, tab.id)"
    >
      <span class="tab__title" :title="tab.filePath">
        {{ basename(tab.filePath) }}
      </span>
      <span v-if="tab.isDirty" class="tab__dirty">●</span>
      <button
        class="tab__close"
        title="Close (Middle Click)"
        @click.stop="handleCloseClick($event, tab.id)"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';
import { basename } from '@/shared/lib/path';

const workspaceStore = useWorkspaceStore();

function handleTabClick(tabId: string) {
  workspaceStore.activeTabId = tabId;
}

function handleCloseClick(event: MouseEvent, tabId: string) {
  // Вызываем метод закрытия вкладки из стора
  if (workspaceStore.closeTab) {
    workspaceStore.closeTab(tabId);
  }
}
</script>

<style scoped>
.tab-bar {
  display: flex;
  background-color: #252526;
  overflow-x: auto;
  overflow-y: hidden;
  height: 35px;
  flex-shrink: 0;
}

.tab-bar::-webkit-scrollbar {
  height: 2px;
}

.tab-bar::-webkit-scrollbar-thumb {
  background: #464646;
}

.tab {
  display: flex;
  align-items: center;
  padding: 0 10px 0 14px;
  background-color: #2d2d2d;
  color: #969696;
  border-right: 1px solid #1e1e1e;
  cursor: pointer;
  min-width: 120px;
  max-width: 200px;
  user-select: none;
  position: relative;
}

.tab--active {
  background-color: #1e1e1e;
  color: #ffffff;
}

.tab--active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #007acc;
}

.tab__title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.tab__dirty {
  margin-left: 6px;
  font-size: 10px;
  color: #ffffff;
  line-height: 1;
}

.tab__close {
  margin-left: 6px;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  width: 20px;
  height: 20px;
}

.tab:hover .tab__close,
.tab--active .tab__close {
  opacity: 1;
}

.tab__close:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}
</style>
