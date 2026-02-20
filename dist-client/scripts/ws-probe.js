const http = require('http');
const WebSocket = require('ws');

const serial = process.argv[2] || '192.168.1.28:5555';

function post(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload || {});
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => resolve({ code: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('[probe] start stream...');
  console.log(await post('/api/stream/start', { serial, profile: 'wifi' }));

  await new Promise((r) => setTimeout(r, 1000));

  const wsUrl = `ws://localhost:3000/api/stream/ws?serial=${encodeURIComponent(serial)}`;
  console.log('[probe] ws connect', wsUrl);

  const ws = new WebSocket(wsUrl);
  let bytes = 0;
  let chunks = 0;
  let opened = false;

  const finish = async (label) => {
    console.log(`[probe] ${label} WS_BYTES=${bytes} WS_CHUNKS=${chunks} OPENED=${opened}`);
    try { ws.close(); } catch (_) {}
    console.log(await post('/api/stream/stop', { serial }));
  };

  ws.on('open', () => {
    opened = true;
    console.log('[probe] ws open');
  });

  ws.on('message', (data) => {
    const len = data && (data.length || data.byteLength) || 0;
    bytes += len;
    chunks += 1;
  });

  ws.on('error', async (err) => {
    console.log('[probe] ws error', err && err.message ? err.message : String(err));
    await finish('ws error');
    process.exit(0);
  });

  setTimeout(async () => {
    await finish('timeout');
    process.exit(0);
  }, 5000);
})().catch(async (e) => {
  console.error('[probe] fatal', e && e.message ? e.message : e);
  process.exit(1);
});
