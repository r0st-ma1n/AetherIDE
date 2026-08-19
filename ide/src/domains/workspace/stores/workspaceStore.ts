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
    const parsed = JSON.parse(raw) as PersistedState;
    return {
      activeTabId: parsed.activeTabId ?? null,
      tabs: (parsed.tabs ?? []).map((tab) => ({
        ...tab,
        // Never restore dirty flags — buffers are not persisted.
        isDirty: false,
      })),
    };
  } catch {
    return null;
  }
}

function savePersisted(state: PersistedState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeTabId: state.activeTabId,
        tabs: state.tabs.map((tab) => ({
          ...tab,
          isDirty: false,
        })),
      })
    );
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

  const dirtyTabs = computed(() => tabs.value.filter((tab) => tab.isDirty));
  const hasDirtyTabs = computed(() => dirtyTabs.value.length > 0);

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

  function clearTabs() {
    tabs.value = [];
    activeTabId.value = null;
  }

  function pruneMissingTabs(validPaths: Iterable<string>) {
    const allowed = new Set(validPaths);
    tabs.value = tabs.value.filter((tab) => allowed.has(tab.filePath));

    if (
      activeTabId.value != null &&
      !tabs.value.some((tab) => tab.id === activeTabId.value)
    ) {
      activeTabId.value = tabs.value[0]?.id ?? null;
    }
  }

  function initializeTabs(candidates: WorkspaceTab[]) {
    // Skip if tabs were restored from localStorage
    if (tabs.value.length > 0 || candidates.length === 0) {
      return;
    }

    const preferredUiTab =
      candidates.find((tab) => tab.filePath.endsWith('.aether')) ??
      candidates.find((tab) => tab.filePath.endsWith('.ui')) ??
      candidates.find((tab) => tab.kind === 'designer') ??
      null;

    const preferredCodeTab =
      candidates.find((tab) => tab.filePath.endsWith('.h')) ??
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
    activeTab,
    activeTabId,
    clearTabs,
    closeTab,
    dirtyTabs,
    hasDirtyTabs,
    initializeTabs,
    markDirty,
    moveTab,
    openTab,
    pruneMissingTabs,
    setActiveTab,
    showToast,
    tabs,
    toastMessage,
  };
});
