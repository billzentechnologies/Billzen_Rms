// ✅ Get device info securely via Electron IPC bridge
// NOTE: This is now async because it calls the main process via IPC.
export const getDeviceInfo = async () => {
    try {
        if (window.electronAPI && window.electronAPI.getDeviceInfo) {
            const info = await window.electronAPI.getDeviceInfo();
            console.log("🖥️ System Name:", info.systemName);
            console.log("🆔 Device ID:", info.deviceId);
            return info;
        }
    } catch (error) {
        console.error("Error getting device info via IPC:", error);
    }

    // Fallback for browser/dev mode
    return {
        systemName: 'Browser',
        deviceId: 'Browser-ID',
        platform: 'Web',
        isElectron: false
    };
};

// ✅ Save login log securely via Electron IPC bridge
export const saveLogToFile = async (logEntry) => {
    try {
        if (window.electronAPI && window.electronAPI.saveLogToFile) {
            const result = await window.electronAPI.saveLogToFile(logEntry);
            if (result.success) {
                console.log(`✅ Log (${logEntry.status}) saved to:`, result.path);
            } else {
                console.error("❌ Failed to save log:", result.error);
            }
        }
    } catch (error) {
        console.error("Failed to write to log file:", error);
    }
};

