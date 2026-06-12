const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        const lvl = levels[level] || 'LOG';
        console.log(`[RENDERER - ${lvl}] ${message} (at ${path.basename(sourceId)}:${line})`);
    });

    mainWindow.loadFile('index.html');
    mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handler for Saving PDF
ipcMain.handle('save-pdf', async (event, buffer, filename) => {
    try {
        const win = BrowserWindow.fromWebContents(event.sender);
        const { canceled, filePath } = await dialog.showSaveDialog(win, {
            title: 'Save PDF Report',
            defaultPath: filename,
            filters: [
                { name: 'PDF Documents', extensions: ['pdf'] }
            ]
        });

        if (canceled || !filePath) {
             return { success: false, error: "User canceled save" };
        }

        fs.writeFileSync(filePath, Buffer.from(buffer));
        return { success: true, path: filePath };
    } catch (error) {
        console.error("Failed to save PDF:", error);
        return { success: false, error: error.message };
    }
});

// IPC Handler for Version checking
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

const { autoUpdater } = require('electron-updater');

// Ensure autoUpdater doesn't automatically download without prompting, unless we want it to.
autoUpdater.autoDownload = true; 
autoUpdater.autoInstallOnAppQuit = true;

// Send updater events to the renderer
autoUpdater.on('update-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('update-not-available', info);
});

autoUpdater.on('error', (err) => {
    if (mainWindow) mainWindow.webContents.send('update-error', err.toString());
});

autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) mainWindow.webContents.send('download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) mainWindow.webContents.send('update-downloaded', info);
});

// IPC Handler for checking updates
ipcMain.handle('check-for-updates', async () => {
    try {
        const result = await autoUpdater.checkForUpdatesAndNotify();
        return { success: true, result: result };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// IPC Handler for installing updates
ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
});
