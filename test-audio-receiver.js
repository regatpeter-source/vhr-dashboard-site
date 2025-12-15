/**
 * Test Audio Receiver Client
 * Simule un headset qui se connecte et reçoit l'audio
 */

const WebSocket = require('ws');

const serverUrl = 'ws://localhost:3000';
const serial = '1WMHHA60AD2441'; // Same serial as PC sender

console.log(`[Test] Connecting to ${serverUrl}/api/audio/stream?serial=${serial}&mode=receiver`);

const ws = new WebSocket(
  `${serverUrl}/api/audio/stream?serial=${serial}&mode=receiver`
);

let audioChunksReceived = 0;
let totalBytesReceived = 0;

ws.on('open', () => {
  console.log(`✅ Connected to audio relay server as receiver`);
});

ws.on('message', (data) => {
  if (typeof data === 'string') {
    try {
      const msg = JSON.parse(data);
      console.log(`📨 Message from server:`, msg);
    } catch (e) {
      console.log(`📨 Text message:`, data);
    }
  } else {
    // Binary audio data
    audioChunksReceived++;
    totalBytesReceived += data.length;
    
    // Log every 10 chunks to avoid spam
    if (audioChunksReceived % 10 === 0) {
      console.log(`🎵 Received audio chunk #${audioChunksReceived} (${data.length} bytes, total: ${(totalBytesReceived / 1024).toFixed(2)} KB)`);
    }
  }
});

ws.on('error', (error) => {
  console.error(`❌ WebSocket error:`, error.message);
});

ws.on('close', () => {
  console.log(`\n⏹️  Disconnected from server`);
  console.log(`📊 Total chunks received: ${audioChunksReceived}`);
  console.log(`📊 Total bytes received: ${(totalBytesReceived / 1024).toFixed(2)} KB`);
});

// Keep connection alive
process.on('SIGINT', () => {
  console.log(`\n🛑 Shutting down...`);
  ws.close();
  process.exit(0);
});
