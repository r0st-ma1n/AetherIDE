const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('prototypeIDE', {
  version: '0.1.0',
});
