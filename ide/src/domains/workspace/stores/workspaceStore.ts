import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { WorkspaceTab, WorkspaceTabKind } from '@/shared/types';

export const useWorkspaceStore = defineStore('workspace', () => {
  const tabs = ref<WorkspaceTab[]>([]);
  const activeTabId = ref<string | null>(null);
  const toastMessage = ref<string | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  const activeTab = computed(
    () => tabs.value.find((tab) => tab.id === activeTabId.value) ?? null
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
      activeTabId.value =
        tabs.value[index - 1]?.id ?? tabs.value[0]?.id ?? null;
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

  function initializeTabs(candidates: WorkspaceTab[]) {
    if (tabs.value.length > 0 || candidates.length === 0) {
      return;
    }

    const preferredUiTab =
      candidates.find((tab) => tab.filePath === 'ide/GainPlugin.ui') ??
      candidates.find((tab) => tab.kind === 'designer') ??
      null;

    const preferredCodeTab =
      candidates.find(
        (tab) => tab.filePath === 'framework/core/examples/gain/GainPlugin.h'
      ) ??
      candidates.find((tab) => tab.kind === 'code') ??
      null;

    if (preferredUiTab) {
      openTab(preferredUiTab);
    }

    if (preferredCodeTab) {
      openTab(preferredCodeTab);
    }

    if (preferredUiTab) {
      activeTabId.value = preferredUiTab.id;
    }
  }

  function showToast(message: string) {
    toastMessage.value = message;

    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    toastTimer = setTimeout(() => {
      toastMessage.value = null;
      toastTimer = null;
    }, 2000);
  }

  return {
    tabs,
    activeTab,
    activeTabId,
    closeTab,
    markDirty,
    initializeTabs,
    openTab,
    setActiveTab,
    showToast,
    toastMessage,
  };
});
