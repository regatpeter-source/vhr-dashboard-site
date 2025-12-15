const WebSocket = require('ws');

const SERIAL = '1WMHHA60AD2441';
const SERVER_URL = `ws://localhost:3000/api/audio/stream`;

let chunksReceivedByReceiver = 0;
let senderChunksCount = 0;

console.log('=== AUDIO STREAMING TEST ===\n');

// STEP 1: Create a SENDER that will send fake audio chunks
console.log(`[TEST] Starting SENDER...`);
const senderWs = new WebSocket(`${SERVER_URL}?serial=${SERIAL}&mode=sender`);

senderWs.on('open', () => {
  console.log(`[SENDER] ✓ Connected as SENDER`);
  
  // Send 10 dummy audio chunks (simulating audio data)
  const interval = setInterval(() => {
    if (senderChunksCount < 10) {
      const chunk = Buffer.alloc(1948);
      chunk.fill(0xAA); // Dummy audio data
      senderWs.send(chunk, (err) => {
        if (!err) {
          senderChunksCount++;
          console.log(`[SENDER] Sent chunk #${senderChunksCount}`);
        }
      });
    } else {
      clearInterval(interval);
      console.log(`[SENDER] ✓ Finished sending 10 chunks`);
      
      // After sender finishes, wait 500ms then connect receiver
      setTimeout(() => {
        console.log(`\n[TEST] Now connecting RECEIVER (should get buffered chunks)...`);
        connectReceiver();
      }, 500);
    }
  }, 100);
});

senderWs.on('error', (err) => {
  console.error(`[SENDER] ✗ Error:`, err.message);
});

senderWs.on('close', () => {
  console.log(`[SENDER] Disconnected`);
});

// STEP 2: Connect a RECEIVER after sender has sent some chunks
function connectReceiver() {
  const receiverWs = new WebSocket(`${SERVER_URL}?serial=${SERIAL}&mode=receiver`);
  
  receiverWs.binaryType = 'arraybuffer';
  
  receiverWs.on('open', () => {
    console.log(`[RECEIVER] ✓ Connected as RECEIVER`);
  });
  
  receiverWs.on('message', (data) => {
    if (typeof data === 'string') {
      // Text message (control)
      try {
        const msg = JSON.parse(data);
        console.log(`[RECEIVER] Control message:`, msg);
      } catch (e) {
        console.log(`[RECEIVER] Text message:`, data);
      }
    } else {
      // Binary audio chunk
      chunksReceivedByReceiver++;
      console.log(`[RECEIVER] Got audio chunk #${chunksReceivedByReceiver} (${Buffer.byteLength(data)} bytes)`);
    }
  });
  
  receiverWs.on('error', (err) => {
    console.error(`[RECEIVER] ✗ Error:`, err.message);
  });
  
  receiverWs.on('close', () => {
    console.log(`[RECEIVER] Disconnected`);
    
    // Print results
    setTimeout(() => {
      console.log(`\n=== TEST RESULTS ===`);
      console.log(`Chunks sent by SENDER: ${senderChunksCount}`);
      console.log(`Chunks received by RECEIVER: ${chunksReceivedByReceiver}`);
      
      if (chunksReceivedByReceiver > 0) {
        console.log(`\n✅ SUCCESS: Buffering is working! Receiver got ${chunksReceivedByReceiver} buffered chunks`);
      } else {
        console.log(`\n❌ FAILURE: Receiver got 0 chunks. Buffering is not working.`);
      }
      
      process.exit(0);
    }, 1000);
  });
  
  // Auto-close after 3 seconds to see results
  setTimeout(() => {
    console.log(`[TEST] Closing receiver connection...`);
    receiverWs.close();
  }, 3000);
}
