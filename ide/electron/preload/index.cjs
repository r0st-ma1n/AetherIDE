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
  onFileChanged: (callback) => {
    const listener = (_event, relativePath) => callback(relativePath);
    ipcRenderer.on('file:changed', listener);

    return () => {
      ipcRenderer.removeListener('file:changed', listener);
    };
  },
  onProjectRootChanged: (callback) => {
    const listener = (_event, rootPath) => callback(rootPath);
    ipcRenderer.on('project:root-changed', listener);

    return () => {
      ipcRenderer.removeListener('project:root-changed', listener);
    };
  },
  onQuitRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('app:quit-requested', listener);

    return () => {
      ipcRenderer.removeListener('app:quit-requested', listener);
    };
  },
  onCloseProjectRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('project:close-requested', listener);

    return () => {
      ipcRenderer.removeListener('project:close-requested', listener);
    };
  },
  onNewProjectRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('project:new-requested', listener);

    return () => {
      ipcRenderer.removeListener('project:new-requested', listener);
    };
  },
  onRecentProjectsChanged: (callback) => {
    const listener = (_event, recent) => callback(recent);
    ipcRenderer.on('project:recent-changed', listener);

    return () => {
      ipcRenderer.removeListener('project:recent-changed', listener);
    };
  },
  onSaveRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('workspace:save-requested', listener);

    return () => {
      ipcRenderer.removeListener('workspace:save-requested', listener);
    };
  },
  onSaveAllRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('workspace:save-all-requested', listener);

    return () => {
      ipcRenderer.removeListener('workspace:save-all-requested', listener);
    };
  },
  onBuildRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('build:requested', listener);

    return () => {
      ipcRenderer.removeListener('build:requested', listener);
    };
  },
  onBuildStopRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('build:stop-requested', listener);

    return () => {
      ipcRenderer.removeListener('build:stop-requested', listener);
    };
  },
  onBuildLog: (callback) => {
    const listener = (_event, chunk) => callback(chunk);
    ipcRenderer.on('build:log', listener);

    return () => {
      ipcRenderer.removeListener('build:log', listener);
    };
  },
  onBuildStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('build:status', listener);

    return () => {
      ipcRenderer.removeListener('build:status', listener);
    };
  },
  getProjectRoot: () => ipcRenderer.invoke('project:get-root'),
  setProjectRoot: (rootPath) =>
    ipcRenderer.invoke('project:set-root', rootPath),
  clearProjectRoot: () => ipcRenderer.invoke('project:clear-root'),
  openProjectDialog: () => ipcRenderer.invoke('project:open-dialog'),
  getRecentProjects: () => ipcRenderer.invoke('project:get-recent'),
  openRecentProject: (projectPath) =>
    ipcRenderer.invoke('project:open-recent', projectPath),
  clearRecentProjects: () => ipcRenderer.invoke('project:clear-recent'),
  chooseDirectory: (payload) =>
    ipcRenderer.invoke('dialog:choose-directory', payload),
  scaffoldProject: (payload) => ipcRenderer.invoke('project:scaffold', payload),
  buildProject: () => ipcRenderer.invoke('build:run'),
  stopBuild: () => ipcRenderer.invoke('build:stop'),
  listProjectFiles: () => ipcRenderer.invoke('project:list-files'),
  readFile: (path) => ipcRenderer.invoke('file:read', path),
  fileExists: (path) => ipcRenderer.invoke('file:exists', path),
  writeFile: (path, content) =>
    ipcRenderer.invoke('file:write', {
      path,
      content,
    }),
  confirmUnsaved: (payload) =>
    ipcRenderer.invoke('dialog:confirm-unsaved', payload),
  confirmQuit: () => ipcRenderer.invoke('app:confirm-quit'),
  cancelQuit: () => ipcRenderer.invoke('app:cancel-quit'),
});
