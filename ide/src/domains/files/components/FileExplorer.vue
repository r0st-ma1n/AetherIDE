<template>
  <section class="panel">
    <header class="panel__header">
      <span>Explorer</span>
      <span v-if="projectStore.projectName" class="panel__project">
        {{ projectStore.projectName }}
      </span>
    </header>

    <div
      v-if="!projectStore.isReady || fileStore.isLoading"
      class="panel__state"
    >
      Loading files...
    </div>
    <div v-else-if="fileStore.error" class="panel__state">
      {{ fileStore.error }}
    </div>
    <div v-else-if="!projectStore.hasProject" class="panel__state">
      No project open.
      <button class="panel__action" type="button" @click="openProject">
        Open Project…
      </button>
      <button class="panel__action" type="button" @click="emit('new-project')">
        New Project…
      </button>
      <div v-if="projectStore.recentProjects.length > 0" class="panel__recent">
        <div class="panel__recent-title">Recent</div>
        <button
          v-for="entry in projectStore.recentProjects"
          :key="entry.path"
          class="panel__recent-item"
          type="button"
          :title="entry.path"
          @click="openRecent(entry.path)"
        >
          {{ entry.name }}
        </button>
      </div>
    </div>
    <div v-else-if="fileStore.visibleNodes.length === 0" class="panel__state">
      Project is empty.
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useFileExplorerStore } from '@/domains/files/stores/fileExplorerStore';
import { useProjectStore } from '@/domains/workspace/stores/projectStore';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';
import type { FileTreeNode } from '@/shared/types';

const emit = defineEmits<{
  'new-project': [];
}>();

const ROW_HEIGHT = 26;
const INDENT_PX = 12;
const BASE_PADDING = 10;
const OVERSCAN = 5;

const fileStore = useFileExplorerStore();
const projectStore = useProjectStore();
const workspaceStore = useWorkspaceStore();

const scrollContainer = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const containerHeight = ref(400);
let removeRootListener: (() => void) | null = null;
let removeRecentListener: (() => void) | null = null;

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

async function reloadForRoot(nextRoot: string | null, resetTabs: boolean) {
  projectStore.applyRoot(nextRoot);

  if (!nextRoot) {
    fileStore.clearEntries();
    workspaceStore.clearTabs();
    return;
  }

  if (resetTabs) {
    workspaceStore.clearTabs();
  }

  await fileStore.loadEntries();
  workspaceStore.pruneMissingTabs(
    fileStore.entries.map((entry) => entry.filePath)
  );

  if (workspaceStore.tabs.length === 0) {
    workspaceStore.initializeTabs(fileStore.entries);
  }
}

async function openProject() {
  try {
    // Main process emits project:root-changed on success; the listener reloads.
    await projectStore.openProject();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to open project.';
    workspaceStore.showToast(message);
  }
}

async function openRecent(projectPath: string) {
  try {
    await projectStore.openRecent(projectPath);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to open recent project.';
    workspaceStore.showToast(message);
  }
}

const resizeObserver = new ResizeObserver((entries) => {
  containerHeight.value = entries[0]?.contentRect.height ?? 400;
});

watch(scrollContainer, (element, previous) => {
  if (previous) {
    resizeObserver.unobserve(previous);
  }
  if (element) {
    resizeObserver.observe(element);
  }
});

onMounted(async () => {
  await projectStore.syncFromMain();
  await reloadForRoot(projectStore.rootPath, false);

  removeRootListener = window.prototypeIDE.onProjectRootChanged(
    async (nextRoot) => {
      await reloadForRoot(nextRoot, true);
      await projectStore.syncRecentFromMain();
    }
  );

  removeRecentListener = window.prototypeIDE.onRecentProjectsChanged(
    (recent) => {
      projectStore.applyRecent(recent);
    }
  );
});

onBeforeUnmount(() => {
  if (scrollContainer.value) {
    resizeObserver.unobserve(scrollContainer.value);
  }
  resizeObserver.disconnect();
  removeRootListener?.();
  removeRecentListener?.();
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
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  padding: 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #888;
}

.panel__project {
  text-transform: none;
  letter-spacing: 0;
  color: #cccccc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel__virtual {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.panel__state {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  padding: 8px 10px;
  color: #888;
  font-size: 13px;
}

.panel__action {
  border: 1px solid #3a4150;
  background: #1c212b;
  color: #d7dde8;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
}

.panel__action:hover {
  background: #252b36;
}

.panel__recent {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #2c3340;
}

.panel__recent-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #777;
}

.panel__recent-item {
  width: 100%;
  border: none;
  background: transparent;
  color: #9fb0c9;
  text-align: left;
  padding: 2px 0;
  font-size: 12px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel__recent-item:hover {
  color: #d7dde8;
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
