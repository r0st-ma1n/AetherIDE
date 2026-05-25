import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { WorkspaceTab, WorkspaceTabKind } from '@/shared/types';

export const useWorkspaceStore = defineStore('workspace', () => {
  const tabs = ref<WorkspaceTab[]>([]);
  const activeTabId = ref<string | null>(null);

  const activeTab = computed(() =>
    tabs.value.find((tab) => tab.id === activeTabId.value) ?? null,
  );

  function openTab(payload: {
    id: string;
    title: string;
    filePath: string;
    kind: WorkspaceTabKind;
  }) {
    const existingTab = tabs.value.find((tab) => tab.id === payload.id);

    if (!existingTab) {
      tabs.value.push({
        ...payload,
        isDirty: false,
      });
    }

    activeTabId.value = payload.id;
  }

  function closeTab(tabId: string) {
    const index = tabs.value.findIndex((tab) => tab.id === tabId);

    if (index === -1) {
      return;
    }

    tabs.value.splice(index, 1);

    if (activeTabId.value === tabId) {
      activeTabId.value = tabs.value[index - 1]?.id ?? tabs.value[0]?.id ?? null;
    }
  }

  function setActiveTab(tabId: string) {
    activeTabId.value = tabId;
  }

  function markDirty(tabId: string, isDirty: boolean) {
    const tab = tabs.value.find((item) => item.id === tabId);

    if (tab) {
      tab.isDirty = isDirty;
    }
  }

  return {
    tabs,
    activeTab,
    activeTabId,
    closeTab,
    markDirty,
    openTab,
    setActiveTab,
  };
});
