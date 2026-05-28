import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useWorkspaceStore } from './workspaceStore';

function makeTab(id: string, filePath = `${id}.ts`) {
  return { id, title: id, filePath, kind: 'code' as const };
}

describe('workspaceStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('openTab adds a new tab and activates it', () => {
    const store = useWorkspaceStore();
    store.openTab(makeTab('t1'));
    expect(store.tabs).toHaveLength(1);
    expect(store.activeTabId).toBe('t1');
  });

  it('openTab does not duplicate existing tab', () => {
    const store = useWorkspaceStore();
    store.openTab(makeTab('t1'));
    store.openTab(makeTab('t1'));
    expect(store.tabs).toHaveLength(1);
  });

  it('closeTab removes the tab', () => {
    const store = useWorkspaceStore();
    store.openTab(makeTab('t1'));
    store.openTab(makeTab('t2'));
    store.closeTab('t1');
    expect(store.tabs).toHaveLength(1);
    expect(store.tabs[0]?.id).toBe('t2');
  });

  it('closeTab activates the previous tab when the active one is closed', () => {
    const store = useWorkspaceStore();
    store.openTab(makeTab('t1'));
    store.openTab(makeTab('t2'));
    store.openTab(makeTab('t3'));
    store.setActiveTab('t2');
    store.closeTab('t2');
    // t2 was at index 1; tabs become [t1, t3]; tabs[1-1] = t1
    expect(store.activeTabId).toBe('t1');
  });

  it('closeTab sets activeTabId to null when last tab is closed', () => {
    const store = useWorkspaceStore();
    store.openTab(makeTab('t1'));
    store.closeTab('t1');
    expect(store.activeTabId).toBeNull();
  });

  it('markDirty sets isDirty flag on the correct tab', () => {
    const store = useWorkspaceStore();
    store.openTab(makeTab('t1'));
    store.markDirty('t1', true);
    expect(store.tabs[0]?.isDirty).toBe(true);
    store.markDirty('t1', false);
    expect(store.tabs[0]?.isDirty).toBe(false);
  });

  it('moveTab reorders tabs', () => {
    const store = useWorkspaceStore();
    store.openTab(makeTab('t1'));
    store.openTab(makeTab('t2'));
    store.openTab(makeTab('t3'));
    store.moveTab('t3', 't1');
    expect(store.tabs.map((t) => t.id)).toEqual(['t3', 't1', 't2']);
  });

  it('setActiveTab changes the active tab', () => {
    const store = useWorkspaceStore();
    store.openTab(makeTab('t1'));
    store.openTab(makeTab('t2'));
    store.setActiveTab('t1');
    expect(store.activeTabId).toBe('t1');
  });

  it('initializeTabs is skipped when tabs are already open', () => {
    const store = useWorkspaceStore();
    store.openTab(makeTab('t1'));
    store.initializeTabs([
      { ...makeTab('t2'), isDirty: false },
      { ...makeTab('t3'), isDirty: false },
    ]);
    expect(store.tabs).toHaveLength(1);
  });

  it('persists and restores tabs from localStorage', () => {
    const store = useWorkspaceStore();
    store.openTab(makeTab('t1'));

    // New store instance reads localStorage
    setActivePinia(createPinia());
    const store2 = useWorkspaceStore();
    expect(store2.tabs).toHaveLength(1);
    expect(store2.tabs[0]?.id).toBe('t1');
  });
});
