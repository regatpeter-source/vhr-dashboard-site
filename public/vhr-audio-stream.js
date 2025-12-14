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
    
    // Audio context for advanced processing
    this.audioContext = null;
    this.analyser = null;
    this.micGain = null;
    this.compressor = null;
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
      
      // Stop all tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Close peer connection
      if (this.peer) {
        this.peer.close();
        this.peer = null;
      }

      // Close data channel
      if (this.dataChannel) {
        this.dataChannel.close();
        this.dataChannel = null;
      }

      // Close audio context
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }

      // Notify server
      await this._sendSignal({
        type: 'close',
        sessionId: this.sessionId
      });

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
   * Set microphone volume (0.0 to 2.0)
   */
  setMicVolume(volume) {
    if (this.micGain) {
      this.micGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
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
      const response = await fetch(this.config.signalingServer + this.config.signalingPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (localStorage.getItem('vhr_auth_token') || '')
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
