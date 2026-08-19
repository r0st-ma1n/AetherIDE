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
