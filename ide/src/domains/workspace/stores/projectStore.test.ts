import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProjectStore } from './projectStore';

describe('projectStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(window.prototypeIDE.getProjectRoot).mockResolvedValue(null);
    vi.mocked(window.prototypeIDE.setProjectRoot).mockImplementation(
      async (rootPath: string) => rootPath
    );
    vi.mocked(window.prototypeIDE.clearProjectRoot).mockResolvedValue(null);
    vi.mocked(window.prototypeIDE.openProjectDialog).mockResolvedValue(null);
    vi.mocked(window.prototypeIDE.getRecentProjects).mockResolvedValue([]);
    vi.mocked(window.prototypeIDE.openRecentProject).mockImplementation(
      async (projectPath: string) => projectPath
    );
    vi.mocked(window.prototypeIDE.clearRecentProjects).mockResolvedValue([]);
  });

  it('syncFromMain loads root from Electron', async () => {
    vi.mocked(window.prototypeIDE.getProjectRoot).mockResolvedValueOnce(
      'C:/Projects/GainPlugin'
    );
    const store = useProjectStore();
    await store.syncFromMain();
    expect(store.rootPath).toBe('C:/Projects/GainPlugin');
    expect(store.hasProject).toBe(true);
    expect(store.projectName).toBe('GainPlugin');
    expect(store.isReady).toBe(true);
  });

  it('hasProject is false when root is null', async () => {
    const store = useProjectStore();
    await store.syncFromMain();
    expect(store.hasProject).toBe(false);
    expect(store.projectName).toBeNull();
  });

  it('setRoot updates rootPath via IPC', async () => {
    const store = useProjectStore();
    await store.setRoot('D:/Plugins/MyEffect');
    expect(window.prototypeIDE.setProjectRoot).toHaveBeenCalledWith(
      'D:/Plugins/MyEffect'
    );
    expect(store.rootPath).toBe('D:/Plugins/MyEffect');
  });

  it('clearRoot clears the active project', async () => {
    const store = useProjectStore();
    store.applyRoot('C:/Projects/Demo');
    await store.clearRoot();
    expect(window.prototypeIDE.clearProjectRoot).toHaveBeenCalled();
    expect(store.rootPath).toBeNull();
  });

  it('openProject ignores cancelled dialogs', async () => {
    vi.mocked(window.prototypeIDE.openProjectDialog).mockResolvedValueOnce(
      null
    );
    const store = useProjectStore();
    store.applyRoot('C:/Projects/Demo');
    const result = await store.openProject();
    expect(result).toBeNull();
    expect(store.rootPath).toBe('C:/Projects/Demo');
  });

  it('openRecent opens a path without a dialog', async () => {
    vi.mocked(window.prototypeIDE.getRecentProjects).mockResolvedValueOnce([
      {
        path: 'C:/Projects/GainPlugin',
        name: 'GainPlugin',
        openedAt: 1,
      },
    ]);
    const store = useProjectStore();
    const result = await store.openRecent('C:/Projects/GainPlugin');
    expect(window.prototypeIDE.openRecentProject).toHaveBeenCalledWith(
      'C:/Projects/GainPlugin'
    );
    expect(result).toBe('C:/Projects/GainPlugin');
    expect(store.rootPath).toBe('C:/Projects/GainPlugin');
  });

  it('syncFromMain loads recent projects', async () => {
    vi.mocked(window.prototypeIDE.getRecentProjects).mockResolvedValueOnce([
      { path: 'C:/A', name: 'A', openedAt: 2 },
      { path: 'C:/B', name: 'B', openedAt: 1 },
    ]);
    const store = useProjectStore();
    await store.syncFromMain();
    expect(store.recentProjects).toHaveLength(2);
    expect(store.recentProjects[0]?.name).toBe('A');
  });
});
