const { contextBridge, ipcRenderer } = require('electron');

/**
 * Exposes safe Electron APIs to the capture window renderer via contextBridge.
 */
contextBridge.exposeInMainWorld('captureAPI', {
    onScreenshot: (callback) => ipcRenderer.on('screenshot', (event, data) => callback(data)),
    submitSelection: (croppedDataUrl) => ipcRenderer.invoke('area-selected', croppedDataUrl),
    cancel: () => ipcRenderer.invoke('cancel-capture'),
});
