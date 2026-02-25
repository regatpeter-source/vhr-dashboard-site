'use strict';

// Root-level compatibility shim.
// Kept in sync with dist-client/signaling-server.js to avoid runtime crashes
// in packaged Electron builds that still require('./signaling-server').

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
