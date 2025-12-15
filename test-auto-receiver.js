const WebSocket = require('ws');

console.log('🔄 Auto-connecting audio receiver test client...\n');

const ws = new WebSocket('ws://localhost:3000/api/audio/stream?serial=1WMHHA60AD2441&mode=receiver');
let chunks = 0;

ws.binaryType = 'arraybuffer';

ws.on('open', () => {
  console.log('✓ Receiver CONNECTED to server');
  console.log('Waiting for audio chunks...\n');
});

ws.on('message', (data) => {
  if (typeof data === 'string') {
    const msg = JSON.parse(data);
    console.log(`📨 Message: ${msg.type || msg}`);
  } else {
    chunks++;
    if (chunks % 10 === 1 || chunks <= 3) {
      console.log(`  [Chunk #${chunks}] ${Buffer.byteLength(data)} bytes`);
    }
  }
});

ws.on('error', (err) => {
  console.error(`✗ ERROR: ${err.message}`);
  process.exit(1);
});

ws.on('close', () => {
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total chunks received: ${chunks}`);
  console.log(chunks > 0 ? '✅ SUCCESS!' : '❌ FAILED');
  process.exit(chunks > 0 ? 0 : 1);
});

// Close after 10 seconds
setTimeout(() => {
  console.log('\n[Auto-closing after 10 seconds...]');
  ws.close();
}, 10000);
