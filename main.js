const {
    app,
    BrowserWindow,
    globalShortcut,
    ipcMain,
    screen,
    desktopCapturer,
    systemPreferences
} = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');

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
    // On macOS, screen recording permission is required.
    // There is no runtime dialog — the user must grant access in System Settings.
    if (process.platform === 'darwin') {
        const status = systemPreferences.getMediaAccessStatus('screen');
        if (status !== 'granted') {
            return { error: 'screen-permission-denied' };
        }
    }

    mainWindow.hide();

    // Wait for the overlay to disappear before taking the screenshot
    await new Promise(resolve => setTimeout(resolve, 150));

    const { width, height } = screen.getPrimaryDisplay().size;
    let screenshotDataUrl;

    if (process.platform === 'darwin') {
        // desktopCapturer can return a black thumbnail on macOS even when
        // screen recording is granted (known Electron issue for terminal-launched apps).
        // Use the OS-native screencapture command instead.
        const tempFile = path.join(os.tmpdir(), `zzz-cap-${Date.now()}.png`);
        try {
            await new Promise((resolve, reject) => {
                execFile('screencapture', ['-x', '-m', tempFile], (err) => {
                    if (err) { reject(err); } else { resolve(); }
                });
            });
            const buf = fs.readFileSync(tempFile);
            screenshotDataUrl = `data:image/png;base64,${buf.toString('base64')}`;
        } catch (_err) {
            mainWindow.show();
            return false;
        } finally {
            try { fs.unlinkSync(tempFile); } catch (_) {}
        }
    } else {
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width, height }
        });
        if (!sources.length) {
            mainWindow.show();
            return false;
        }
        screenshotDataUrl = sources[0].thumbnail.toDataURL();
    }

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
