<template>
  <section class="workspace">
    <TabBar
      :tabs="workspaceStore.tabs"
      :active-tab-id="workspaceStore.activeTabId"
      @activate="workspaceStore.setActiveTab"
      @close="workspaceStore.closeTab"
    />

    <div class="workspace__content">
      <UIDesigner v-if="activeTab?.kind === 'designer'" :tab="activeTab" />
      <CodeEditor v-else-if="activeTab" :tab="activeTab" />
      <div v-else class="workspace__empty">Open a file to start editing.</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import CodeEditor from '@/domains/editor/components/CodeEditor.vue';
import UIDesigner from '@/domains/ui-designer/components/UIDesigner.vue';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';
import TabBar from './TabBar.vue';

const workspaceStore = useWorkspaceStore();

const activeTab = computed(() =>
  workspaceStore.tabs.find((tab) => tab.id === workspaceStore.activeTabId),
);
</script>

<style scoped>
.workspace {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 100vh;
}

.workspace__content {
  min-height: 0;
  padding: 16px;
}

.workspace__empty {
  display: grid;
  height: 100%;
  place-items: center;
  color: #76839a;
  border: 1px dashed #313847;
  border-radius: 20px;
  background-color: rgba(18, 20, 26, 0.8);
}
</style>
