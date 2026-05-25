<template>
  <section class="panel">
    <header class="panel__header">Explorer</header>
    <div class="panel__body">
      <div v-if="fileStore.isLoading" class="panel__state">
        Loading files...
      </div>
      <div v-else-if="fileStore.error" class="panel__state">
        {{ fileStore.error }}
      </div>
      <FileTreeNode
        v-else
        v-for="node in fileStore.tree"
        :key="node.id"
        :node="node"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useFileExplorerStore } from '@/domains/files/stores/fileExplorerStore';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';
import FileTreeNode from './FileTreeNode.vue';

const fileStore = useFileExplorerStore();
const workspaceStore = useWorkspaceStore();

onMounted(() => {
  void (async () => {
    await fileStore.loadEntries();
    workspaceStore.initializeTabs(fileStore.entries);
  })();
});
</script>

<style scoped>
.panel {
  flex: 1;
  border-bottom: 1px solid #2c3340;
  overflow-y: auto;
}

.panel__header {
  margin: 0;
  padding: 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #888;
}

.panel__body {
  padding: 0 10px 10px;
}

.panel__state {
  padding: 8px 0;
  color: #888;
}
</style>
