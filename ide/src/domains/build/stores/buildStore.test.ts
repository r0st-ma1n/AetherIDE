import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBuildStore } from './buildStore';

describe('buildStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(window.prototypeIDE.buildProject).mockResolvedValue({
      status: 'success',
      exitCode: 0,
      message: 'Build succeeded.',
    });
    vi.mocked(window.prototypeIDE.stopBuild).mockResolvedValue(true);
  });

  it('startBuild clears log and applies result status', async () => {
    const store = useBuildStore();
    store.appendLog('stale\n');

    const result = await store.startBuild();

    expect(window.prototypeIDE.buildProject).toHaveBeenCalledOnce();
    expect(store.logText).toBe('');
    expect(result.status).toBe('success');
    expect(store.status).toBe('success');
    expect(store.exitCode).toBe(0);
    expect(store.isCollapsed).toBe(false);
  });

  it('applies streamed status updates', () => {
    const store = useBuildStore();
    store.applyStatus({ status: 'building', exitCode: null });
    expect(store.isBuilding).toBe(true);
    expect(store.statusLabel).toBe('Building');

    store.appendLog('compiling...\n');
    store.applyStatus({
      status: 'failed',
      exitCode: 1,
      message: 'Build failed.',
    });
    expect(store.status).toBe('failed');
    expect(store.logText).toContain('compiling');
    expect(store.lastMessage).toBe('Build failed.');
  });

  it('marks failed when buildProject throws', async () => {
    vi.mocked(window.prototypeIDE.buildProject).mockRejectedValueOnce(
      new Error('cmake missing')
    );
    const store = useBuildStore();
    const result = await store.startBuild();
    expect(result.status).toBe('failed');
    expect(store.logText).toContain('cmake missing');
  });
});

describe('buildStore — configuration and artifacts', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('builds Release by default and passes the chosen configuration', async () => {
    vi.mocked(window.prototypeIDE.buildProject).mockResolvedValue({
      status: 'success',
      exitCode: 0,
    });
    const store = useBuildStore();
    expect(store.config).toBe('Release');

    store.setConfig('Debug');
    await store.startBuild();
    expect(window.prototypeIDE.buildProject).toHaveBeenLastCalledWith({
      config: 'Debug',
    });
  });

  it('remembers the configuration', () => {
    useBuildStore().setConfig('Debug');
    setActivePinia(createPinia());
    expect(useBuildStore().config).toBe('Debug');
  });

  it('keeps the built bundles and reveals the first one', async () => {
    vi.mocked(window.prototypeIDE.buildProject).mockResolvedValue({
      status: 'success',
      exitCode: 0,
      artifacts: ['C:/p/build/VST3/Gain.vst3'],
    });
    const store = useBuildStore();
    await store.startBuild();
    expect(store.artifacts).toEqual(['C:/p/build/VST3/Gain.vst3']);

    await store.revealArtifact();
    expect(window.prototypeIDE.showInFolder).toHaveBeenCalledWith(
      'C:/p/build/VST3/Gain.vst3'
    );
  });

  it('forgets the bundles of the previous build when a new one starts', async () => {
    const store = useBuildStore();
    store.applyStatus({
      status: 'success',
      exitCode: 0,
      artifacts: ['C:/p/build/VST3/Gain.vst3'],
    });
    vi.mocked(window.prototypeIDE.buildProject).mockResolvedValue({
      status: 'failed',
      exitCode: 1,
    });
    await store.startBuild();
    expect(store.artifacts).toEqual([]);
    expect(await store.revealArtifact()).toBe(false);
  });
});
