import { vi } from 'vitest';

// jsdom does not implement ResizeObserver
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub;

// Mock Electron IPC bridge
const mockProtoIDE = {
  version: '0.1.0',
  onToggleDebugPanel: vi.fn(() => vi.fn()),
  onFileChanged: vi.fn(() => vi.fn()),
  onProjectRootChanged: vi.fn(() => vi.fn()),
  onQuitRequested: vi.fn(() => vi.fn()),
  onCloseProjectRequested: vi.fn(() => vi.fn()),
  onNewProjectRequested: vi.fn(() => vi.fn()),
  onRecentProjectsChanged: vi.fn(() => vi.fn()),
  onSaveRequested: vi.fn(() => vi.fn()),
  onSaveAllRequested: vi.fn(() => vi.fn()),
  onBuildRequested: vi.fn(() => vi.fn()),
  onBuildStopRequested: vi.fn(() => vi.fn()),
  onBuildLog: vi.fn(() => vi.fn()),
  onBuildStatus: vi.fn(() => vi.fn()),
  getProjectRoot: vi.fn(async () => null),
  setProjectRoot: vi.fn(async (rootPath: string) => rootPath),
  clearProjectRoot: vi.fn(async () => null),
  openProjectDialog: vi.fn(async () => null),
  getRecentProjects: vi.fn(async () => []),
  openRecentProject: vi.fn(async (projectPath: string) => projectPath),
  clearRecentProjects: vi.fn(async () => []),
  chooseDirectory: vi.fn(async () => null),
  scaffoldProject: vi.fn(async () => 'C:/Projects/Demo'),
  buildProject: vi.fn(async () => ({
    status: 'success' as const,
    exitCode: 0,
    message: 'Build succeeded.',
  })),
  stopBuild: vi.fn(async () => true),
  listProjectFiles: vi.fn(async () => []),
  readFile: vi.fn(async () => ''),
  fileExists: vi.fn(async () => false),
  writeFile: vi.fn(async () => ({ ok: true })),
  confirmUnsaved: vi.fn(async () => 'discard' as const),
  confirmQuit: vi.fn(async () => true),
  cancelQuit: vi.fn(async () => true),
};

Object.defineProperty(window, 'prototypeIDE', {
  value: mockProtoIDE,
  writable: true,
});

// Monaco editor stub
vi.mock('monaco-editor', () => ({
  editor: {
    create: vi.fn(() => ({
      getModel: vi.fn(() => ({
        setValue: vi.fn(),
        getLineCount: vi.fn(() => 1),
      })),
      getValue: vi.fn(() => ''),
      getPosition: vi.fn(() => ({ lineNumber: 1, column: 1 })),
      setValue: vi.fn(),
      dispose: vi.fn(),
      onDidChangeModelContent: vi.fn(),
      onDidChangeCursorPosition: vi.fn(),
    })),
    setModelLanguage: vi.fn(),
  },
}));
