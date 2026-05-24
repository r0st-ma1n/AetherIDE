import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Tab {
  id: string;
  name: string;
  type: 'code' | 'designer';
  isDirty: boolean;
}

export const useEditorStore = defineStore('editor', () => {
  const tabs = ref<Tab[]>([]);
  const activeTabId = ref<string | null>(null);

  // Если в будущем name будет просто названием ('GainPlugin.cpp'),
  // в эту функцию лучше передавать отдельный параметр id (например, полный путь к файлу).
  function openFile(id: string, name: string, type: 'code' | 'designer') {
    const existingTab = tabs.value.find((tab) => tab.id === id);

    if (!existingTab) {
      tabs.value.push({
        id,
        name,
        type,
        isDirty: false,
      });
    }

    activeTabId.value = id;
  }

  function closeTab(id: string) {
    const index = tabs.value.findIndex((tab) => tab.id === id);
    if (index === -1) return;

    tabs.value.splice(index, 1);

    if (activeTabId.value === id) {
      if (tabs.value.length > 0) {
        const newIndex = index > 0 ? index - 1 : 0;
        activeTabId.value = tabs.value[newIndex].id;
      } else {
        activeTabId.value = null;
      }
    }
  }

  function setActiveTab(id: string) {
    activeTabId.value = id;
  }

  return {
    tabs,
    activeTabId,
    openFile,
    closeTab,
    setActiveTab,
  };
});
