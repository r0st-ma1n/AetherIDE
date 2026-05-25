const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('prototypeIDE', {
  version: '0.1.0',
  listProjectFiles: () => ipcRenderer.invoke('project:list-files'),
  readFile: (path) => ipcRenderer.invoke('file:read', path),
  writeFile: (path, content) =>
    ipcRenderer.invoke('file:write', {
      path,
      content,
    }),
});
