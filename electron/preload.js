const { ipcRenderer } = require('electron');

// Expose a simple API for the React app to open the Day Report preview
window.dayReportAPI = {
  preview: (payload) => ipcRenderer.invoke('day-report:preview', payload),
};

