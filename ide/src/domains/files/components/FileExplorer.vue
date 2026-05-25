<template>
  <section class="panel">
    <header class="panel__header">Explorer</header>
    <div class="panel__body">
      <button
        v-for="entry in fileStore.entries"
        :key="entry.id"
        class="file-entry"
        @click="workspaceStore.openTab(entry)"
      >
        <span class="file-entry__kind">{{ entry.kind === 'designer' ? 'UI' : 'TS' }}</span>
        <span>{{ entry.title }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useFileExplorerStore } from '@/domains/files/stores/fileExplorerStore';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';

const fileStore = useFileExplorerStore();
const workspaceStore = useWorkspaceStore();
</script>

<style scoped>
.panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
  border-bottom: 1px solid #2c3340;
}

.panel__header {
  padding: 16px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #8f9bb0;
}

.panel__body {
  display: grid;
  gap: 8px;
  padding: 0 12px 12px;
}

.file-entry {
  display: flex;
  gap: 12px;
  align-items: center;
  border: 1px solid #2e3541;
  border-radius: 14px;
  background-color: #1b1f27;
  padding: 12px;
  color: #d9dde5;
  text-align: left;
  cursor: pointer;
}

.file-entry__kind {
  min-width: 28px;
  color: #7ab7ff;
  font-size: 11px;
}
</style>
