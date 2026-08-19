import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { buildFileTree } from '@/domains/files/lib/fileTree';
import { toWorkspaceTab } from '@/domains/files/lib/projectFiles';
import type { FileTreeNode, WorkspaceTab } from '@/shared/types';

export interface VisibleTreeNode {
  node: FileTreeNode;
  depth: number;
}

function flattenVisible(
  nodes: FileTreeNode[],
  depth: number,
  expanded: Record<string, boolean>,
  result: VisibleTreeNode[]
): void {
  for (const node of nodes) {
    result.push({ node, depth });
    if (node.isDirectory && (expanded[node.path] ?? false)) {
      flattenVisible(node.children, depth + 1, expanded, result);
    }
  }
}

export const useFileExplorerStore = defineStore('file-explorer', () => {
  const entries = ref<WorkspaceTab[]>([]);
  const tree = ref<FileTreeNode[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const expandedDirectories = ref<Record<string, boolean>>({});

  const flattenedEntryMap = computed(() =>
    Object.fromEntries(entries.value.map((entry) => [entry.filePath, entry]))
  );

  const visibleNodes = computed<VisibleTreeNode[]>(() => {
    const result: VisibleTreeNode[] = [];
    flattenVisible(tree.value, 0, expandedDirectories.value, result);
    return result;
  });

  function clearEntries() {
    entries.value = [];
    tree.value = [];
    expandedDirectories.value = {};
    error.value = null;
  }

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
      entries.value = [];
      tree.value = [];
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
    clearEntries,
    closeDirectory,
    entries,
    error,
    expandedDirectories,
    flattenedEntryMap,
    isDirectoryExpanded,
    isLoading,
    loadEntries,
    openDirectory,
    tree,
    toggleDirectory,
    visibleNodes,
  };
});
