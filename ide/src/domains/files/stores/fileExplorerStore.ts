import { defineStore } from 'pinia';
import { ref } from 'vue';
import { buildFileTree } from '@/domains/files/lib/fileTree';
import { toWorkspaceTab } from '@/domains/files/lib/projectFiles';
import type { FileTreeNode, WorkspaceTab } from '@/shared/types';

export const useFileExplorerStore = defineStore('file-explorer', () => {
  const entries = ref<WorkspaceTab[]>([]);
  const tree = ref<FileTreeNode[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function loadEntries() {
    isLoading.value = true;
    error.value = null;

    try {
      const files = await window.prototypeIDE.listProjectFiles();
      entries.value = files.map(toWorkspaceTab);
      tree.value = buildFileTree(files);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Unable to load project files.';
      error.value = message;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    error,
    entries,
    isLoading,
    loadEntries,
    tree,
  };
});
