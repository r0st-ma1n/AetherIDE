const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('prototypeIDE', {
  version: '0.1.0',
  onToggleDebugPanel: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('tools:toggle-debug-panel', listener);

    return () => {
      ipcRenderer.removeListener('tools:toggle-debug-panel', listener);
    };
  },
  listProjectFiles: () => ipcRenderer.invoke('project:list-files'),
  readFile: (path) => ipcRenderer.invoke('file:read', path),
  fileExists: (path) => ipcRenderer.invoke('file:exists', path),
  writeFile: (path, content) =>
    ipcRenderer.invoke('file:write', {
      path,
      content,
    }),
});
