// Electron main process entry for VHR Dashboard
// Boots the local Express server then opens a BrowserWindow on it.

const { app, BrowserWindow, session } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const http = require('http');
const https = require('https');
const os = require('os');
const { startRelayClient } = require('./services/relay-client');

const PORT = process.env.PORT || 3000;
const FORCE_HTTP = process.env.FORCE_HTTP === '1';
const HTTPS_ENABLED = process.env.HTTPS_ENABLED === '1';
const preferHttps = HTTPS_ENABLED && !FORCE_HTTP;

// Autoriser les certificats auto-signés locaux si HTTPS est activé pour éviter les écrans noirs
if (preferHttps) {
  app.commandLine.appendSwitch('ignore-certificate-errors');
}

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

function waitForServerOnProtocol(protocol = 'http', maxAttempts = 30, delayMs = 300) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const url = `${protocol}://localhost:${PORT}/ping`;
    const client = protocol === 'https' ? https : http;
    const requestOptions = protocol === 'https' ? { rejectUnauthorized: false } : undefined;

    const tryOnce = () => {
      attempts += 1;
      client
        .get(url, requestOptions, (res) => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
            return resolve(protocol);
          }
          res.resume();
          if (attempts >= maxAttempts) return reject(new Error(`Server not responding over ${protocol}`));
          setTimeout(tryOnce, delayMs);
        })
        .on('error', () => {
          if (attempts >= maxAttempts) return reject(new Error(`Server not responding over ${protocol}`));
          setTimeout(tryOnce, delayMs);
        });
    };

    tryOnce();
  });
}

async function waitForServer(maxAttemptsPerProtocol = 30, delayMs = 300) {
  const protocols = preferHttps ? ['https', 'http'] : ['http', 'https'];
  let lastError = null;

  for (const protocol of protocols) {
    try {
      await waitForServerOnProtocol(protocol, maxAttemptsPerProtocol, delayMs);
      return protocol;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Server not responding');
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

  let resolvedProtocol = preferHttps ? 'https' : 'http';
  try {
    resolvedProtocol = await waitForServer();
  } catch (e) {
    // Continue avec le protocole par défaut pour afficher une page d'erreur intégrée si nécessaire
    console.warn('[electron] waitForServer failed, falling back:', e && e.message ? e.message : e);
  }

  // Tolérer les certificats auto-signés sur localhost uniquement
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (url.startsWith('https://localhost') || url.startsWith('https://127.0.0.1')) {
      event.preventDefault();
      return callback(true);
    }
    return callback(false);
  });

  const targetUrl = `${resolvedProtocol}://localhost:${PORT}/vhr-dashboard-pro.html`;
  await win.loadURL(targetUrl);
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
