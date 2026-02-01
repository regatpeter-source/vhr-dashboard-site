const fs = require('fs');
const path = require('path');
const os = require('os');
const { io } = require('socket.io-client');

const RELAY_URL = process.env.RELAY_URL || process.env.API_BASE_URL || 'https://vhr-dashboard-site.onrender.com';
const RELAY_NAMESPACE = '/relay';
const SESSION_STORE = path.join(__dirname, '..', 'data', 'relay-session.json');

function ensureDirExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadOrCreateSessionId() {
  if (process.env.RELAY_SESSION_ID && String(process.env.RELAY_SESSION_ID).trim()) {
    return String(process.env.RELAY_SESSION_ID).trim();
  }
  // Align with headset default ("default") to simplify pairing in prod
  const fallback = 'default';
  try {
    if (fs.existsSync(SESSION_STORE)) {
      const data = JSON.parse(fs.readFileSync(SESSION_STORE, 'utf8'));
      if (data && data.sessionId) return data.sessionId;
    }
  } catch (err) {
    console.warn('[relay] unable to read session cache', err);
  }
  const sessionId = fallback;
  try {
    ensureDirExists(SESSION_STORE);
    fs.writeFileSync(SESSION_STORE, JSON.stringify({ sessionId }, null, 2));
  } catch (err) {
    console.warn('[relay] unable to write session cache', err);
  }
  return sessionId;
}

function startRelayClient(options = {}) {
  const sessionId = options.sessionId || loadOrCreateSessionId();
  const role = options.role || 'pc';
  const info = {
    sessionId,
    host: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    version: options.version || 'unknown',
    app: options.app || 'electron-agent',
  };

  const socket = io(`${RELAY_URL}${RELAY_NAMESPACE}`, {
    transports: ['websocket'],
    reconnectionAttempts: 0,
    query: { role, sessionId },
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log(`[relay] connected as ${role}, session ${sessionId}`);
    socket.emit('state', { type: 'presence', info });
  });

  socket.on('connect_error', (err) => {
    console.error('[relay] connection error', err.message || err);
  });

  socket.on('disconnect', (reason) => {
    console.warn(`[relay] disconnected: ${reason}`);
  });

  socket.on('state', (payload) => {
    console.log('[relay] state update', payload);
  });

  socket.on('forward', (payload) => {
    console.log('[relay] forward', payload);
  });

  return { socket, sessionId };
}

module.exports = { startRelayClient };
