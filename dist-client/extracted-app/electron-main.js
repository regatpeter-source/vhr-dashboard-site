// Electron main process entry for VHR Dashboard
// Boots the local Express server then opens a BrowserWindow on it.

const { app, BrowserWindow, session, shell } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const http = require('http');
const https = require('https');
const { startRelayClient } = require('./services/relay-client');

const PORT = process.env.PORT || 3000;
const FORCE_HTTP = process.env.FORCE_HTTP === '1';
const HTTPS_ENABLED = process.env.HTTPS_ENABLED === '1';
const preferHttps = HTTPS_ENABLED && !FORCE_HTTP;

// Autoriser les certificats auto-signés locaux si HTTPS est activé pour éviter les écrans noirs
if (preferHttps) {
  app.commandLine.appendSwitch('ignore-certificate-errors');
}

let serverProcess = null;
let relayClient = null;
let mainWindow = null;
let creatingWindow = false;
const externalOpenCooldown = new Map(); // url -> timestamp
const EXTERNAL_OPEN_COOLDOWN_MS = Number(process.env.EXTERNAL_OPEN_COOLDOWN_MS || 5000);

function configurePermissions() {
  // Allow only audio/video capture; deny everything else.
  const allowed = new Set(['media', 'microphone', 'camera']);

  if (session && session.defaultSession) {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(allowed.has(permission));
    });

    session.defaultSession.setPermissionCheckHandler((wc, permission) => allowed.has(permission));
  }

  // Contrôler l'ouverture de nouvelles fenêtres (window.open)
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      try {
        // Autoriser les pages locales du dashboard dans la même app
        if (url.startsWith('http://localhost') || url.startsWith('https://localhost') || url.startsWith('http://127.0.0.1') || url.startsWith('https://127.0.0.1')) {
          return { action: 'allow' };
        }

        const now = Date.now();
        const key = String(url || '').toLowerCase();
        const last = externalOpenCooldown.get(key) || 0;
        if (now - last < EXTERNAL_OPEN_COOLDOWN_MS) {
          console.warn('[electron] External open throttled:', url);
          return { action: 'deny' };
        }
        externalOpenCooldown.set(key, now);

        // Autoriser scrcpy lancé via lien externe (file://.../scrcpy.exe ou protocole scrcpy:)
        if (url.startsWith('scrcpy:')) {
          shell.openExternal(url);
          return { action: 'deny' };
        }

        if (url.startsWith('file://') && /\/scrcpy\//i.test(url.replace(/\\/g, '/')) && url.toLowerCase().endsWith('scrcpy.exe')) {
          const filePath = new URL(url).pathname.replace(/^\/+/, '').replace(/\//g, path.sep);
          shell.openPath(filePath);
          return { action: 'deny' };
        }

        // Pour les liens externes classiques (site vitrine, etc.), ouvrir via l'OS
        if (url.startsWith('http://') || url.startsWith('https://')) {
          shell.openExternal(url);
          return { action: 'deny' };
        }
      } catch (e) {
        console.warn('[electron] window.open blocked (error):', e?.message || e);
      }
      return { action: 'deny' };
    });
  });
}

function sleep(ms = 200) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function waitForServerOnProtocol(protocol = 'http', maxAttempts = 60, delayMs = 500) {
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

async function waitForServer(maxAttemptsPerProtocol, delayMs) {
  const attempts = Number(maxAttemptsPerProtocol ?? process.env.WAIT_FOR_SERVER_ATTEMPTS ?? 80);
  const delay = Number(delayMs ?? process.env.WAIT_FOR_SERVER_DELAY_MS ?? 500);
  const protocols = preferHttps ? ['https', 'http'] : ['http', 'https'];
  let lastError = null;

  for (const protocol of protocols) {
    try {
      await waitForServerOnProtocol(protocol, attempts, delay);
      return protocol;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Server not responding');
}

async function loadDashboardWithRetry(win, targetUrl) {
  const maxAttempts = Number(process.env.LOAD_RETRY_ATTEMPTS || 5);
  const delayMs = Number(process.env.LOAD_RETRY_DELAY_MS || 1500);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (!win || win.isDestroyed()) return;
    try {
      await win.loadURL(targetUrl);
      return;
    } catch (err) {
      console.warn(`[electron] loadURL failed (${attempt}/${maxAttempts}) ->`, err && err.message ? err.message : err);
      if (attempt >= maxAttempts) break;
      await sleep(delayMs);
      try {
        await waitForServer();
      } catch (waitErr) {
        console.warn('[electron] waitForServer retry failed:', waitErr && waitErr.message ? waitErr.message : waitErr);
      }
    }
  }

  const fallbackHtml = 'data:text/html;charset=utf-8,' + encodeURIComponent(`
    <html><body style="background:#0d0f14;color:#e0e0e0;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
      <div style="max-width:640px;text-align:center;">
        <h2>🚧 Dashboard inaccessible</h2>
        <p>Le serveur local n'a pas encore répondu. Patientez quelques secondes puis relancez, ou vérifiez qu'un antivirus/firewall ne bloque pas le port ${PORT}.</p>
        <p style="margin-top:18px;font-size:14px;color:#9aa0a6;">Astuce : fermez puis relancez l'application si le problème persiste.</p>
      </div>
    </body></html>
  `);

  try {
    await win.loadURL(fallbackHtml);
  } catch (fallbackErr) {
    console.error('[electron] fallback load failed:', fallbackErr && fallbackErr.message ? fallbackErr.message : fallbackErr);
  }
}

async function createWindow() {
  if (creatingWindow) return mainWindow;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  creatingWindow = true;
  console.log('[electron] CREATE WINDOW', new Date().toISOString());

  mainWindow = new BrowserWindow({
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
    console.warn('[electron] waitForServer failed, falling back:', e && e.message ? e.message : e);
  }

  const targetUrl = `${resolvedProtocol}://localhost:${PORT}/vhr-dashboard-pro.html`;
  try {
    await loadDashboardWithRetry(mainWindow, targetUrl);
  } finally {
    creatingWindow = false;
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Tolérer les certificats auto-signés sur localhost uniquement
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('https://localhost') || url.startsWith('https://127.0.0.1')) {
    event.preventDefault();
    return callback(true);
  }
  return callback(false);
});

// Fermeture immédiate des fenêtres supplémentaires créées par erreur
app.on('browser-window-created', (event, win) => {
  if (mainWindow && win !== mainWindow) {
    console.warn('[electron] Extra window detected, closing to avoid duplicates');
    setImmediate(() => {
      try { if (!win.isDestroyed()) win.close(); } catch (_) {}
    });
  }
});

// Verrou single instance pour éviter plusieurs BrowserWindow simultanées
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });

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
}

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