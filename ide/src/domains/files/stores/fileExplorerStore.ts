import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { buildFileTree } from '@/domains/files/lib/fileTree';
import { toWorkspaceTab } from '@/domains/files/lib/projectFiles';
import type { FileTreeNode, WorkspaceTab } from '@/shared/types';

export const useFileExplorerStore = defineStore('file-explorer', () => {
  const entries = ref<WorkspaceTab[]>([]);
  const tree = ref<FileTreeNode[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const expandedDirectories = ref<Record<string, boolean>>({});

  const flattenedEntryMap = computed(() =>
    Object.fromEntries(entries.value.map((entry) => [entry.filePath, entry]))
  );

  async function loadEntries() {
    isLoading.value = true;
    error.value = null;

    try {
      const files = await window.prototypeIDE.listProjectFiles();
      entries.value = files.map(toWorkspaceTab);
      tree.value = buildFileTree(files);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load project files.';
      error.value = message;
    } finally {
      isLoading.value = false;
    }
  }

  function isDirectoryExpanded(path: string) {
    return expandedDirectories.value[path] ?? false;
  }

  function toggleDirectory(path: string) {
    expandedDirectories.value[path] = !isDirectoryExpanded(path);
  }

  function openDirectory(path: string) {
    expandedDirectories.value[path] = true;
  }

  function closeDirectory(path: string) {
    expandedDirectories.value[path] = false;
  }

  return {
    error,
    entries,
    expandedDirectories,
    flattenedEntryMap,
    isLoading,
    isDirectoryExpanded,
    loadEntries,
    closeDirectory,
    openDirectory,
    tree,
    toggleDirectory,
  };
});
