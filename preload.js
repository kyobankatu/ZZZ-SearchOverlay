const { contextBridge, ipcRenderer } = require('electron');

/**
 * Exposes safe Electron APIs to the main renderer process via contextBridge.
 */
contextBridge.exposeInMainWorld('electronAPI', {
    getApiUrl: () => ipcRenderer.invoke('get-api-url'),
    startAreaCapture: () => ipcRenderer.invoke('start-area-capture'),
    onScanImage: (callback) => ipcRenderer.on('scan-image', (event, data) => callback(data)),
    onCaptureCancelled: (callback) => ipcRenderer.on('capture-cancelled', () => callback()),
});
