import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFileExplorerStore } from './fileExplorerStore';
import type { FileTreeNode } from '@/shared/types';

function makeDir(id: string, children: FileTreeNode[] = []): FileTreeNode {
  return { id, name: id, path: id, isDirectory: true, children };
}

function makeFile(id: string): FileTreeNode {
  return { id, name: id, path: id, isDirectory: false, children: [] };
}

describe('fileExplorerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('toggleDirectory opens and closes a directory', () => {
    const store = useFileExplorerStore();
    store.toggleDirectory('src');
    expect(store.isDirectoryExpanded('src')).toBe(true);
    store.toggleDirectory('src');
    expect(store.isDirectoryExpanded('src')).toBe(false);
  });

  it('openDirectory / closeDirectory work independently', () => {
    const store = useFileExplorerStore();
    store.openDirectory('lib');
    expect(store.isDirectoryExpanded('lib')).toBe(true);
    store.closeDirectory('lib');
    expect(store.isDirectoryExpanded('lib')).toBe(false);
  });

  it('visibleNodes flattens top-level nodes', () => {
    const store = useFileExplorerStore();
    store.tree = [makeFile('a'), makeFile('b')];
    expect(store.visibleNodes).toHaveLength(2);
    expect(store.visibleNodes[0]?.depth).toBe(0);
  });

  it('visibleNodes includes children only when directory is expanded', () => {
    const store = useFileExplorerStore();
    store.tree = [makeDir('src', [makeFile('main.ts')])];

    expect(store.visibleNodes).toHaveLength(1);

    store.openDirectory('src');
    expect(store.visibleNodes).toHaveLength(2);
    expect(store.visibleNodes[1]?.depth).toBe(1);
  });

  it('loadEntries sets error on failure', async () => {
    const store = useFileExplorerStore();
    vi.mocked(window.prototypeIDE.listProjectFiles).mockRejectedValueOnce(
      new Error('IPC error')
    );
    await store.loadEntries();
    expect(store.error).toBe('IPC error');
    expect(store.isLoading).toBe(false);
    expect(store.entries).toHaveLength(0);
    expect(store.tree).toHaveLength(0);
  });

  it('clearEntries resets tree state', () => {
    const store = useFileExplorerStore();
    store.tree = [makeFile('a')];
    store.entries = [
      {
        id: 'a',
        title: 'a',
        filePath: 'a',
        kind: 'code',
        isDirty: false,
      },
    ];
    store.openDirectory('src');
    store.clearEntries();
    expect(store.tree).toHaveLength(0);
    expect(store.entries).toHaveLength(0);
    expect(store.expandedDirectories).toEqual({});
  });
});
