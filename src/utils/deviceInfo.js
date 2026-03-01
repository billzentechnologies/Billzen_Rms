export const getDeviceInfo = () => {
    try {
        // Check if we are running in Electron
        if (window.require) {
            const os = window.require('os');
            const { execSync } = window.require('child_process');

            let deviceId = '';

            // Try to get the Windows Device ID from Registry
            if (os.platform() === 'win32') {
                try {
                    const output = execSync('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\SQMClient" /v MachineId').toString();
                    const match = output.match(/MachineId\s+REG_SZ\s+\{(.*)\}/i) || output.match(/MachineId\s+REG_SZ\s+(.*)/i);
                    if (match && match[1]) {
                        deviceId = match[1].trim();
                    }
                } catch (e) {
                    console.error("Failed to get registry device ID:", e);
                }
            }

            // Fallback to MAC Address if Registry fails or not on Windows
            if (!deviceId) {
                const networkInterfaces = os.networkInterfaces();
                for (const interfaceName in networkInterfaces) {
                    const interfaces = networkInterfaces[interfaceName];
                    for (const iface of interfaces) {
                        if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
                            deviceId = iface.mac;
                            break;
                        }
                    }
                    if (deviceId) break;
                }
            }

            // Final fallback to hostname
            if (!deviceId) deviceId = os.hostname();

            console.log("🖥️ System Name:", os.hostname());
            console.log("🆔 Device ID:", deviceId);

            return {
                systemName: os.hostname(),
                deviceId: deviceId,
                platform: os.platform(),
                isElectron: true
            };
        }
    } catch (error) {
        console.error("Error getting device info:", error);
    }

    return {
        systemName: 'Browser',
        deviceId: 'Browser-ID',
        platform: 'Web',
        isElectron: false
    };
};

export const saveLogToFile = (logEntry) => {
    try {
        if (window.require) {
            const fs = window.require('fs');
            const path = window.require('path');

            // Use the 'logs' folder in the project/application directory
            const logDir = path.join(process.cwd(), 'logs');

            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }

            const logFile = path.join(logDir, 'login_history.txt');
            const timestamp = new Date().toLocaleString();
            const status = logEntry.status || 'Attempt';

            const content = `--------------------------------------------------\n` +
                `Time   : ${timestamp}\n` +
                `User   : ${logEntry.userName}\n` +
                `System : ${logEntry.systemName}\n` +
                `Device : ${logEntry.deviceId}\n` +
                `Status : ${status}\n` +
                (logEntry.message ? `Reason : ${logEntry.message}\n` : '') +
                `--------------------------------------------------\n\n`;

            // Append the log entry
            fs.appendFileSync(logFile, content, 'utf8');

            console.log(`✅ Log (${status}) saved to:`, logFile);
        }
    } catch (error) {
        console.error("Failed to write to log file:", error);
    }
};
