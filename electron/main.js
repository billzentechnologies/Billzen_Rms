const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

const isDev = process.env.NODE_ENV === 'development';

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
            backgroundThrottling: true
        }
    });

    win.setMenu(null);

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