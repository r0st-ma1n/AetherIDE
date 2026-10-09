import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, type Mock } from 'vitest';
import UIDesigner from './UIDesigner.vue';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';

const AETHER_PATH = 'C:/p/Gain.aether';

const TAB = {
  id: 'tab-1',
  title: 'Gain.aether',
  filePath: AETHER_PATH,
  kind: 'designer' as const,
  isDirty: false,
};

const PROJECT = {
  version: 2,
  plugin: {
    name: 'Gain',
    vendor: 'Aether',
    id: 'dev.aether.gain',
    version: '1.0.0',
    category: 'Effect',
  },
  parameters: [
    { id: 'gain', name: 'Gain', type: 'float', min: 0, max: 2, default: 1 },
  ],
  components: [
    {
      type: 'Knob',
      id: 'knob1',
      x: 0,
      y: 0,
      width: 80,
      height: 80,
      properties: { parameterId: 'gain' },
    },
  ],
};

describe('UIDesigner save', () => {
  const readFile = () => window.prototypeIDE.readFile as Mock;
  const writeFile = () => window.prototypeIDE.writeFile as Mock;
  const fileExists = () => window.prototypeIDE.fileExists as Mock;

  beforeEach(() => {
    setActivePinia(createPinia());
    readFile().mockReset();
    readFile().mockResolvedValue(JSON.stringify(PROJECT));
    fileExists().mockReset();
    fileExists().mockResolvedValue(false);
    writeFile().mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('writes the .aether, UI sources and the processor generated from it', async () => {
    const workspaceStore = useWorkspaceStore();
    const wrapper = mount(UIDesigner, {
      props: { tab: TAB },
      attachTo: document.body,
    });
    await flushPromises();
    workspaceStore.activeTabId = TAB.id;

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true })
    );
    await flushPromises();

    const written = new Map<string, string>(
      writeFile().mock.calls.map(([path, content]) => [path, content])
    );
    expect([...written.keys()].map((p) => p.replace(/\\/g, '/'))).toEqual([
      'C:/p/Gain.aether',
      'C:/p/Gain.h',
      'C:/p/Gain.cpp',
      'C:/p/GainProcessor.h',
      'C:/p/GainProcessor.cpp',
    ]);

    const processorCpp = [...written.entries()].find(([path]) =>
      path.endsWith('GainProcessor.cpp')
    )![1];
    expect(processorCpp).toContain(
      'gainParameter_ = &parameters_.addFloat("gain", "Gain", 0.0f, 2.0f, 1.0f);'
    );
    expect(processorCpp).toContain('.id = "dev.aether.gain"');

    const uiCpp = [...written.entries()].find(([path]) =>
      path.endsWith('Gain.cpp')
    )![1];
    expect(uiCpp).toContain(
      'knob1.setParameter(processor.getParameter("gain"));'
    );

    wrapper.unmount();
  });
});
