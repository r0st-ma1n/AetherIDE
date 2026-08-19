import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FileExplorer from './FileExplorer.vue';

describe('FileExplorer', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(window.prototypeIDE.getProjectRoot).mockResolvedValue(null);
    vi.mocked(window.prototypeIDE.listProjectFiles).mockResolvedValue([]);
    vi.mocked(window.prototypeIDE.onProjectRootChanged).mockReturnValue(
      vi.fn()
    );
  });

  it('shows loading state while fetching project root', async () => {
    vi.mocked(window.prototypeIDE.getProjectRoot).mockReturnValue(
      new Promise(() => {})
    );
    const wrapper = mount(FileExplorer);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Loading files');
  });

  it('shows empty state when no project is open', async () => {
    const wrapper = mount(FileExplorer);
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('No project open');
  });

  it('shows error state when loading fails', async () => {
    vi.mocked(window.prototypeIDE.getProjectRoot).mockResolvedValue(
      'C:/Projects/Demo'
    );
    vi.mocked(window.prototypeIDE.listProjectFiles).mockRejectedValueOnce(
      new Error('Network error')
    );
    const wrapper = mount(FileExplorer);
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Network error');
  });

  it('renders the Explorer header', () => {
    const wrapper = mount(FileExplorer);
    expect(wrapper.text()).toContain('Explorer');
  });
});
