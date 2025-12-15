const WebSocket = require('ws');

const SERIAL = '1WMHHA60AD2441';
const SERVER_URL = `ws://localhost:3000/api/audio/stream`;

console.log('🔊 AUDIO BUFFERING TEST\n');

// Connect as receiver and wait for buffered chunks
const receiverWs = new WebSocket(`${SERVER_URL}?serial=${SERIAL}&mode=receiver`);
let chunksReceived = 0;

receiverWs.binaryType = 'arraybuffer';

receiverWs.on('open', () => {
  console.log('✓ Receiver CONNECTED');
  console.log('Waiting for audio chunks...\n');
  
  // Stay connected for 5 seconds
  setTimeout(() => {
    console.log(`\n=== RESULTS ===`);
    console.log(`Audio chunks received: ${chunksReceived}`);
    
    if (chunksReceived > 0) {
      console.log(`✅ SUCCESS! Receiver got ${chunksReceived} chunks`);
      console.log(`✅ Buffering is working!`);
    } else {
      console.log(`❌ FAILURE! Receiver got 0 chunks`);
      console.log(`❌ No buffered audio reaching headset`);
    }
    
    receiverWs.close();
    process.exit(0);
  }, 5000);
});

receiverWs.on('message', (data) => {
  if (typeof data === 'string') {
    try {
      const msg = JSON.parse(data);
      console.log(`Message: ${JSON.stringify(msg)}`);
    } catch (e) {
      console.log(`Text: ${data}`);
    }
  } else {
    // Binary audio chunk
    chunksReceived++;
    console.log(`  Chunk #${chunksReceived}: ${Buffer.byteLength(data)} bytes`);
  }
});

receiverWs.on('error', (err) => {
  console.error(`✗ Connection error: ${err.message}`);
  process.exit(1);
});

receiverWs.on('close', () => {
  console.log('\nReceiver disconnected');
});

console.log('Waiting for chunks from PC audio stream...');
console.log('(PC must be sending audio via "Send Voice" button)\n');
