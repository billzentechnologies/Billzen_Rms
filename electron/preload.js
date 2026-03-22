const { ipcRenderer, contextBridge } = require('electron');

// Expose a safe API to the renderer process (React)
contextBridge.exposeInMainWorld('electronAPI', {
  previewDayReport: (payload) => ipcRenderer.invoke('day-report:preview', payload),
  printLog: (message) => ipcRenderer.invoke('log:main', message),
  getDeviceInfo: () => ipcRenderer.invoke('device:getInfo'),
  saveLogToFile: (logEntry) => ipcRenderer.invoke('log:saveToFile', logEntry),
  loadConfig: () => ipcRenderer.invoke('config:load'),
});

// Legacy support
window.dayReportAPI = {
  preview: (payload) => ipcRenderer.invoke('day-report:preview', payload),
};
