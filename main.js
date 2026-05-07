const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Setup logging
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.autoDownload = false;

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

    mainWindow.loadFile('index.html');
    mainWindow.setMenuBarVisibility(false);
    
    // Check for updates once window is ready
    mainWindow.once('ready-to-show', () => {
        autoUpdater.checkForUpdates();
    });
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

// Auto-Updater Events
autoUpdater.on('update-available', (info) => {
    log.info('Update available.');
    dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version (v${info.version}) of TrackLift Pro is available. Do you want to download and install it?`,
        buttons: ['Yes', 'No']
    }).then(result => {
        if (result.response === 0) {
            autoUpdater.downloadUpdate();
        }
    });
});

autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded');
    dialog.showMessageBox({
        title: 'Install Updates',
        message: 'Updates downloaded. The application will restart to apply the update.'
    }).then(() => {
        setImmediate(() => autoUpdater.quitAndInstall(true, true));
    });
});

autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater. ' + err);
});

// IPC Handler for Version checking
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('check-for-updates', () => {
    if (app.isPackaged) {
        autoUpdater.checkForUpdates();
        return { success: true };
    } else {
        return { success: false, message: "Update check only available in packaged app." };
    }
});

// Update Status Reporting
autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('update-status', 'checking');
});

autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update-status', 'not-available');
});

autoUpdater.on('download-progress', (progressObj) => {
    mainWindow?.webContents.send('update-status', 'downloading', progressObj.percent);
});
