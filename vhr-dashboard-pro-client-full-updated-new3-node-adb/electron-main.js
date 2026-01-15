// Electron main process entry for VHR Dashboard
// Boots the local Express server then opens a BrowserWindow on it.

const { app, BrowserWindow } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const http = require('http');

const PORT = process.env.PORT || 3000;
let serverProcess = null;

function startServer() {
  if (serverProcess) return;
  const env = { ...process.env, PORT, ELECTRON_APP: '1', NO_ADB: process.env.NO_ADB || '1' };
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
  startServer();
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
});
