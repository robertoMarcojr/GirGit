const { contextBridge, ipcRenderer } = require('electron');
console.log('launcherPreload loaded');
contextBridge.exposeInMainWorld('launcher', {
  getPrompt: () => ipcRenderer.invoke('prompt:get'),
  chooseProvider: (provider) => ipcRenderer.send('provider:choose', provider),
  saveCustomPrompt: (provider, prompt) => ipcRenderer.send('prompt:custom:set', { provider, prompt }),
});
