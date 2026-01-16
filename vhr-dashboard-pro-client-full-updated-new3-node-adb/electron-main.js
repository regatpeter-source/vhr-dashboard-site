// Electron main process entry for VHR Dashboard
// Boots the local Express server then opens a BrowserWindow on it.

const { app, BrowserWindow, session } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');
const { startRelayClient } = require('./services/relay-client');

const PORT = process.env.PORT || 3000;

function getLocalLanIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}
let serverProcess = null;
let relayClient = null;

function configurePermissions() {
  // Allow only audio/video capture; deny everything else.
  const allowed = new Set(['media', 'microphone', 'camera']);

  if (session && session.defaultSession) {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(allowed.has(permission));
    });

    session.defaultSession.setPermissionCheckHandler((wc, permission) => allowed.has(permission));
  }
}

function startServer() {
  if (serverProcess) return;
  // Allow ADB by default; users can still force relay-only mode by setting NO_ADB=1 externally.
  const defaultRelayUrl = process.env.RELAY_URL || 'https://www.vhr-dashboard-site.com';
  // Propagate defaults to child server AND current Electron process (for relay-client)
  process.env.RELAY_URL = process.env.RELAY_URL || defaultRelayUrl;
  process.env.RELAY_SESSION_ID = process.env.RELAY_SESSION_ID || 'default';
  process.env.NO_ADB = process.env.NO_ADB ?? '0';

  const env = {
    ...process.env,
    PORT,
    ELECTRON_APP: '1',
  };
  const serverPath = path.join(__dirname, 'server.js');
  serverProcess = fork(serverPath, { env, stdio: 'inherit' });
  serverProcess.on('exit', (code, signal) => {
    console.log(`[electron] server.js exited code=${code} signal=${signal}`);
    serverProcess = null;
  });
}

function stopServer() {
  if (serverProcess) {
    try { serverProcess.kill('SIGTERM'); } catch (e) {}
    serverProcess = null;
  }
}

function waitForServer(maxAttempts = 30, delayMs = 300) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const url = `http://localhost:${PORT}/ping`;

    const tryOnce = () => {
      attempts += 1;
      http.get(url, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          return resolve();
        }
        res.resume();
        if (attempts >= maxAttempts) return reject(new Error('Server not responding'));
        setTimeout(tryOnce, delayMs);
      }).on('error', () => {
        if (attempts >= maxAttempts) return reject(new Error('Server not responding'));
        setTimeout(tryOnce, delayMs);
      });
    };

    tryOnce();
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#0d0f14',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    }
  });
  await waitForServer().catch(() => {});
  await win.loadURL(`http://localhost:${PORT}/vhr-dashboard-pro.html`);
}

app.whenReady().then(() => {
  configurePermissions();
  startServer();
  relayClient = startRelayClient({
    app: 'vhr-dashboard-electron',
    version: app.getVersion && app.getVersion(),
    sessionId: process.env.RELAY_SESSION_ID || undefined,
  });
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopServer();
    app.quit();
  }
});

app.on('before-quit', () => {
  stopServer();
  if (relayClient && relayClient.socket) {
    try { relayClient.socket.disconnect(); } catch (e) {}
  }
});
