/**
 * VHR AUDIO STREAM - WebRTC Audio Bidirectional Module
 * Native audio streaming PC <-> Meta Quest without external apps
 * No dependencies - uses native Web Audio API and RTCPeerConnection
 */

class VHRAudioStream {
  constructor(config = {}) {
    this.config = {
      signalingServer: config.signalingServer || window.location.origin,
      signalingPath: '/api/audio/signal',
      relayBase: config.relayBase || window.location.origin,
      iceServers: config.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      audioConstraints: {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 48000 }
        }
      }
    };

    this.peer = null;
    this.localStream = null;
    this.remoteStream = null;
    this.dataChannel = null;
    this.isInitiator = false;
    this.sessionId = null;
    this.targetSerial = null;
    
    // Callbacks
    this.onRemoteAudio = null;
    this.onStateChange = null;
    this.onError = null;
    this.onTalkbackStateChange = null;
    
    // Audio context for advanced processing
    this.audioContext = null;
    this.analyser = null;
    this.micGain = null;
    this.compressor = null;
    this.localMonitorGain = null;  // For controlling local playback volume
    this.isLocalMonitoring = false;  // Local monitoring OFF by default (sound goes to headset)
    this.micSource = null;  // Store reference to mic source

    // Relay audio sender state (for remote relay reliability)
    this.relayWs = null;
    this.mediaRecorder = null;
    this.relayReconnectTimer = null;
    this.relayReconnectDelayMs = 1500;
    this.relayActive = false;
    this.relayConnectInFlight = false;
    this.relayTargetSerial = null;
    this.relayOpts = null;

    // Headset -> PC talkback (micro uplink) receiver state
    this.talkbackWs = null;
    this.talkbackActive = false;
    this.talkbackAudioEl = null;
    this.talkbackMediaSource = null;
    this.talkbackSourceBuffer = null;
    this.talkbackQueue = [];
    this.talkbackMseReady = false;
  }

  /**
   * Initialize audio context and gain nodes
   */
  initAudioContext() {
    if (this.audioContext) return;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContext();
    
    // Mic input gain (control volume)
    this.micGain = this.audioContext.createGain();
    this.micGain.gain.value = 1.0;
    
    // Local monitor gain (control local playback - hear yourself on PC speakers)
    this.localMonitorGain = this.audioContext.createGain();
    this.localMonitorGain.gain.value = this.isLocalMonitoring ? 1.0 : 0.0;
    
    // Compressor for better audio quality
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -50;
    this.compressor.knee.value = 40;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    
    // Analyser for visualization
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
  }

  /**
   * Start audio streaming to headset
   */
  async start(targetSerial) {
    try {
      this.targetSerial = targetSerial;
      this.sessionId = this._generateSessionId();
      this.isInitiator = true;

      // Initialize audio context
      this.initAudioContext();

      // Get local microphone
      console.log('[VHRAudio] Requesting microphone access...');
      this.localStream = await navigator.mediaDevices.getUserMedia(this.config.audioConstraints);
      console.log('[VHRAudio] Microphone granted, tracks:', this.localStream.getTracks().map(t => t.kind + ':' + t.label).join(', '));
      
      // Connect local mic to audio graph for visualization AND local monitoring
      // Chain: micSource → micGain → compressor → analyser → localMonitorGain → destination
      this.micSource = this.audioContext.createMediaStreamSource(this.localStream);
      this.micSource.connect(this.micGain);
      this.micGain.connect(this.compressor);
      this.compressor.connect(this.analyser);
      // Local monitor: allows hearing yourself on PC speakers (controllable via setLocalMonitoring)
      this.analyser.connect(this.localMonitorGain);
      this.localMonitorGain.connect(this.audioContext.destination);
      
      console.log('[VHRAudio] Local monitoring:', this.isLocalMonitoring ? 'ON' : 'OFF');
      
      // Setup peer connection
      await this._setupPeerConnection();
      
      // Create offer
      const offer = await this.peer.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
        voiceActivityDetection: true
      });
      
      await this.peer.setLocalDescription(offer);
      
      // Send offer to signaling server
      await this._sendSignal({
        type: 'offer',
        offer: offer,
        initiator: true,
        targetSerial: targetSerial
      });

      this._setState('calling');
      this._log('Offer sent, waiting for answer...');
      
      return this.sessionId;
    } catch (error) {
      console.error('[VHRAudio] start() failed:', error);
      if (error && error.name) {
        console.error('[VHRAudio] Error name:', error.name);
      }
      if (error && error.message) {
        console.error('[VHRAudio] Error message:', error.message);
      }
      this._handleError('Failed to start streaming', error);
      throw error;
    }
  }

  /**
   * Stop audio streaming
   */
  async stop() {
    try {
      this._setState('stopped');

      // Stop any relay sender first
      this.stopAudioRelay();
      this.stopTalkbackReceiver();
      
      // Disconnect mic source first to prevent further audio processing
      if (this.micSource) {
        try {
          this.micSource.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
        this.micSource = null;
      }
      
      // Stop all tracks
      if (this.localStream) {
        try {
          this.localStream.getTracks().forEach(track => {
            try { track.stop(); } catch (e) { /* ignore */ }
          });
        } catch (e) {
          // Ignore track stop errors
        }
        this.localStream = null;
      }

      // Close peer connection
      if (this.peer) {
        try {
          this.peer.close();
        } catch (e) {
          // Ignore close errors
        }
        this.peer = null;
      }

      // Close data channel
      if (this.dataChannel) {
        try {
          this.dataChannel.close();
        } catch (e) {
          // Ignore close errors
        }
        this.dataChannel = null;
      }

      // Close audio context (with state check)
      if (this.audioContext) {
        try {
          if (this.audioContext.state !== 'closed') {
            await this.audioContext.close();
          }
        } catch (e) {
          // Ignore close errors
        }
        this.audioContext = null;
      }
      
      // Reset gain nodes
      this.micGain = null;
      this.localMonitorGain = null;
      this.compressor = null;
      this.analyser = null;

      // Notify server (don't await to prevent blocking)
      this._sendSignal({
        type: 'close',
        sessionId: this.sessionId
      }).catch(e => this._log('Signal close error (ignored): ' + e.message));

      this._log('Streaming stopped');
    } catch (error) {
      this._handleError('Error stopping stream', error);
    }
  }

  /**
   * Pause/Resume streaming
   */
  setPaused(paused) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !paused;
      });
    }
    this._setState(paused ? 'paused' : 'connected');
  }

  /**
   * Set local monitoring on/off (hear yourself on PC speakers)
   * Useful for: voice streaming to headset while also hearing on PC
   */
  setLocalMonitoring(enabled) {
    this.isLocalMonitoring = enabled;
    if (this.localMonitorGain && this.audioContext) {
      // Smooth transition to avoid clicks
      this.localMonitorGain.gain.setTargetAtTime(
        enabled ? 1.0 : 0.0, 
        this.audioContext.currentTime, 
        0.05 // 50ms ramp time
      );
      this._log('Local monitoring: ' + (enabled ? 'ON' : 'OFF'));
    }
  }

  /**
   * Set microphone volume (0.0 to 2.0)
   */
  setMicVolume(volume) {
    if (this.micGain) {
      this.micGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    }
  }

  /**
   * Set local monitor volume (0.0 to 1.0)
   */
  setLocalMonitorVolume(volume) {
    if (this.localMonitorGain && this.audioContext) {
      this.localMonitorGain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.05);
    }
  }

  /**
   * Set compressor settings for clarity
   */
  setCompressorSettings(threshold = -50, ratio = 12) {
    if (this.compressor) {
      this.compressor.threshold.setValueAtTime(threshold, this.audioContext.currentTime);
      this.compressor.ratio.setValueAtTime(ratio, this.audioContext.currentTime);
    }
  }

  /**
   * Get audio frequency data for visualization
   */
  getFrequencyData() {
    if (!this.analyser) return null;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  /**
   * Private: Setup WebRTC peer connection
   */
  async _setupPeerConnection() {
    const rtcConfig = {
      iceServers: this.config.iceServers,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };

    this.peer = new RTCPeerConnection(rtcConfig);

    // Handle ICE candidates
    this.peer.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        this._sendSignal({
          type: 'ice-candidate',
          candidate: event.candidate,
          sessionId: this.sessionId
        }).catch(e => this._log('Failed to send ICE candidate: ' + e.message));
      }
    });

    // Handle connection state changes
    this.peer.addEventListener('connectionstatechange', () => {
      const state = this.peer.connectionState;
      this._log('Connection state: ' + state);
      
      if (state === 'connected') {
        this._setState('connected');
      } else if (state === 'failed') {
        this._handleError('Peer connection failed', null);
        this.stop();
      }
    });

    // Handle remote audio stream
    this.peer.addEventListener('track', (event) => {
      this._log('Received remote audio track');
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        
        // Play remote audio
        if (this.audioContext && event.track.kind === 'audio') {
          const source = this.audioContext.createMediaStreamSource(event.streams[0]);
          source.connect(this.audioContext.destination);
        }

        if (this.onRemoteAudio) {
          this.onRemoteAudio(event.streams[0]);
        }
      }
    });

    // Add local audio tracks
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        this.peer.addTrack(track, this.localStream);
      }
    }

    // Setup data channel for metadata
    this._setupDataChannel();
  }

  /**
   * Private: Setup data channel for text/metadata
   */
  _setupDataChannel() {
    // Create data channel if initiator
    if (this.isInitiator) {
      this.dataChannel = this.peer.createDataChannel('metadata', {
        ordered: true
      });
      this._configureDataChannel(this.dataChannel);
    }

    // Listen for data channel from remote
    this.peer.addEventListener('datachannel', (event) => {
      this._configureDataChannel(event.channel);
    });
  }

  /**
   * Private: Configure data channel
   */
  _configureDataChannel(channel) {
    this.dataChannel = channel;

    channel.addEventListener('open', () => {
      this._log('Data channel opened');
      this._setState('connected');
    });

    channel.addEventListener('close', () => {
      this._log('Data channel closed');
    });

    channel.addEventListener('message', (event) => {
      this._log('Data message received: ' + event.data);
    });

    channel.addEventListener('error', (error) => {
      this._log('Data channel error: ' + error.message);
    });
  }

  /**
   * Private: Handle remote answer from signaling server
   */
  async _handleAnswer(answer) {
    try {
      await this.peer.setRemoteDescription(new RTCSessionDescription(answer));
      this._log('Remote answer received and set');
    } catch (error) {
      this._handleError('Failed to set remote answer', error);
    }
  }

  /**
   * Private: Handle ICE candidate from remote
   */
  async _handleIceCandidate(candidate) {
    try {
      if (candidate.candidate) {
        await this.peer.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      this._log('Failed to add ICE candidate: ' + error.message);
    }
  }

  /**
   * Private: Send signal to server
   */
  async _sendSignal(data) {
    try {
      const token = this.config.authToken || localStorage.getItem('vhr_auth_token') || '';
      const response = await fetch(this.config.signalingServer + this.config.signalingPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? ('Bearer ' + token) : ''
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Signaling server error: ' + response.statusText);
      }

      return await response.json();
    } catch (error) {
      this._log('Signaling error: ' + error.message);
      throw error;
    }
  }

  /**
   * Start relaying audio via WebSocket to headset receiver
   * Used to send audio to headset over WebSocket (alternative to WebRTC)
   */
  async startAudioRelay(targetSerial, opts = {}) {
    try {
      const format = opts.format === 'ogg' ? 'ogg' : 'webm';
      this._log(`Starting audio relay to ${targetSerial} (format=${format})`);
      
      if (!this.localStream) {
        throw new Error('No local audio stream available');
      }

      const webmMime = 'audio/webm;codecs=opus';
      // Stabilisation: on force WebM/Opus, plus robuste côté Quest et récepteur web
      const chosenMime = webmMime;
      const wsFormat = 'webm';
      this._log('Relay mime type: ' + chosenMime);
      
      this.relayActive = true;
      this.relayTargetSerial = targetSerial;
      this.relayOpts = { ...opts, format: format, wsFormat, chosenMime };
      this._clearRelayReconnect();

      await this._connectAudioRelay();
      this._log('Audio relay started');
      return true;
      
    } catch (error) {
      this._handleError('Failed to start audio relay', error);
      throw error;
    }
  }

  /**
   * Stop audio relay
   */
  stopAudioRelay() {
    try {
      this.relayActive = false;
      this._clearRelayReconnect();
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      if (this.relayWs && this.relayWs.readyState !== WebSocket.CLOSED) {
        this.relayWs.close();
      }
      this.mediaRecorder = null;
      this.relayWs = null;
      this._log('Audio relay stopped');
    } catch (error) {
      this._log('Error stopping audio relay: ' + error.message);
    }
  }

  _clearRelayReconnect() {
    if (this.relayReconnectTimer) {
      clearTimeout(this.relayReconnectTimer);
      this.relayReconnectTimer = null;
    }
  }

  _scheduleRelayReconnect() {
    if (!this.relayActive) return;
    if (this.relayReconnectTimer) return;
    this.relayReconnectTimer = setTimeout(() => {
      this.relayReconnectTimer = null;
      if (this.relayActive) {
        this._connectAudioRelay().catch(err => this._log('Relay reconnect failed: ' + err.message));
      }
    }, this.relayReconnectDelayMs);
  }

  async _connectAudioRelay() {
    if (this.relayConnectInFlight) return false;
    if (!this.localStream) throw new Error('No local audio stream available');
    this.relayConnectInFlight = true;

    try {
      const opts = this.relayOpts || {};
      const targetSerial = this.relayTargetSerial;
      const wsFormat = opts.wsFormat || 'webm';
      const chosenMime = opts.chosenMime || 'audio/webm;codecs=opus';

      // Clean previous relay if any
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        try { this.mediaRecorder.stop(); } catch {}
      }
      if (this.relayWs && this.relayWs.readyState !== WebSocket.CLOSED) {
        try { this.relayWs.close(); } catch {}
      }

      const mediaRecorder = new MediaRecorder(this.localStream, {
        mimeType: chosenMime,
        audioBitsPerSecond: 128000
      });

      const relayBase = this.config.relayBase || window.location.origin;
      const relayUrl = new URL(relayBase);
      const wsProtocol = relayUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      let wsUrl = '';
      if (opts.relay === true) {
        const relaySession = String(opts.sessionCode || '').trim().toUpperCase();
        if (!relaySession) {
          throw new Error('sessionCode requis pour le relais audio');
        }
        wsUrl = `${wsProtocol}//${relayUrl.host}/api/relay/audio?session=${encodeURIComponent(relaySession)}&serial=${encodeURIComponent(targetSerial)}&role=sender`;
      } else {
        wsUrl = `${wsProtocol}//${relayUrl.host}/api/audio/stream?serial=${encodeURIComponent(targetSerial)}&mode=sender&format=${wsFormat}`;
      }

      this._log('Connecting relay WebSocket (sender) to ' + wsUrl);
      const relayWs = new WebSocket(wsUrl);
      relayWs.binaryType = 'arraybuffer';

      relayWs.onopen = () => {
        this._log('Relay WebSocket connected, starting recording');
        try {
          mediaRecorder.start(250);
        } catch (e) {
          this._log('MediaRecorder start error: ' + e.message);
          throw e;
        }
      };

      mediaRecorder.ondataavailable = (event) => {
        const size = event.data?.size || 0;
        if (size < 100) return;
        if (relayWs.readyState === WebSocket.OPEN) {
          console.log('[VHR-AudioRelay] Sending chunk:', size, 'bytes');
          relayWs.send(event.data);
        } else {
          console.warn('[VHR-AudioRelay] Chunk not sent: ws not open');
        }
      };

      mediaRecorder.onerror = (event) => {
        this._log('MediaRecorder error: ' + event.error);
      };

      relayWs.onerror = (error) => {
        this._log('Relay WebSocket error: ' + (error?.message || ''));
        try { mediaRecorder.stop(); } catch {}
        this._scheduleRelayReconnect();
      };

      relayWs.onclose = () => {
        this._log('Relay WebSocket closed');
        try { mediaRecorder.stop(); } catch {}
        this._scheduleRelayReconnect();
      };

      this.relayWs = relayWs;
      this.mediaRecorder = mediaRecorder;
      return true;
    } finally {
      this.relayConnectInFlight = false;
    }
  }

  /**
   * Start listening to headset microphone uplink (headset -> PC)
   */
  async startTalkbackReceiver(targetSerial, opts = {}) {
    try {
      if (!targetSerial) throw new Error('targetSerial requis pour talkback');

      if (this.talkbackWs && this.talkbackWs.readyState === WebSocket.OPEN && this.relayTargetSerial === targetSerial) {
        return true;
      }

      this.stopTalkbackReceiver();
      this._ensureTalkbackAudioElement();
      this._initTalkbackMediaSource();

      const relayBase = this.config.relayBase || window.location.origin;
      const relayUrl = new URL(relayBase);
      const wsProtocol = relayUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      let wsUrl = '';
      if (opts.relay === true) {
        const relaySession = String(opts.sessionCode || '').trim().toUpperCase();
        if (!relaySession) {
          throw new Error('sessionCode requis pour talkback relay');
        }
        wsUrl = `${wsProtocol}//${relayUrl.host}/api/relay/audio?session=${encodeURIComponent(relaySession)}&serial=${encodeURIComponent(targetSerial)}&role=uplink-viewer`;
      } else {
        wsUrl = `${wsProtocol}//${relayUrl.host}/api/audio/stream?serial=${encodeURIComponent(targetSerial)}&mode=uplink-receiver&format=webm`;
      }

      this._log('Connecting talkback receiver to ' + wsUrl);
      this._setTalkbackState('connecting', 'Connexion...');
      this.talkbackWs = new WebSocket(wsUrl);
      this.talkbackWs.binaryType = 'arraybuffer';
      this.talkbackActive = true;

      this.talkbackWs.onopen = () => {
        this._log('Talkback receiver connected');
        this._setTalkbackState('ready', 'Prêt');
      };

      this.talkbackWs.onmessage = async (event) => {
        if (event.data instanceof ArrayBuffer) {
          this._enqueueTalkbackBlob(new Blob([event.data], { type: 'audio/webm;codecs=opus' }));
        } else if (event.data instanceof Blob) {
          this._enqueueTalkbackBlob(event.data);
        } else if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'uplink-sender-connected') {
              this._log('Talkback sender connected (headset mic active)');
              this._setTalkbackState('active', 'ON');
            } else if (msg.type === 'uplink-sender-disconnected') {
              this._log('Talkback sender disconnected');
              this._setTalkbackState('ready', 'Prêt');
            }
          } catch (e) {
            // ignore non-JSON control messages
          }
        }
      };

      this.talkbackWs.onerror = (error) => {
        this._log('Talkback WebSocket error: ' + (error?.message || ''));
        this._setTalkbackState('error', 'Erreur');
      };

      this.talkbackWs.onclose = () => {
        this._log('Talkback receiver closed');
        this.talkbackWs = null;
        this.talkbackActive = false;
        this._setTalkbackState('off', 'OFF');
      };

      return true;
    } catch (error) {
      this._setTalkbackState('error', 'Erreur');
      this._handleError('Failed to start talkback receiver', error);
      throw error;
    }
  }

  stopTalkbackReceiver() {
    try {
      this.talkbackActive = false;
      if (this.talkbackWs && this.talkbackWs.readyState !== WebSocket.CLOSED) {
        this.talkbackWs.close();
      }
      this.talkbackWs = null;
      this.talkbackQueue = [];
      this.talkbackMseReady = false;
      if (this.talkbackSourceBuffer) {
        try { this.talkbackSourceBuffer.removeEventListener('updateend', this._boundFlushTalkbackQueue); } catch {}
      }
      this.talkbackSourceBuffer = null;
      this.talkbackMediaSource = null;
      this._setTalkbackState('off', 'OFF');
    } catch (e) {
      this._log('Error stopping talkback receiver: ' + e.message);
    }
  }

  _ensureTalkbackAudioElement() {
    if (this.talkbackAudioEl) return;
    const el = document.createElement('audio');
    el.autoplay = true;
    el.controls = false;
    el.muted = false;
    el.style.display = 'none';
    document.body.appendChild(el);
    this.talkbackAudioEl = el;
  }

  _initTalkbackMediaSource() {
    if (!this.talkbackAudioEl) return;
    if (this.talkbackMediaSource) return;
    if (typeof MediaSource === 'undefined' || !MediaSource.isTypeSupported('audio/webm;codecs=opus')) {
      this._log('Talkback MSE unsupported on this browser');
      return;
    }

    this.talkbackMediaSource = new MediaSource();
    this.talkbackAudioEl.src = URL.createObjectURL(this.talkbackMediaSource);
    this.talkbackAudioEl.play().catch(() => {});

    this._boundFlushTalkbackQueue = this._boundFlushTalkbackQueue || (() => this._flushTalkbackQueue());

    this.talkbackMediaSource.addEventListener('sourceopen', () => {
      try {
        this.talkbackSourceBuffer = this.talkbackMediaSource.addSourceBuffer('audio/webm;codecs=opus');
        this.talkbackSourceBuffer.mode = 'sequence';
        this.talkbackSourceBuffer.addEventListener('updateend', this._boundFlushTalkbackQueue);
        this.talkbackMseReady = true;
        this._flushTalkbackQueue();
      } catch (e) {
        this._log('Talkback MSE init error: ' + e.message);
      }
    });
  }

  _enqueueTalkbackBlob(blob) {
    if (!blob || blob.size < 80) return;
    if (!this.talkbackMediaSource) this._initTalkbackMediaSource();
    this.talkbackQueue.push(blob);
    this._flushTalkbackQueue();
  }

  _flushTalkbackQueue() {
    if (!this.talkbackMseReady || !this.talkbackSourceBuffer) return;
    if (this.talkbackSourceBuffer.updating) return;
    const next = this.talkbackQueue.shift();
    if (!next) return;

    next.arrayBuffer().then((buf) => {
      try {
        this.talkbackSourceBuffer.appendBuffer(buf);
        if (this.talkbackAudioEl && this.talkbackAudioEl.paused) {
          this.talkbackAudioEl.play().catch(() => {});
        }
      } catch (e) {
        this._log('Talkback append error: ' + e.message);
      }
    }).catch((e) => this._log('Talkback blob error: ' + e.message));
  }

  /**
   * Private: Generate unique session ID
   */
  _generateSessionId() {
    return 'vhr_audio_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Private: Change state and call callback
   */
  _setState(newState) {
    if (this.onStateChange) {
      this.onStateChange(newState);
    }
  }

  _setTalkbackState(state, label = '') {
    if (this.onTalkbackStateChange) {
      this.onTalkbackStateChange({ state, label });
    }
  }

  /**
   * Private: Handle errors
   */
  _handleError(message, error) {
    const errorMsg = message + (error ? ': ' + error.message : '');
    this._log('ERROR: ' + errorMsg);
    if (this.onError) {
      this.onError(errorMsg);
    }
  }

  /**
   * Private: Logging
   */
  _log(message) {
    console.log('[VHRAudioStream] ' + message);
  }
}

// Export for global use
window.VHRAudioStream = VHRAudioStream;
