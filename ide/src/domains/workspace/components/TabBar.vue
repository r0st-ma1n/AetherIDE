<template>
  <div class="tab-bar">
    <div
      v-for="tab in workspaceStore.tabs"
      :key="tab.id"
      class="tab"
      :class="{
        'tab--active': workspaceStore.activeTabId === tab.id,
        'tab--drag-over': dragOverTabId === tab.id,
      }"
      draggable="true"
      @click="workspaceStore.setActiveTab(tab.id)"
      @mousedown.middle.prevent="void requestCloseTab(tab.id)"
      @dragstart="onDragStart($event, tab.id)"
      @dragover.prevent="dragOverTabId = tab.id"
      @dragleave="dragOverTabId = null"
      @drop.prevent="onDrop(tab.id)"
      @dragend="onDragEnd"
    >
      <span class="tab__title" :title="tab.filePath">
        {{ basename(tab.filePath) }}
      </span>
      <span v-if="tab.isDirty" class="tab__dirty">●</span>
      <button
        class="tab__close"
        title="Close (Ctrl+W / Middle click)"
        @click.stop="void requestCloseTab(tab.id)"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { requestCloseTab } from '@/domains/workspace/lib/unsavedGuard';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';
import { basename } from '@/shared/lib/path';

const workspaceStore = useWorkspaceStore();

const draggingTabId = ref<string | null>(null);
const dragOverTabId = ref<string | null>(null);

function onDragStart(event: DragEvent, tabId: string) {
  draggingTabId.value = tabId;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', tabId);
  }
}

function onDrop(targetTabId: string) {
  const sourceId = draggingTabId.value;
  if (sourceId && sourceId !== targetTabId) {
    workspaceStore.moveTab(sourceId, targetTabId);
  }
  dragOverTabId.value = null;
}

function onDragEnd() {
  draggingTabId.value = null;
  dragOverTabId.value = null;
}

function onKeyDown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'w') {
    event.preventDefault();
    const activeId = workspaceStore.activeTabId;
    if (activeId) {
      void requestCloseTab(activeId);
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
});
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

.tab--drag-over {
  background-color: #37373d;
  outline: 1px solid #007acc;
  outline-offset: -1px;
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
