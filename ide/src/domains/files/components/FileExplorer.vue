<template>
  <section class="panel">
    <header class="panel__header">Explorer</header>

    <div v-if="fileStore.isLoading" class="panel__state">Loading files...</div>
    <div v-else-if="fileStore.error" class="panel__state">
      {{ fileStore.error }}
    </div>

    <div v-else ref="scrollContainer" class="panel__virtual" @scroll="onScroll">
      <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
        <button
          v-for="(item, i) in visibleSlice"
          :key="item.node.id"
          class="tree-node"
          :class="item.node.isDirectory ? 'tree-node--dir' : 'tree-node--file'"
          :style="{
            position: 'absolute',
            top: `${(startIndex + i) * ROW_HEIGHT}px`,
            paddingLeft: `${item.depth * INDENT_PX + BASE_PADDING}px`,
          }"
          @click="handleClick(item.node)"
        >
          <span v-if="item.node.isDirectory" class="tree-node__icon">
            {{ fileStore.isDirectoryExpanded(item.node.path) ? '▾' : '▸' }}
          </span>
          <span v-else class="tree-node__icon tree-node__icon--file">·</span>
          <span>{{ item.node.name }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useFileExplorerStore } from '@/domains/files/stores/fileExplorerStore';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';
import type { FileTreeNode } from '@/shared/types';

const ROW_HEIGHT = 26;
const INDENT_PX = 12;
const BASE_PADDING = 10;
const OVERSCAN = 5;

const fileStore = useFileExplorerStore();
const workspaceStore = useWorkspaceStore();

const scrollContainer = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const containerHeight = ref(400);

const visibleNodes = computed(() => fileStore.visibleNodes);
const totalHeight = computed(() => visibleNodes.value.length * ROW_HEIGHT);

const startIndex = computed(() =>
  Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - OVERSCAN)
);
const endIndex = computed(() =>
  Math.min(
    visibleNodes.value.length,
    Math.ceil((scrollTop.value + containerHeight.value) / ROW_HEIGHT) + OVERSCAN
  )
);
const visibleSlice = computed(() =>
  visibleNodes.value.slice(startIndex.value, endIndex.value)
);

function onScroll() {
  scrollTop.value = scrollContainer.value?.scrollTop ?? 0;
}

function handleClick(node: FileTreeNode) {
  if (node.isDirectory) {
    fileStore.toggleDirectory(node.path);
    return;
  }
  const entry = fileStore.flattenedEntryMap[node.path];
  if (entry) {
    workspaceStore.openTab(entry);
  }
}

const resizeObserver = new ResizeObserver((entries) => {
  containerHeight.value = entries[0]?.contentRect.height ?? 400;
});

onMounted(async () => {
  await fileStore.loadEntries();
  workspaceStore.initializeTabs(fileStore.entries);
  if (scrollContainer.value) {
    resizeObserver.observe(scrollContainer.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver.disconnect();
});
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  border-bottom: 1px solid #2c3340;
  overflow: hidden;
}

.panel__header {
  flex-shrink: 0;
  margin: 0;
  padding: 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #888;
}

.panel__virtual {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.panel__state {
  padding: 8px 10px;
  color: #888;
  font-size: 13px;
}

.tree-node {
  display: flex;
  gap: 5px;
  align-items: center;
  width: 100%;
  height: 26px;
  border: none;
  background: transparent;
  color: #cccccc;
  cursor: pointer;
  text-align: left;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-sizing: border-box;
}

.tree-node:hover {
  background-color: #2a2d2e;
}

.tree-node--dir {
  color: #dcb67a;
  font-weight: 600;
}

.tree-node__icon {
  flex-shrink: 0;
  width: 12px;
  font-size: 10px;
  color: #888;
}

.tree-node__icon--file {
  color: #555;
}
</style>
