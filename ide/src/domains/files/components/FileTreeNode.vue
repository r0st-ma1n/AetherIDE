<template>
  <div>
    <button
      class="tree-node"
      :class="node.isDirectory ? 'tree-node--dir' : 'tree-node--file'"
      @click="handleClick"
    >
      <span v-if="node.isDirectory">{{ isOpen ? '📂' : '📁' }}</span>
      <span v-else>📄</span>
      <span>{{ node.name }}</span>
    </button>

    <div v-if="node.isDirectory && isOpen" class="tree-node__children">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFileExplorerStore } from '@/domains/files/stores/fileExplorerStore';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';
import type { FileTreeNode as FileTreeNodeModel } from '@/shared/types';

const props = defineProps<{
  node: FileTreeNodeModel;
}>();

const workspaceStore = useWorkspaceStore();
const fileStore = useFileExplorerStore();

const isOpen = computed(() => fileStore.isDirectoryExpanded(props.node.path));

function handleClick() {
  if (props.node.isDirectory) {
    fileStore.toggleDirectory(props.node.path);
    return;
  }

  const entry = fileStore.flattenedEntryMap[props.node.path];

  if (entry) {
    workspaceStore.openTab(entry);
  }
}
</script>

<style scoped>
.tree-node {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
  border: none;
  background: transparent;
  color: #cccccc;
  cursor: pointer;
  padding: 4px 0;
  text-align: left;
  font-size: 13px;
}

.tree-node:hover {
  background-color: #2a2d2e;
}

.tree-node--dir {
  color: #dcb67a;
  font-weight: bold;
}

.tree-node--file {
  padding-left: 15px;
}

.tree-node__children {
  padding-left: 10px;
}
</style>
