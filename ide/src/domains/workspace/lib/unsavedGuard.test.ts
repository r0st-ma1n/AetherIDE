import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearTabSaveHandlers,
  registerTabSaveHandler,
} from '@/domains/workspace/lib/tabSaveRegistry';
import {
  requestCloseProject,
  requestCloseTab,
  requestQuitApp,
  saveActiveTab,
  saveAllDirtyTabs,
} from '@/domains/workspace/lib/unsavedGuard';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';

describe('unsavedGuard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    clearTabSaveHandlers();
    vi.mocked(window.prototypeIDE.confirmUnsaved).mockResolvedValue('discard');
    vi.mocked(window.prototypeIDE.confirmQuit).mockResolvedValue(true);
    vi.mocked(window.prototypeIDE.cancelQuit).mockResolvedValue(true);
    vi.mocked(window.prototypeIDE.clearProjectRoot).mockResolvedValue(null);
  });

  it('closes a clean tab without prompting', async () => {
    const store = useWorkspaceStore();
    store.openTab({
      id: 't1',
      title: 'a.ts',
      filePath: 'a.ts',
      kind: 'code',
    });

    await requestCloseTab('t1');

    expect(window.prototypeIDE.confirmUnsaved).not.toHaveBeenCalled();
    expect(store.tabs).toHaveLength(0);
  });

  it('keeps a dirty tab open when the user cancels', async () => {
    vi.mocked(window.prototypeIDE.confirmUnsaved).mockResolvedValueOnce(
      'cancel'
    );
    const store = useWorkspaceStore();
    store.openTab({
      id: 't1',
      title: 'a.ts',
      filePath: 'a.ts',
      kind: 'code',
    });
    store.markDirty('t1', true);

    const closed = await requestCloseTab('t1');

    expect(closed).toBe(false);
    expect(store.tabs).toHaveLength(1);
  });

  it('saves then closes a dirty tab when the user chooses Save', async () => {
    vi.mocked(window.prototypeIDE.confirmUnsaved).mockResolvedValueOnce('save');
    const store = useWorkspaceStore();
    store.openTab({
      id: 't1',
      title: 'a.ts',
      filePath: 'a.ts',
      kind: 'code',
    });
    store.markDirty('t1', true);

    const save = vi.fn(async () => {
      store.markDirty('t1', false);
    });
    registerTabSaveHandler('t1', save);

    const closed = await requestCloseTab('t1');

    expect(save).toHaveBeenCalledOnce();
    expect(closed).toBe(true);
    expect(store.tabs).toHaveLength(0);
  });

  it('blocks quit when the user cancels unsaved changes', async () => {
    vi.mocked(window.prototypeIDE.confirmUnsaved).mockResolvedValueOnce(
      'cancel'
    );
    const store = useWorkspaceStore();
    store.openTab({
      id: 't1',
      title: 'a.ts',
      filePath: 'a.ts',
      kind: 'code',
    });
    store.markDirty('t1', true);

    const quit = await requestQuitApp();

    expect(quit).toBe(false);
    expect(window.prototypeIDE.cancelQuit).toHaveBeenCalled();
    expect(window.prototypeIDE.confirmQuit).not.toHaveBeenCalled();
  });

  it('confirms quit after discarding dirty tabs', async () => {
    const store = useWorkspaceStore();
    store.openTab({
      id: 't1',
      title: 'a.ts',
      filePath: 'a.ts',
      kind: 'code',
    });
    store.markDirty('t1', true);

    const quit = await requestQuitApp();

    expect(quit).toBe(true);
    expect(window.prototypeIDE.confirmQuit).toHaveBeenCalled();
  });

  it('closes the project after discarding dirty tabs', async () => {
    const store = useWorkspaceStore();
    store.openTab({
      id: 't1',
      title: 'a.ts',
      filePath: 'a.ts',
      kind: 'code',
    });
    store.markDirty('t1', true);

    const closed = await requestCloseProject();

    expect(closed).toBe(true);
    expect(window.prototypeIDE.clearProjectRoot).toHaveBeenCalled();
  });

  it('saveAllDirtyTabs saves every dirty tab and stops on first failure', async () => {
    const store = useWorkspaceStore();
    store.openTab({
      id: 't1',
      title: 'a.ts',
      filePath: 'a.ts',
      kind: 'code',
    });
    store.openTab({
      id: 't2',
      title: 'b.ts',
      filePath: 'b.ts',
      kind: 'code',
    });
    store.markDirty('t1', true);
    store.markDirty('t2', true);

    const save1 = vi.fn(async () => {
      store.markDirty('t1', false);
    });
    const save2 = vi.fn(async () => {
      throw new Error('disk full');
    });
    registerTabSaveHandler('t1', save1);
    registerTabSaveHandler('t2', save2);

    const ok = await saveAllDirtyTabs();

    expect(ok).toBe(false);
    expect(save1).toHaveBeenCalledOnce();
    expect(save2).toHaveBeenCalledOnce();
    expect(store.tabs.find((tab) => tab.id === 't1')?.isDirty).toBe(false);
    expect(store.tabs.find((tab) => tab.id === 't2')?.isDirty).toBe(true);
  });

  it('saveActiveTab no-ops when the active tab is clean', async () => {
    const store = useWorkspaceStore();
    store.openTab({
      id: 't1',
      title: 'a.ts',
      filePath: 'a.ts',
      kind: 'code',
    });

    const ok = await saveActiveTab();
    expect(ok).toBe(true);
    expect(store.toastMessage).toBe('No unsaved changes.');
  });
});
