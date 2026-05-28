import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CodeEditor from './CodeEditor.vue';
import type { WorkspaceTab } from '@/shared/types';

const testTab: WorkspaceTab = {
  id: 'tab-1',
  title: 'main.cpp',
  filePath: 'src/main.cpp',
  kind: 'code',
  isDirty: false,
};

describe('CodeEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(window.prototypeIDE.readFile).mockResolvedValue('int main() {}');
  });

  it('renders the filename in the header', async () => {
    const wrapper = mount(CodeEditor, {
      props: { tab: testTab },
      attachTo: document.body,
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('main.cpp');
  });

  it('shows the correct language badge', () => {
    const wrapper = mount(CodeEditor, {
      props: { tab: testTab },
    });
    expect(wrapper.text()).toContain('CPP');
  });

  it('shows the file path', () => {
    const wrapper = mount(CodeEditor, {
      props: { tab: testTab },
    });
    expect(wrapper.text()).toContain('src/main.cpp');
  });

  it('displays status bar with line information', () => {
    const wrapper = mount(CodeEditor, {
      props: { tab: testTab },
    });
    expect(wrapper.text()).toContain('Lines:');
    expect(wrapper.text()).toContain('UTF-8');
  });
});
