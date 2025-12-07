/**
 * VHR Dashboard - Module Voix/TTS
 * Permet d'envoyer des messages vocaux aux casques VR
 */

// Configuration
const TTS_CONFIG = {
  apiEndpoint: '/api/tts/send',
  defaultLanguage: 'fr-FR',
  maxMessageLength: 500,
  timeout: 5000
};

// État global
let ttsState = {
  isConnected: false,
  activeDevices: [],
  messageHistory: [],
  isSpeaking: false
};

/**
 * Initialiser le module TTS
 * Doit être appelé au démarrage du dashboard
 */
async function initializeTTS() {
  console.log('[TTS] Initialisation du module voix');
  
  try {
    // Charger les appareils disponibles
    await loadConnectedDevices();
    
    // Créer l'interface TTS dans le dashboard
    createTTSUI();
    
    ttsState.isConnected = true;
    console.log('✅ [TTS] Module initialisé avec succès');
  } catch (e) {
    console.error('❌ [TTS] Erreur lors de l\'initialisation:', e);
  }
}

/**
 * Charger les casques VR connectés
 */
async function loadConnectedDevices() {
  try {
    const response = await fetch('/api/devices');
    const data = await response.json();
    
    if (data.ok && Array.isArray(data.devices)) {
      ttsState.activeDevices = data.devices.filter(d => d.status === 'device');
      console.log(`📱 [TTS] ${ttsState.activeDevices.length} appareil(s) connecté(s)`);
      return ttsState.activeDevices;
    }
  } catch (e) {
    console.warn('[TTS] Erreur lors du chargement des appareils:', e);
  }
  return [];
}

/**
 * Envoyer un message vocal à un casque
 * @param {string} serial - Numéro de série du casque (ex: "192.168.1.28:5555")
 * @param {string} text - Texte à convertir en parole
 * @returns {Promise<Object>} Réponse du serveur
 */
async function sendVoiceMessage(serial, text) {
  
  // Validation
  if (!serial || !text) {
    throw new Error('Serial et text sont requis');
  }
  
  if (text.length > TTS_CONFIG.maxMessageLength) {
    throw new Error(`Texte trop long (max ${TTS_CONFIG.maxMessageLength} caractères)`);
  }
  
  if (text.trim().length === 0) {
    throw new Error('Le texte ne peut pas être vide');
  }
  
  console.log(`[TTS] Envoi du message au casque ${serial}: "${text}"`);
  
  try {
    const response = await fetch(TTS_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        serial,
        text
      }),
      signal: AbortSignal.timeout(TTS_CONFIG.timeout)
    });
    
    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ [TTS] Message vocal envoyé avec succès');
      
      // Enregistrer dans l'historique
      ttsState.messageHistory.push({
        serial,
        text,
        timestamp: new Date(),
        status: 'sent'
      });
      
      return data;
    } else {
      throw new Error(data.error || 'Erreur inconnue');
    }
    
  } catch (e) {
    console.error('❌ [TTS] Erreur lors de l\'envoi:', e);
    throw e;
  }
}

/**
 * Envoyer le même message à tous les casques connectés
 * @param {string} text - Texte à envoyer
 */
async function broadcastVoiceMessage(text) {
  console.log('[TTS] Broadcast: envoi à tous les appareils');
  
  const results = [];
  
  for (const device of ttsState.activeDevices) {
    try {
      const result = await sendVoiceMessage(device.serial, text);
      results.push({ device: device.name, success: true, result });
    } catch (e) {
      results.push({ device: device.name, success: false, error: e.message });
    }
  }
  
  console.log('[TTS] Résultats du broadcast:', results);
  return results;
}

/**
 * Prononcer un texte directement avec la TTS du navigateur (si supportée)
 * Utile pour les tests sans casque
 * @param {string} text - Texte à prononcer
 */
function speakInBrowser(text) {
  if (!('speechSynthesis' in window)) {
    console.warn('❌ [TTS] Web Speech API non supportée');
    return;
  }
  
  // Annuler les paroles précédentes
  speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.language = TTS_CONFIG.defaultLanguage;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  utterance.onstart = () => {
    console.log('🔊 [TTS] Début de la parole');
    ttsState.isSpeaking = true;
  };
  
  utterance.onend = () => {
    console.log('✅ [TTS] Fin de la parole');
    ttsState.isSpeaking = false;
  };
  
  utterance.onerror = (e) => {
    console.error('❌ [TTS] Erreur de parole:', e.error);
  };
  
  speechSynthesis.speak(utterance);
}

/**
 * Créer l'interface TTS dans le dashboard
 */
function createTTSUI() {
  const dashboardContainer = document.getElementById('dashboard-container');
  if (!dashboardContainer) return;
  
  const ttsPanel = document.createElement('div');
  ttsPanel.id = 'tts-panel';
  ttsPanel.className = 'tts-panel';
  ttsPanel.innerHTML = `
    <div class="tts-container">
      <h3>🎙️ Envoyeur de Voix</h3>
      
      <div class="tts-device-selector">
        <label for="tts-device-select">Appareil:</label>
        <select id="tts-device-select" class="tts-select">
          <option value="">-- Sélectionner un appareil --</option>
          <option value="*">📢 Tous les appareils</option>
        </select>
      </div>
      
      <div class="tts-input-group">
        <textarea
          id="tts-message-input"
          class="tts-textarea"
          placeholder="Entrez le message à prononcer sur le casque..."
          maxlength="500"
          rows="3"
        ></textarea>
        <div class="tts-char-count">
          <span id="tts-char-count">0</span>/500
        </div>
      </div>
      
      <div class="tts-button-group">
        <button id="tts-send-btn" class="tts-btn tts-btn-primary" onclick="handleSendVoiceMessage()">
          📤 Envoyer au casque
        </button>
        <button id="tts-browser-btn" class="tts-btn tts-btn-secondary" onclick="handleBrowserSpeak()">
          🔊 Test (Navigateur)
        </button>
      </div>
      
      <div id="tts-status" class="tts-status"></div>
      
      <!-- Historique -->
      <div class="tts-history">
        <h4>📋 Historique</h4>
        <ul id="tts-history-list" class="tts-history-list"></ul>
      </div>
    </div>
  `;
  
  // Ajouter le CSS
  if (!document.getElementById('tts-styles')) {
    const style = document.createElement('style');
    style.id = 'tts-styles';
    style.textContent = `
      .tts-panel {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 10px;
        padding: 20px;
        margin: 20px;
        color: white;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      }
      
      .tts-container h3 {
        margin: 0 0 15px 0;
        font-size: 18px;
        font-weight: bold;
      }
      
      .tts-device-selector {
        margin-bottom: 15px;
      }
      
      .tts-device-selector label {
        display: block;
        margin-bottom: 5px;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
      }
      
      .tts-select {
        width: 100%;
        padding: 8px;
        border-radius: 5px;
        border: none;
        font-size: 14px;
        background: white;
        color: #333;
      }
      
      .tts-input-group {
        position: relative;
        margin-bottom: 15px;
      }
      
      .tts-textarea {
        width: 100%;
        padding: 10px;
        border-radius: 5px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        font-size: 14px;
        font-family: inherit;
        resize: none;
        background: rgba(255, 255, 255, 0.95);
        color: #333;
      }
      
      .tts-textarea:focus {
        outline: none;
        border-color: white;
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
      }
      
      .tts-char-count {
        position: absolute;
        right: 8px;
        bottom: 8px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        pointer-events: none;
      }
      
      .tts-button-group {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
      }
      
      .tts-btn {
        flex: 1;
        padding: 10px 15px;
        border: none;
        border-radius: 5px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .tts-btn-primary {
        background: white;
        color: #667eea;
      }
      
      .tts-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .tts-btn-secondary {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 2px solid white;
      }
      
      .tts-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .tts-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .tts-status {
        min-height: 30px;
        padding: 8px;
        border-radius: 5px;
        background: rgba(255, 255, 255, 0.1);
        font-size: 13px;
        margin-bottom: 15px;
        display: none;
      }
      
      .tts-status.show {
        display: block;
      }
      
      .tts-status.success {
        background: rgba(76, 175, 80, 0.3);
        color: #c8e6c9;
      }
      
      .tts-status.error {
        background: rgba(244, 67, 54, 0.3);
        color: #ffcdd2;
      }
      
      .tts-history {
        margin-top: 15px;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        padding-top: 10px;
      }
      
      .tts-history h4 {
        margin: 0 0 10px 0;
        font-size: 14px;
      }
      
      .tts-history-list {
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: 150px;
        overflow-y: auto;
      }
      
      .tts-history-item {
        padding: 8px;
        margin: 5px 0;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        font-size: 12px;
        border-left: 3px solid rgba(255, 255, 255, 0.5);
      }
      
      .tts-history-item.sent {
        border-left-color: #4caf50;
      }
      
      .tts-history-item.error {
        border-left-color: #f44336;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Ajouter au dashboard (chercher un bon endroit)
  const mainContent = document.querySelector('.main-content') || dashboardContainer;
  mainContent.appendChild(ttsPanel);
  
  // Mettre à jour la liste des appareils
  updateDeviceSelect();
  
  // Gérer le compteur de caractères
  const textarea = document.getElementById('tts-message-input');
  textarea.addEventListener('input', () => {
    document.getElementById('tts-char-count').textContent = textarea.value.length;
  });
}

/**
 * Mettre à jour la liste des appareils disponibles
 */
function updateDeviceSelect() {
  const select = document.getElementById('tts-device-select');
  if (!select) return;
  
  // Garder les options existantes
  const options = Array.from(select.querySelectorAll('option')).slice(0, 2);
  
  // Ajouter les nouveaux appareils
  for (const device of ttsState.activeDevices) {
    const option = document.createElement('option');
    option.value = device.serial;
    option.textContent = `📱 ${device.name} (${device.model})`;
    options.push(option);
  }
  
  select.innerHTML = '';
  options.forEach(opt => select.appendChild(opt));
}

/**
 * Gestionnaire pour envoyer le message vocal
 */
async function handleSendVoiceMessage() {
  const textInput = document.getElementById('tts-message-input');
  const deviceSelect = document.getElementById('tts-device-select');
  const statusDiv = document.getElementById('tts-status');
  const sendBtn = document.getElementById('tts-send-btn');
  
  const text = textInput.value.trim();
  const deviceValue = deviceSelect.value;
  
  if (!text) {
    showStatus('Veuillez entrer un message', 'error');
    return;
  }
  
  if (!deviceValue) {
    showStatus('Sélectionnez un appareil', 'error');
    return;
  }
  
  // Désactiver le bouton pendant l'envoi
  sendBtn.disabled = true;
  showStatus('⏳ Envoi du message...', 'info');
  
  try {
    if (deviceValue === '*') {
      // Broadcast à tous les appareils
      await broadcastVoiceMessage(text);
    } else {
      // Envoi à un appareil spécifique
      await sendVoiceMessage(deviceValue, text);
    }
    
    showStatus('✅ Message envoyé avec succès!', 'success');
    textInput.value = '';
    document.getElementById('tts-char-count').textContent = '0';
    addToHistory(text, 'sent');
    
  } catch (e) {
    showStatus(`❌ Erreur: ${e.message}`, 'error');
    addToHistory(text, 'error', e.message);
  } finally {
    sendBtn.disabled = false;
  }
}

/**
 * Gestionnaire pour tester avec le navigateur
 */
function handleBrowserSpeak() {
  const textInput = document.getElementById('tts-message-input');
  const text = textInput.value.trim();
  
  if (!text) {
    showStatus('Veuillez entrer un message', 'error');
    return;
  }
  
  speakInBrowser(text);
  showStatus('🔊 Lecture en cours...', 'info');
}

/**
 * Afficher un message de statut
 */
function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('tts-status');
  if (!statusDiv) return;
  
  statusDiv.textContent = message;
  statusDiv.className = `tts-status show ${type}`;
  
  if (type !== 'info') {
    setTimeout(() => {
      statusDiv.classList.remove('show');
    }, 3000);
  }
}

/**
 * Ajouter un message à l'historique
 */
function addToHistory(text, status, error = '') {
  const historyList = document.getElementById('tts-history-list');
  if (!historyList) return;
  
  const item = document.createElement('li');
  item.className = `tts-history-item ${status}`;
  
  const timestamp = new Date().toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit'
  });
  
  let icon = '✅';
  if (status === 'error') icon = '❌';
  if (status === 'pending') icon = '⏳';
  
  item.innerHTML = `
    ${icon} <strong>${timestamp}:</strong> "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"
    ${error ? `<br><small>${error}</small>` : ''}
  `;
  
  historyList.insertBefore(item, historyList.firstChild);
  
  // Garder seulement les 10 derniers messages
  while (historyList.children.length > 10) {
    historyList.removeChild(historyList.lastChild);
  }
}

// Exporter pour utilisation globale
window.TTS = {
  init: initializeTTS,
  send: sendVoiceMessage,
  broadcast: broadcastVoiceMessage,
  speak: speakInBrowser,
  state: ttsState
};

// Auto-init quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTTS);
} else {
  initializeTTS();
}
