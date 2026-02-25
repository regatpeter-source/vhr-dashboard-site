'use strict';

// Compatibility shim for legacy Electron builds that still require("./signaling-server").
// The signaling endpoints are now hosted directly by server.js (/api/audio/signal, /api/webrtc/*),
// so this module intentionally exposes safe no-op lifecycle helpers.

let started = false;

function startSignalingServer(options = {}) {
  if (started) {
    return {
      ok: true,
      alreadyRunning: true,
      mode: 'shim',
      ...options,
    };
  }

  started = true;
  return {
    ok: true,
    started: true,
    mode: 'shim',
    message: 'Legacy signaling shim active (handled by main server).',
    ...options,
  };
}

function stopSignalingServer() {
  const wasRunning = started;
  started = false;
  return {
    ok: true,
    stopped: wasRunning,
    mode: 'shim',
  };
}

function getSignalingServerStatus() {
  return {
    ok: true,
    running: started,
    mode: 'shim',
  };
}

module.exports = {
  startSignalingServer,
  stopSignalingServer,
  getSignalingServerStatus,
};
