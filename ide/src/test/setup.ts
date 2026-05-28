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
  listProjectFiles: vi.fn(async () => []),
  readFile: vi.fn(async () => ''),
  fileExists: vi.fn(async () => false),
  writeFile: vi.fn(async () => ({ ok: true })),
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
