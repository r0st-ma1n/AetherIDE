import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FileExplorer from './FileExplorer.vue';

describe('FileExplorer', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(window.prototypeIDE.listProjectFiles).mockResolvedValue([]);
  });

  it('shows loading state while fetching files', async () => {
    vi.mocked(window.prototypeIDE.listProjectFiles).mockReturnValue(
      new Promise(() => {}) // never resolves, so isLoading stays true
    );
    const wrapper = mount(FileExplorer);
    // Wait for onMounted to run and set isLoading = true
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Loading files');
  });

  it('shows error state when loading fails', async () => {
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
