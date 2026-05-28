import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import TabBar from './TabBar.vue';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';

function makeTab(id: string, filePath = `${id}.ts`) {
  return { id, title: id, filePath, kind: 'code' as const };
}

describe('TabBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('renders a tab for each open tab in the store', () => {
    const store = useWorkspaceStore();
    store.openTab(makeTab('t1', 'alpha.ts'));
    store.openTab(makeTab('t2', 'beta.ts'));

    const wrapper = mount(TabBar);
    expect(wrapper.findAll('.tab')).toHaveLength(2);
  });

  it('marks the active tab with the active class', () => {
    const store = useWorkspaceStore();
    store.openTab(makeTab('t1', 'alpha.ts'));
    store.openTab(makeTab('t2', 'beta.ts'));
    store.setActiveTab('t1');

    const wrapper = mount(TabBar);
    const tabs = wrapper.findAll('.tab');
    expect(tabs[0]?.classes()).toContain('tab--active');
    expect(tabs[1]?.classes()).not.toContain('tab--active');
  });

  it('closes a tab when the close button is clicked', async () => {
    const store = useWorkspaceStore();
    store.openTab(makeTab('t1', 'alpha.ts'));
    store.openTab(makeTab('t2', 'beta.ts'));

    const wrapper = mount(TabBar);
    await wrapper.findAll('.tab__close')[0]?.trigger('click');
    expect(store.tabs).toHaveLength(1);
    expect(store.tabs[0]?.id).toBe('t2');
  });

  it('activates a tab on click', async () => {
    const store = useWorkspaceStore();
    store.openTab(makeTab('t1', 'alpha.ts'));
    store.openTab(makeTab('t2', 'beta.ts'));
    store.setActiveTab('t2');

    const wrapper = mount(TabBar);
    await wrapper.findAll('.tab')[0]?.trigger('click');
    expect(store.activeTabId).toBe('t1');
  });

  it('closes the active tab on Ctrl+W', async () => {
    const store = useWorkspaceStore();
    store.openTab(makeTab('t1', 'alpha.ts'));
    store.openTab(makeTab('t2', 'beta.ts'));
    store.setActiveTab('t2');

    mount(TabBar, { attachTo: document.body });

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'w', ctrlKey: true, bubbles: true })
    );

    expect(store.tabs.find((t) => t.id === 't2')).toBeUndefined();
  });

  it('shows dirty indicator for dirty tabs', () => {
    const store = useWorkspaceStore();
    store.openTab(makeTab('t1', 'alpha.ts'));
    store.markDirty('t1', true);

    const wrapper = mount(TabBar);
    expect(wrapper.find('.tab__dirty').exists()).toBe(true);
  });
});
