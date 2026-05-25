<template>
  <section class="code-editor">
    <header class="code-editor__header">
      <span>{{ tab.title }}</span>
      <button class="code-editor__action" @click="workspaceStore.markDirty(tab.id, !tab.isDirty)">
        {{ tab.isDirty ? 'Marked dirty' : 'Mark dirty' }}
      </button>
    </header>

    <div class="code-editor__body">
      <pre>{{ placeholder }}</pre>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';
import type { WorkspaceTab } from '@/shared/types';

const props = defineProps<{
  tab: WorkspaceTab;
}>();

const workspaceStore = useWorkspaceStore();

const placeholder = computed(
  () => `// Monaco editor will live in domains/editor\n// Active file: ${props.tab.filePath}`,
);
</script>

<style scoped>
.code-editor {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  border: 1px solid #2f3541;
  border-radius: 20px;
  overflow: hidden;
  background-color: rgba(17, 19, 24, 0.95);
}

.code-editor__header {
  display: flex;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #2f3541;
  color: #dce3ee;
}

.code-editor__action {
  border: 1px solid #3a4352;
  border-radius: 999px;
  background-color: transparent;
  color: #9fb0c8;
  padding: 6px 10px;
}

.code-editor__body {
  padding: 18px;
  color: #95a4bd;
}
</style>
