const { app, BrowserWindow, dialog, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { execSync } = require('child_process');

// 🛡️ Error handling for deep native module issues
process.on('uncaughtException', (error) => {
    console.error('🔥 [ELECTRON] Uncaught Exception:', error);
});



app.disableHardwareAcceleration();
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

const isDev = process.env.NODE_ENV === 'development';



// ✅ IPC Handlers
ipcMain.handle('log:main', (event, message) => {
    console.log("📢 [RENDERER LOG]:", message);
});

// ✅ Load config.json — checks 3 locations in priority order
ipcMain.handle('config:load', () => {
    // Priority 1: config.json placed next to the .exe (easiest for user to edit after install)
    const exeDir = path.dirname(app.getPath('exe'));
    const exeConfigPath = path.join(exeDir, 'config.json');

    // Priority 2: config.json bundled inside installer resources/
    const resourcesConfigPath = path.join(process.resourcesPath, 'config.json');

    // Priority 3: electron/config.json — dev mode only
    const devConfigPath = path.join(__dirname, 'config.json');

    const candidates = [exeConfigPath, resourcesConfigPath, devConfigPath];
    const configPath = candidates.find(p => fs.existsSync(p)) || null;

    if (configPath) {
        try {
            const raw = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(raw);
            console.log('✅ [MAIN] Config loaded from:', configPath);
            console.log('✅ [MAIN] API_BASE_URL =', config.API_BASE_URL);
            return { success: true, config, loadedFrom: configPath };
        } catch (err) {
            console.error('❌ [MAIN] Failed to parse config.json:', err.message);
            return { success: false, error: err.message };
        }
    }

    console.warn('⚠️ [MAIN] config.json not found in any location:', candidates);
    return { success: false, error: 'config.json not found' };
});



// ✅ Get Device Info (real Windows Device ID from registry or MAC fallback)
ipcMain.handle('device:getInfo', () => {
    let deviceId = '';
    const hostname = os.hostname();

    if (os.platform() === 'win32') {
        try {
            const output = execSync('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\SQMClient" /v MachineId').toString();
            const match = output.match(/MachineId\s+REG_SZ\s+\{(.*)\}/i) || output.match(/MachineId\s+REG_SZ\s+(.*)/i);
            if (match && match[1]) {
                deviceId = match[1].trim();
            }
        } catch (e) {
            console.error('Failed to get registry device ID:', e.message);
        }
    }

    if (!deviceId) {
        const ifaces = os.networkInterfaces();
        for (const name in ifaces) {
            for (const iface of ifaces[name]) {
                if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
                    deviceId = iface.mac;
                    break;
                }
            }
            if (deviceId) break;
        }
    }

    if (!deviceId) deviceId = hostname;

    console.log('🆔 [MAIN] Device ID:', deviceId);
    return { deviceId, systemName: hostname, platform: os.platform(), isElectron: true };
});

// ✅ Save login log entry to a file in the logs/ folder
ipcMain.handle('log:saveToFile', (event, logEntry) => {
    try {
        const logDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logFile = path.join(logDir, 'login_history.txt');
        const timestamp = new Date().toLocaleString();
        const status = logEntry.status || 'Attempt';
        const content =
            `--------------------------------------------------\n` +
            `Time   : ${timestamp}\n` +
            `User   : ${logEntry.userName}\n` +
            `System : ${logEntry.systemName}\n` +
            `Device : ${logEntry.deviceId}\n` +
            `Status : ${status}\n` +
            (logEntry.message ? `Reason : ${logEntry.message}\n` : '') +
            `--------------------------------------------------\n\n`;
        fs.appendFileSync(logFile, content, 'utf8');
        console.log(`✅ [MAIN] Log (${status}) saved to:`, logFile);
        return { success: true, path: logFile };
    } catch (err) {
        console.error('❌ [MAIN] Failed to write log:', err.message);
        return { success: false, error: err.message };
    }
});



function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, '../src/assets/billzenrms.png'),
        show: false,
        center: true,

        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            backgroundThrottling: true
        }
    });

    win.setMenu(null);

    // 🛠️ Force-enable DevTools shortcut even if right-click is disabled
    globalShortcut.register('CommandOrControl+Shift+I', () => {
        win.webContents.openDevTools();
    });

    win.once('ready-to-show', () => {
        win.maximize();
        win.show();
    });

    win.on('close', (e) => {
        const response = dialog.showMessageBoxSync(win, {
            type: 'question',
            buttons: ['Cancel', 'Close'],
            title: 'Confirm',
            message: 'Are you sure you want to close Billzen RMS?',
            defaultId: 0,
            cancelId: 0
        });

        if (response === 0) {
            e.preventDefault();
        }
    });

    if (isDev) {
        win.loadURL('http://localhost:3000');
    } else {
        win.loadFile(path.join(__dirname, '../build/index.html'));
    }
}

app.whenReady().then(createWindow);

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});