const {
    app,
    BrowserWindow,
    globalShortcut,
    ipcMain,
    screen,
    desktopCapturer
} = require('electron');
const path = require('path');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

let mainWindow = null;
let captureWindow = null;

/**
 * Creates the main overlay window.
 * The window is transparent, frameless, and always on top.
 */
function createMainWindow() {
    const { width } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: 420,
        height: 650,
        x: width - 440,
        y: 20,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: false,
        resizable: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    mainWindow.loadFile('renderer/index.html');
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
}

app.whenReady().then(() => {
    createMainWindow();

    // Ctrl+Shift+Z toggles the overlay
    globalShortcut.register('CommandOrControl+Shift+Z', () => {
        if (!mainWindow) {
            return;
        }
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    app.quit();
});

/**
 * IPC: Starts the area capture flow.
 * Hides the main window, takes a screenshot, then opens the capture window.
 */
ipcMain.handle('start-area-capture', async () => {
    mainWindow.hide();

    // Wait for the overlay to disappear before taking the screenshot
    await new Promise(resolve => setTimeout(resolve, 150));

    const { width, height } = screen.getPrimaryDisplay().size;
    const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height }
    });

    if (!sources.length) {
        mainWindow.show();
        return false;
    }

    const screenshotDataUrl = sources[0].thumbnail.toDataURL();

    captureWindow = new BrowserWindow({
        width,
        height,
        x: 0,
        y: 0,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: {
            preload: path.join(__dirname, 'capture-preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    captureWindow.loadFile('capture/capture.html');
    captureWindow.webContents.once('did-finish-load', () => {
        captureWindow.webContents.send('screenshot', screenshotDataUrl);
    });

    return true;
});

/**
 * IPC: Receives the cropped image from the capture window after area selection.
 * Closes the capture window and sends the image to the main renderer for scanning.
 */
ipcMain.handle('area-selected', async (event, croppedImageDataUrl) => {
    if (captureWindow) {
        captureWindow.close();
        captureWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('scan-image', croppedImageDataUrl);
    return true;
});

/**
 * IPC: Cancels the area capture and restores the main window.
 */
ipcMain.handle('cancel-capture', async () => {
    if (captureWindow) {
        captureWindow.close();
        captureWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
    return true;
});

/**
 * IPC: Returns the configured API base URL.
 */
ipcMain.handle('get-api-url', () => API_BASE_URL);
