const { spawn } = require('child_process');
const path = require('path');
const assert = require('assert');
const io = require('socket.io-client');

const PORT = process.env.TEST_PORT || 3100;
const SERVER_URL = `http://localhost:${PORT}`;
const ENV = {
  ...process.env,
  PORT: String(PORT),
  NO_ADB: '1',
  FORCE_HTTP: '1',
  QUIET_MODE: '1',
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function onceWithTimeout(emitter, event, timeoutMs, mapFn = (v) => v) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      emitter.off(event, handler);
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeoutMs);

    const handler = (payload) => {
      clearTimeout(t);
      emitter.off(event, handler);
      resolve(mapFn(payload));
    };

    emitter.on(event, handler);
  });
}

async function waitForServerReady(timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const s = io(SERVER_URL, { transports: ['websocket'], reconnection: false, timeout: 2000 });
      await onceWithTimeout(s, 'connect', 2000);
      s.disconnect();
      return;
    } catch (e) {
      await delay(300);
    }
  }
  throw new Error('Server not ready in time');
}

async function run() {
  const server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: ENV,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverOutput = '';
  server.stdout.on('data', (d) => (serverOutput += d.toString()));
  server.stderr.on('data', (d) => (serverOutput += d.toString()));

  const stopServer = () => {
    if (!server.killed) {
      server.kill('SIGTERM');
    }
  };

  try {
    await waitForServerReady();

    // Host client
    const host = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
    await onceWithTimeout(host, 'connect', 3000);

    const created = onceWithTimeout(host, 'session-created', 3000);
    host.emit('create-session', { username: 'host-user' });
    const { sessionCode, users: hostUsers } = await created;
    assert.ok(sessionCode && sessionCode.length === 6, 'Session code should be 6 chars');
    assert.strictEqual(hostUsers.length, 1, 'Host should be first user');

    // Invalid join attempt
    const invalidSocket = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
    await onceWithTimeout(invalidSocket, 'connect', 3000);
    const invalidError = onceWithTimeout(invalidSocket, 'session-error', 3000, (p) => p.error);
    invalidSocket.emit('join-session', { sessionCode: 'ZZ ZZ??', username: 'bad' });
    const errMsg = await invalidError;
    assert.ok(/invalid|non trouvée/i.test(errMsg), 'Should receive error for bad code');
    invalidSocket.disconnect();

    // Guest joins with valid code
    const guest = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
    await onceWithTimeout(guest, 'connect', 3000);
    const joined = onceWithTimeout(guest, 'session-joined', 3000);
    const hostUpdate = onceWithTimeout(host, 'session-updated', 3000);

    guest.emit('join-session', { sessionCode, username: 'guest-user' });
    const joinPayload = await joined;
    const updatePayload = await hostUpdate;

    assert.strictEqual(joinPayload.sessionCode, sessionCode, 'Guest join should return same code');
    assert.ok(joinPayload.users.some((u) => u.username === 'guest-user'), 'Guest should be listed');
    assert.ok(updatePayload.users.some((u) => u.username === 'guest-user'), 'Host should see guest in list');

    // Cleanup
    guest.disconnect();
    host.disconnect();
    stopServer();
    await delay(300);
    console.log('Session tests passed ✅');
  } catch (err) {
    stopServer();
    await delay(300);
    console.error('Session tests failed ❌');
    console.error(err.message);
    console.error('Server output:\n', serverOutput);
    process.exit(1);
  }
}

run();
