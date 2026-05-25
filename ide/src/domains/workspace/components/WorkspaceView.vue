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
  workspaceStore.tabs.find((tab) => tab.id === workspaceStore.activeTabId)
);
</script>

<style scoped>
.workspace {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  background-color: #1e1e1e;
}

.workspace__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.workspace__empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  color: #555;
}
</style>
