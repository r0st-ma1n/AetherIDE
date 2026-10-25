import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BuildPanel from './BuildPanel.vue';
import { useBuildStore } from '@/domains/build/stores/buildStore';
import { useProjectStore } from '@/domains/workspace/stores/projectStore';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';

describe('BuildPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  function mountWithProject() {
    useProjectStore().rootPath = 'C:/p';
    return mount(BuildPanel);
  }

  it('builds the configuration chosen in the selector', async () => {
    vi.mocked(window.prototypeIDE.buildProject).mockResolvedValue({
      status: 'success',
      exitCode: 0,
    });
    const wrapper = mountWithProject();
    await wrapper.find('select').setValue('Debug');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Build')!
      .trigger('click');
    await flushPromises();
    expect(window.prototypeIDE.buildProject).toHaveBeenLastCalledWith({
      config: 'Debug',
    });
  });

  it('offers to open the folder of a built plugin', async () => {
    const wrapper = mountWithProject();
    const openButton = () =>
      wrapper.findAll('button').find((b) => b.text() === 'Open folder');
    expect(openButton()).toBeUndefined();

    useBuildStore().applyStatus({
      status: 'success',
      exitCode: 0,
      artifacts: ['C:/p/build/VST3/Gain.vst3'],
    });
    await flushPromises();
    await openButton()!.trigger('click');
    expect(window.prototypeIDE.showInFolder).toHaveBeenCalledWith(
      'C:/p/build/VST3/Gain.vst3'
    );
  });

  it('installs the built plugin and reports a busy one', async () => {
    vi.mocked(window.prototypeIDE.installPlugin).mockResolvedValueOnce({
      ok: false,
      reason: 'busy',
      message: 'Gain.vst3 is in use',
    });
    const wrapper = mountWithProject();
    useBuildStore().applyStatus({
      status: 'success',
      exitCode: 0,
      artifacts: ['C:/p/build/VST3/Gain.vst3'],
    });
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Install')!
      .trigger('click');
    await flushPromises();

    expect(window.prototypeIDE.installPlugin).toHaveBeenCalledWith(
      'C:/p/build/VST3/Gain.vst3'
    );
    expect(useWorkspaceStore().toastMessage).toBe('Gain.vst3 is in use');
  });
});
