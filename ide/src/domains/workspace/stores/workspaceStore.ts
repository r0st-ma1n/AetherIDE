import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import type { WorkspaceTab, WorkspaceTabKind } from '@/shared/types';

const STORAGE_KEY = 'workspace-state';

interface PersistedState {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
}

function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function savePersisted(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors (private browsing, quota exceeded)
  }
}

export const useWorkspaceStore = defineStore('workspace', () => {
  const persisted = loadPersisted();

  const tabs = ref<WorkspaceTab[]>(persisted?.tabs ?? []);
  const activeTabId = ref<string | null>(persisted?.activeTabId ?? null);
  const toastMessage = ref<string | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  const activeTab = computed(
    () => tabs.value.find((tab) => tab.id === activeTabId.value) ?? null
  );

  watch(
    [tabs, activeTabId],
    ([nextTabs, nextActiveId]) => {
      savePersisted({ tabs: nextTabs, activeTabId: nextActiveId });
    },
    { deep: true, flush: 'sync' }
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

  function moveTab(sourceId: string, targetId: string) {
    const fromIndex = tabs.value.findIndex((t) => t.id === sourceId);
    const toIndex = tabs.value.findIndex((t) => t.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [tab] = tabs.value.splice(fromIndex, 1);
    tabs.value.splice(toIndex, 0, tab);
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
    // Skip if tabs were restored from localStorage
    if (tabs.value.length > 0 || candidates.length === 0) {
      return;
    }

    const preferredUiTab =
      candidates.find((tab) => tab.filePath === 'samples/GainPlugin/GainPlugin.ui') ??
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
    moveTab,
    initializeTabs,
    openTab,
    setActiveTab,
    showToast,
    toastMessage,
  };
});
