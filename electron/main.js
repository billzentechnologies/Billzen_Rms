const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        icon: path.join(__dirname, '../public/billzenrms.png'),
        show: false,
        center: true,
    });

    win.setMenu(null);

    win.once('ready-to-show', () => {
        win.maximize();
        win.show();
    });

    // Override the close behavior - add confirmation
    win.on('close', (e) => {
        const { dialog } = require('electron');
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