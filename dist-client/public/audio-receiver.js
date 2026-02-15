(function(){
  const statusEl = document.getElementById('status');
  const statusValueEl = document.getElementById('statusValue');
  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const serialInput = document.getElementById('deviceSerial');
  const deviceLabel = document.getElementById('deviceLabel');
  const visualizer = document.getElementById('visualizer');
  const errorBox = document.getElementById('errorBox');
  const audioPlayer = document.getElementById('audioPlayer');
  const debugInfo = document.getElementById('debugInfo');

  let ws = null;
  let audioContext = null;
  let analyser = null;
  let animationId = null;
  let gainNode = null;
  let pendingChunks = [];
  let pendingSize = 0;
  let decodeQueue = [];
  let isDecoding = false;
  let mediaSource = null;
  let sourceBuffer = null;
  let mseQueue = [];
  let mseReady = false;
  const oggMime = 'audio/ogg;codecs=opus';
  const webmMime = 'audio/webm;codecs=opus';
  // Sender always emits WebM/Opus; keep receiver aligned to avoid decode mismatch.
  const canUseWebmMse = (typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported(webmMime));
  const preferredMseType = canUseWebmMse ? webmMime : null;
  let preferredBlobType = webmMime;
  let chunksReceived = 0;
  let nextPlayTime = 0;
  let isContextReady = false;
  let hasUserGesture = false;
  let pendingAutoConnect = false;
  let isConnecting = false;
  const urlParams = new URLSearchParams(window.location.search);
  const relaySession = urlParams.get('session') || '';
  const relayBaseParam = urlParams.get('relayBase') || '';
  const relayEnabled = urlParams.get('relay') === '1' || !!relaySession;
  const talkbackEnabled = (urlParams.get('talkback') === '1' || urlParams.get('bidirectional') === '1');

  let uplinkWs = null;
  let uplinkStream = null;
  let uplinkRecorder = null;

  function log(msg) {
    console.log('[Audio Receiver]', msg);
    const div = document.createElement('div');
    div.textContent = new Date().toLocaleTimeString() + ': ' + msg;
    debugInfo.appendChild(div);
    debugInfo.scrollTop = debugInfo.scrollHeight;
    while (debugInfo.children.length > 20) {
      debugInfo.removeChild(debugInfo.firstChild);
    }
  }

  // Mark first user gesture and trigger pending auto-connect if needed
  function markUserGesture() {
    if (!hasUserGesture) {
      hasUserGesture = true;
      log('User interaction detected');
    }
    initMediaSource();
    if (pendingAutoConnect) {
      pendingAutoConnect = false;
      connect();
    }
  }

  document.addEventListener('pointerdown', markUserGesture, { passive: true });
  document.addEventListener('touchstart', markUserGesture, { passive: true });
  document.addEventListener('keydown', markUserGesture);

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.add('active');
    setTimeout(() => errorBox.classList.remove('active'), 5000);
    log('ERROR: ' + message);
  }

  function setStatus(text, connected) {
    statusValueEl.textContent = text;
    statusEl.classList.remove('disconnected', 'connected');
    statusEl.classList.add(connected ? 'connected' : 'disconnected');
  }

  function resetBuffers() {
    pendingChunks = [];
    pendingSize = 0;
    decodeQueue = [];
    mseQueue = [];
    isDecoding = false;
    nextPlayTime = audioContext ? audioContext.currentTime : 0;
    if (sourceBuffer && mediaSource && mediaSource.readyState === 'open') {
      try { sourceBuffer.abort(); } catch {}
      try { sourceBuffer.remove(0, mediaSource.duration || Infinity); } catch {}
    }
  }

  async function initAudioContext() {
    if (audioContext && audioContext.state !== 'closed') return true;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 48000,
        latencyHint: 'interactive'
      });

      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0;

      gainNode.connect(analyser);
      // Do not route decoded audio to destination; playback is handled by MSE audio element

      log('AudioContext créé, sampleRate: ' + audioContext.sampleRate);

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        log('AudioContext resumed');
      }

      isContextReady = true;
      nextPlayTime = audioContext.currentTime;
      return true;
    } catch (e) {
      log('AudioContext error: ' + e.message);
      showError('❌ Erreur audio: ' + e.message);
      return false;
    }
  }

  function initMediaSource() {
    if (mediaSource) return;
    if (!audioPlayer) return;
    if (!preferredMseType) {
      log('MSE disabled: WebM not supported, using decodeAudioData only');
      return;
    }
    mediaSource = new MediaSource();
    audioPlayer.src = URL.createObjectURL(mediaSource);
    audioPlayer.autoplay = true;
    audioPlayer.muted = false;
    audioPlayer.play().catch(() => {});
    mediaSource.addEventListener('sourceopen', () => {
      try {
        sourceBuffer = mediaSource.addSourceBuffer(preferredMseType);
        sourceBuffer.mode = 'sequence';
        sourceBuffer.addEventListener('updateend', flushMseQueue);
        mseReady = true;
        flushMseQueue();
      } catch (e) {
        log('MSE init error: ' + e.message + ' type=' + preferredMseType);
      }
    });
  }

  function flushMseQueue() {
    if (!sourceBuffer || !mseReady) return;
    if (sourceBuffer.updating) return;
    const next = mseQueue.shift();
    if (!next) return;
    next.arrayBuffer().then((buf) => {
      try {
        sourceBuffer.appendBuffer(buf);
        if (audioPlayer.paused) {
          audioPlayer.play().catch(() => {});
        }
      } catch (e) {
        log('MSE append error: ' + e.message);
      }
    }).catch((e) => log('MSE buf error: ' + e.message));
  }

  function enqueueMse(blob) {
    if (!blob) return;
    if (!preferredMseType) return;
    if (!mediaSource) initMediaSource();
    mseQueue.push(blob);
    flushMseQueue();
  }

  async function playAudioChunk(arrayBuffer) {
    if (!audioContext || !isContextReady) {
      log('AudioContext not ready');
      return false;
    }

    // Ignore tiny buffers (header fragments) that cannot be decoded
    if (!arrayBuffer || arrayBuffer.byteLength < 100) {
      return false;
    }

    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
        log('AudioContext resumed during playback');
      } catch (e) {
        log('Resume failed: ' + e.message);
      }
    }

    try {
      const buffer = arrayBuffer.slice(0);
      const audioBuffer = await audioContext.decodeAudioData(buffer);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      // For visualization only; audio playback via MSE element
      source.connect(analyser);

      const now = audioContext.currentTime;
      if (nextPlayTime < now) {
        nextPlayTime = now + 0.02;
      }

      source.start(nextPlayTime);
      nextPlayTime += audioBuffer.duration;
      return true;
    } catch (e) {
      if (chunksReceived > 5 && chunksReceived % 50 === 0) {
        log('Decode skip (normal): ' + e.message.substring(0, 30));
      }
      return false;
    }
  }

  async function processDecodeQueue() {
    if (isDecoding) return;
    isDecoding = true;
    while (decodeQueue.length) {
      const buf = decodeQueue.shift();
      await playAudioChunk(buf);
    }
    isDecoding = false;
  }

  function enqueueChunk(arrayBuffer) {
    if (!arrayBuffer || arrayBuffer.byteLength < 100) return;
    pendingChunks.push(arrayBuffer);
    pendingSize += arrayBuffer.byteLength;

    // Aggregate several chunks to keep WebM header and frames together for decodeAudioData
    if (pendingSize >= 8000 || pendingChunks.length >= 3) {
      const blob = new Blob(pendingChunks, { type: preferredBlobType });
      pendingChunks = [];
      pendingSize = 0;
      blob.arrayBuffer().then((buf) => {
        decodeQueue.push(buf);
        processDecodeQueue();
      }).catch((e) => log('Blob assemble error: ' + e.message));
      enqueueMse(blob);
    }
  }

  async function resolveWsUrl(serial) {
    if (relayEnabled && relaySession) {
      let baseUrl;
      try {
        baseUrl = new URL(relayBaseParam || window.location.origin);
      } catch (e) {
        baseUrl = new URL(window.location.origin);
      }
      const protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${baseUrl.host}/api/relay/audio?session=${encodeURIComponent(relaySession)}&serial=${encodeURIComponent(serial)}&role=viewer`;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = window.location.host;
    // Si la page est en localhost, essayer de récupérer l'IP LAN du serveur pour que le casque puisse joindre le WebSocket
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      try {
        const res = await fetch('/api/server-info');
        if (res.ok) {
          const data = await res.json();
          if (data && data.lanIp) {
            host = `${data.lanIp}:${data.port || window.location.port || 3000}`;
            log('WS host basculé sur LAN: ' + host);
          }
        }
      } catch (e) {
        log('WS host fallback sur localhost');
      }
    }
    return `${protocol}//${host}/api/audio/stream?serial=${encodeURIComponent(serial)}&mode=receiver`;
  }

  async function resolveUplinkWsUrl(serial) {
    if (relayEnabled && relaySession) {
      let baseUrl;
      try {
        baseUrl = new URL(relayBaseParam || window.location.origin);
      } catch (e) {
        baseUrl = new URL(window.location.origin);
      }
      const protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${baseUrl.host}/api/relay/audio?session=${encodeURIComponent(relaySession)}&serial=${encodeURIComponent(serial)}&role=uplink-sender`;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = window.location.host;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      try {
        const res = await fetch('/api/server-info');
        if (res.ok) {
          const data = await res.json();
          if (data && data.lanIp) {
            host = `${data.lanIp}:${data.port || window.location.port || 3000}`;
          }
        }
      } catch (e) {}
    }
    return `${protocol}//${host}/api/audio/stream?serial=${encodeURIComponent(serial)}&mode=uplink-sender&format=webm`;
  }

  async function startUplink(serial) {
    if (!talkbackEnabled) return;
    if (uplinkWs || uplinkRecorder) return;

    try {
      if (!window.isSecureContext) {
        throw new Error('Contexte non sécurisé: micro bloqué (HTTPS requis)');
      }

      uplinkStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 48000 }
        }
      });

      const uplinkUrl = await resolveUplinkWsUrl(serial);
      uplinkWs = new WebSocket(uplinkUrl);

      uplinkWs.onopen = () => {
        log('Talkback uplink connecté (micro casque -> PC)');
        setStatus('✅ Connecté - Talkback actif', true);

        try {
          uplinkRecorder = new MediaRecorder(uplinkStream, {
            mimeType: webmMime,
            audioBitsPerSecond: 96000
          });
        } catch (e) {
          log('MediaRecorder uplink fallback: ' + e.message);
          uplinkRecorder = new MediaRecorder(uplinkStream);
        }

        uplinkRecorder.ondataavailable = (event) => {
          const size = event.data?.size || 0;
          if (size < 100) return;
          if (uplinkWs && uplinkWs.readyState === WebSocket.OPEN) {
            uplinkWs.send(event.data);
          }
        };

        uplinkRecorder.onerror = (event) => {
          log('Erreur enregistrement uplink: ' + (event?.error?.message || 'inconnue'));
        };

        uplinkRecorder.start(250);
      };

      uplinkWs.onerror = () => {
        log('Talkback uplink WebSocket error');
      };

      uplinkWs.onclose = () => {
        log('Talkback uplink fermé');
        stopUplink();
      };
    } catch (e) {
      log('Talkback non activé (micro refusé/indisponible): ' + e.message);
      showError('🎙️ Talkback impossible: ' + e.message);
      setStatus('⚠️ Talkback micro indisponible', true);
    }
  }

  function stopUplink() {
    try {
      if (uplinkRecorder && uplinkRecorder.state !== 'inactive') {
        uplinkRecorder.stop();
      }
    } catch (e) {}
    uplinkRecorder = null;

    if (uplinkWs) {
      try { uplinkWs.close(); } catch (e) {}
      uplinkWs = null;
    }

    if (uplinkStream) {
      try { uplinkStream.getTracks().forEach(t => t.stop()); } catch (e) {}
      uplinkStream = null;
    }
  }

  async function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      log('Already connected or connecting, skipping.');
      return;
    }
    if (isConnecting) {
      log('Connection already in progress, skipping.');
      return;
    }

    isConnecting = true;

    const serial = serialInput.value.trim();
    if (!serial) {
      showError('⚠️ Entrez le numéro de série du casque');
      isConnecting = false;
      return;
    }

    log('Initializing audio...');
    const audioOk = await initAudioContext();
    if (!audioOk) {
      showError('❌ Impossible d\'initialiser l\'audio');
      isConnecting = false;
      return;
    }

    const wsUrl = await resolveWsUrl(serial);

    log('Connecting to: ' + wsUrl);
    chunksReceived = 0;

    try {
      ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        log('WebSocket connected!');
        setStatus('✅ Connecté - En attente...', true);
        connectBtn.style.display = 'none';
        disconnectBtn.classList.add('active');
        serialInput.disabled = true;
        isConnecting = false;
        resetBuffers();
        startUplink(serial);
      };

      ws.onmessage = async (event) => {
        if (event.data instanceof ArrayBuffer) {
          chunksReceived++;
          if (chunksReceived === 1) {
            log('Premier chunk reçu! (' + event.data.byteLength + ' bytes)');
            setStatus('🔊 Réception audio...', true);
          }
          if (chunksReceived % 50 === 0) {
            setStatus(`🔊 Audio (${chunksReceived} chunks)`, true);
          }
          enqueueChunk(event.data);
          if (!animationId) {
            updateVisualizer();
          }
        } else if (event.data instanceof Blob) {
          chunksReceived++;
          const arrayBuffer = await event.data.arrayBuffer();
          enqueueChunk(arrayBuffer);
        } else if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data);
            log('Server message: ' + msg.type);
            if (msg.type === 'sender-connected') {
              setStatus('✅ Émetteur connecté!', true);
              log('PC sender is now connected');
            } else if (msg.type === 'sender-disconnected') {
              setStatus('⚠️ Émetteur déconnecté', true);
              log('PC sender disconnected');
            } else if (msg.type === 'ping') {
              ws.send(JSON.stringify({ type: 'pong' }));
            }
          } catch (e) {}
        }
      };

      ws.onerror = () => {
        log('WebSocket error!');
        showError('❌ Erreur WebSocket');
        setStatus('❌ Erreur', false);
        isConnecting = false;
      };

      ws.onclose = (event) => {
        log('WebSocket closed: ' + event.code);
        setStatus('❌ Déconnecté', false);
        connectBtn.style.display = 'block';
        disconnectBtn.classList.remove('active');
        serialInput.disabled = false;
        ws = null;
        isConnecting = false;
      };

    } catch (error) {
      showError('❌ Erreur: ' + error.message);
      log('Connection error: ' + error.message);
      isConnecting = false;
    }
  }

  function disconnect() {
    log('Disconnecting...');
    stopUplink();
    if (ws) {
      ws.close();
      ws = null;
    }
    isConnecting = false;
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      audioContext = null;
    }
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    chunksReceived = 0;
    isContextReady = false;
    setStatus('❌ Déconnecté', false);
    connectBtn.style.display = 'block';
    disconnectBtn.classList.remove('active');
    serialInput.disabled = false;
  }

  function updateVisualizer() {
    if (!analyser) {
      animationId = null;
      return;
    }
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    const bars = visualizer.querySelectorAll('div');
    for (let i = 0; i < bars.length; i++) {
      const idx = Math.floor((i / bars.length) * dataArray.length);
      let height = (dataArray[idx] / 255) * 100;
      if (chunksReceived > 0 && height < 5) {
        height = 5 + Math.random() * 10;
      }
      bars[i].style.height = Math.max(4, height) + '%';
    }
    animationId = requestAnimationFrame(updateVisualizer);
  }

  async function handleUserInteraction() {
    log('User interaction detected');
    if (audioContext && audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
        log('AudioContext resumed by user!');
        setStatus('🔊 Audio activé!', true);
      } catch (e) {
        log('Resume failed: ' + e.message);
      }
    }
  }

  document.body.addEventListener('click', handleUserInteraction);
  document.body.addEventListener('touchstart', handleUserInteraction);
  document.body.addEventListener('touchend', handleUserInteraction);

  connectBtn.addEventListener('click', connect);
  disconnectBtn.addEventListener('click', disconnect);

  const autoSerial = urlParams.get('serial');
  const autoName = urlParams.get('name');
  const autoConnect = urlParams.get('autoconnect');

  if (autoName) {
    deviceLabel.textContent = `Casque : ${autoName}`;
  }

  if (autoSerial) {
    serialInput.value = autoSerial;
    log('Serial from URL: ' + autoSerial);
    if (!autoName) {
      deviceLabel.textContent = `Casque : ${autoSerial}`;
    }
    if (autoConnect === 'true') {
      pendingAutoConnect = true;
      log('Auto-connect armé : touchez l\'écran pour démarrer l\'audio');
      setTimeout(() => {
        if (pendingAutoConnect && !hasUserGesture) {
          log('En attente d\'un geste utilisateur pour démarrer l\'audio...');
        }
      }, 800);
    }
  }

  const savedSerial = localStorage.getItem('vhr_receiver_serial');
  if (savedSerial && !autoSerial) {
    serialInput.value = savedSerial;
  }

  serialInput.addEventListener('change', () => {
    localStorage.setItem('vhr_receiver_serial', serialInput.value);
  });

  log('Audio Receiver ready!');
  log('Touchez l\'écran après connexion pour activer le son');
})();
