//electron app always expect the preload to be commonjs, so even if whole project is module ESM use require in preload
const { contextBridge, ipcRenderer } = require('electron');

//expose the functions of render to the main file of window for actions
contextBridge.exposeInMainWorld('api', {
  imagePreview: (callback) =>
    ipcRenderer.on('image-preview', (_event, image) => callback(image)),
  message: (callback) => ipcRenderer.on('message-col', callback),
  mouseToggle: (callback) => ipcRenderer.on('mouse',(_event, option) => callback(option)),
  command: (callback) => ipcRenderer.on('command',(_event, option) => callback(option)),
  deleteImage: (callback) => ipcRenderer.on('delete-screenshot', callback),
  deleteQueue: (callback) => ipcRenderer.on('clear-screenshots', callback),
});
