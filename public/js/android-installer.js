/**
 * Android TTS App Installer Module
 * Compile et déploie l'APK directement depuis le Dashboard
 */

class AndroidInstaller {
  constructor() {
    this.isInstalling = false;
    this.installProgress = 0;
    this.statusLog = [];
  }

  /**
   * Initialise l'interface d'installation
   */
  initializeUI() {
    const container = document.getElementById('androidInstallerContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="installer-card">
        <div class="installer-header">
          <h3>📱 Installer l'App Android TTS</h3>
          <p class="installer-subtitle">Compilez et déployez l'app directement sur votre Quest</p>
        </div>

        <div class="installer-body">
          <!-- Statut actuel -->
          <div class="status-section">
            <div class="status-badge" id="installerStatus">
              <span class="status-dot idle"></span>
              <span class="status-text">Prêt à installer</span>
            </div>
          </div>

          <!-- Checklist des prérequis -->
          <div class="requirements-section">
            <h4>📋 Prérequis</h4>
            <ul class="requirements-list">
              <li>
                <input type="checkbox" id="javaCheck" />
                <label>Java JDK 11+ installé</label>
              </li>
              <li>
                <input type="checkbox" id="androidStudioCheck" />
                <label>Android Studio installé</label>
              </li>
              <li>
                <input type="checkbox" id="adbCheck" />
                <label>ADB disponible (PATH)</label>
              </li>
              <li>
                <input type="checkbox" id="questConnectedCheck" />
                <label>Meta Quest connecté en ADB</label>
              </li>
              <li>
                <input type="checkbox" id="internetCheck" />
                <label>Connexion Internet stable</label>
              </li>
            </ul>
          </div>

          <!-- Options d'installation -->
          <div class="options-section">
            <h4>⚙️ Options</h4>
            <div class="option-group">
              <label>
                <input type="radio" name="buildType" value="debug" checked />
                Debug APK (Rapide, débogage activé)
              </label>
              <p class="option-hint">Recommandé pour tester</p>
            </div>
            <div class="option-group">
              <label>
                <input type="radio" name="buildType" value="release" />
                Release APK (Optimisé, production)
              </label>
              <p class="option-hint">Pour déploiement final</p>
            </div>

            <div class="device-selection">
              <label for="deviceSelect">Sélectionner l'appareil:</label>
              <select id="deviceSelect">
                <option value="">Charger les appareils...</option>
              </select>
            </div>

            <div class="options-flags">
              <label>
                <input type="checkbox" id="autoStartCheck" />
                Lancer l'app après installation
              </label>
              <label>
                <input type="checkbox" id="keepAPKCheck" />
                Garder l'APK après installation
              </label>
            </div>
          </div>

          <!-- Barre de progression -->
          <div class="progress-section" id="progressSection" style="display: none;">
            <h4>📊 Progression</h4>
            <div class="progress-bar-container">
              <div class="progress-bar">
                <div class="progress-fill" id="progressFill" style="width: 0%">
                  <span class="progress-text" id="progressText">0%</span>
                </div>
              </div>
            </div>

            <!-- Étapes -->
            <div class="steps-list">
              <div class="step" id="step-compile">
                <span class="step-icon">⏳</span>
                <span class="step-name">Compilation Gradle</span>
                <span class="step-time"></span>
              </div>
              <div class="step" id="step-adb">
                <span class="step-icon">⏳</span>
                <span class="step-name">Installation ADB</span>
                <span class="step-time"></span>
              </div>
              <div class="step" id="step-launch">
                <span class="step-icon">⏳</span>
                <span class="step-name">Lancement de l'app</span>
                <span class="step-time"></span>
              </div>
            </div>
          </div>

          <!-- Logs en temps réel -->
          <div class="logs-section" id="logsSection" style="display: none;">
            <h4>📝 Logs détaillés</h4>
            <div class="logs-container" id="logsContainer"></div>
          </div>

          <!-- Boutons d'action -->
          <div class="action-buttons">
            <button id="loadDevicesBtn" class="btn btn-secondary">
              🔄 Charger les appareils
            </button>
            <button id="startInstallBtn" class="btn btn-primary" disabled>
              🚀 Démarrer l'installation
            </button>
            <button id="viewLogsBtn" class="btn btn-secondary" style="display: none;">
              📋 Afficher les logs
            </button>
            <button id="cancelBtn" class="btn btn-danger" style="display: none;">
              ❌ Annuler
            </button>
          </div>
        </div>

        <!-- Messages d'aide -->
        <div class="installer-footer">
          <details>
            <summary>❓ Besoin d'aide?</summary>
            <div class="help-content">
              <h5>Erreur: "Android Studio not found"</h5>
              <p>Assurez-vous que Android Studio est installé et ajouté au PATH.</p>

              <h5>Erreur: "ADB not found"</h5>
              <p>Installez Android SDK Platform Tools ou lancez depuis Android Studio.</p>

              <h5>Erreur: "No devices connected"</h5>
              <p>Vérifiez que votre Meta Quest est en mode débogage USB activé.</p>

              <h5>Compilation lente?</h5>
              <p>La première compilation est plus lente (téléchargement des dépendances). C'est normal!</p>

              <h5>Voir la documentation complète:</h5>
              <a href="/QUICK_START_TTS.md" target="_blank">📖 Quick Start Guide</a>
              <a href="/VHR_TTS_RECEIVER_APP.md" target="_blank">📖 Documentation Complète</a>
            </div>
          </details>
        </div>
      </div>
    `;

    // Ajouter les écouteurs d'événements
    this.attachEventListeners();
    this.loadDevices();
  }

  /**
   * Attache les écouteurs d'événements aux boutons
   */
  attachEventListeners() {
    document.getElementById('loadDevicesBtn').addEventListener('click', () => this.loadDevices());
    document.getElementById('startInstallBtn').addEventListener('click', () => this.startInstallation());
    document.getElementById('cancelBtn').addEventListener('click', () => this.cancelInstallation());
    document.getElementById('viewLogsBtn').addEventListener('click', () => this.toggleLogs());
  }

  /**
   * Charge la liste des appareils ADB connectés
   */
  async loadDevices() {
    const select = document.getElementById('deviceSelect');
    const btn = document.getElementById('loadDevicesBtn');
    btn.disabled = true;
    btn.textContent = '🔄 Chargement...';

    try {
      const response = await fetch('/api/adb/devices');
      const data = await response.json();

      if (data.ok && data.devices.length > 0) {
        select.innerHTML = data.devices
          .map(d => `<option value="${d.serial}">${d.name || d.serial} (${d.status})</option>`)
          .join('');
        document.getElementById('startInstallBtn').disabled = false;
        this.updateStatus('✅ Appareils trouvés', 'success');
      } else {
        select.innerHTML = '<option value="">❌ Aucun appareil connecté</option>';
        document.getElementById('startInstallBtn').disabled = true;
        this.updateStatus('⚠️ Aucun appareil connecté', 'warning');
      }
    } catch (e) {
      console.error('Erreur lors du chargement des appareils:', e);
      this.updateStatus('❌ Erreur lors du chargement des appareils', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '🔄 Charger les appareils';
    }
  }

  /**
   * Démarre l'installation complète
   */
  async startInstallation() {
    const deviceSerial = document.getElementById('deviceSelect').value;
    if (!deviceSerial) {
      alert('Veuillez sélectionner un appareil');
      return;
    }

    // Vérifier l'accès à la licence AVANT de commencer
    try {
      const accessResponse = await fetch('/api/feature/android-tts/access');
      const accessData = await accessResponse.json();
      
      if (!accessData.hasAccess) {
        // Afficher le modal de licence
        this.showSubscriptionModal(accessData);
        return;
      }
    } catch (e) {
      console.error('Erreur vérification licence:', e);
      alert('Erreur lors de la vérification de l\'abonnement');
      return;
    }

    const buildType = document.querySelector('input[name="buildType"]:checked').value;
    const autoStart = document.getElementById('autoStartCheck').checked;
    const keepAPK = document.getElementById('keepAPKCheck').checked;

    this.isInstalling = true;
    this.statusLog = [];
    this.installProgress = 0;

    // Afficher la progression
    document.getElementById('progressSection').style.display = 'block';
    document.getElementById('logsSection').style.display = 'block';
    document.getElementById('startInstallBtn').disabled = true;
    document.getElementById('loadDevicesBtn').disabled = true;
    document.getElementById('cancelBtn').style.display = 'inline-block';
    document.getElementById('viewLogsBtn').style.display = 'inline-block';

    this.updateStatus('⚙️ Installation en cours...', 'info');

    try {
      // Étape 1: Compiler
      await this.compileAPK(buildType);

      // Étape 2: Installer
      await this.installAPK(deviceSerial, buildType);

      // Étape 3: Lancer (optionnel)
      if (autoStart) {
        await this.launchApp(deviceSerial);
      }

      this.updateStatus('✅ Installation réussie!', 'success');
      this.addLog('🎉 L\'app TTS est maintenant installée sur votre Quest!', 'success');

    } catch (e) {
      console.error('Erreur:', e);
      this.updateStatus('❌ Installation échouée', 'error');
      this.addLog(`❌ Erreur: ${e.message}`, 'error');
    } finally {
      this.isInstalling = false;
      document.getElementById('cancelBtn').style.display = 'none';
      document.getElementById('startInstallBtn').disabled = false;
      document.getElementById('loadDevicesBtn').disabled = false;
    }
  }

  /**
   * Compile l'APK avec Gradle
   */
  async compileAPK(buildType) {
    this.updateStep('compile', 'in-progress');
    this.addLog(`📦 Compilation ${buildType} APK en cours...`, 'info');
    this.addLog(`💡 Vérification de l'environnement (Java, Gradle)...`, 'info');
    this.addLog(`   • Si manquant, installation automatique en cours`, 'info');
    this.addLog(`📥 Première compilation: peut prendre 10-20 minutes`, 'warning');
    this.addLog(`   • Les dépendances Gradle seront téléchargées automatiquement`, 'info');
    this.addLog(`   • Les compilations suivantes seront plus rapides (cache)`, 'info');
    this.addLog(`   • Veuillez patienter...`, 'info');

    const startTime = Date.now();

    try {
      const response = await fetch('/api/android/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildType })
      });

      const data = await response.json();

      if (!data.ok) throw new Error(data.error || 'Erreur de compilation');

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      this.addLog(`✅ APK compilé avec succès (${duration}s)`, 'success');
      this.updateStep('compile', 'complete');
      this.installProgress = 33;
      this.updateProgress();

    } catch (e) {
      this.updateStep('compile', 'error');
      throw new Error(`Compilation échouée: ${e.message}`);
    }
  }

  /**
   * Installe l'APK sur l'appareil
   */
  async installAPK(deviceSerial, buildType) {
    this.updateStep('adb', 'in-progress');
    this.addLog(`📱 Installation sur ${deviceSerial}...`, 'info');

    const startTime = Date.now();

    try {
      const response = await fetch('/api/android/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceSerial, buildType })
      });

      const data = await response.json();

      if (!data.ok) throw new Error(data.error || 'Erreur d\'installation');

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      this.addLog(`✅ APK installé avec succès (${duration}s)`, 'success');
      this.updateStep('adb', 'complete');
      this.installProgress = 66;
      this.updateProgress();

    } catch (e) {
      this.updateStep('adb', 'error');
      throw new Error(`Installation échouée: ${e.message}`);
    }
  }

  /**
   * Lance l'app sur l'appareil
   */
  async launchApp(deviceSerial) {
    this.updateStep('launch', 'in-progress');
    this.addLog(`🚀 Lancement de l'app...`, 'info');

    const startTime = Date.now();

    try {
      const response = await fetch('/api/android/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceSerial })
      });

      const data = await response.json();

      if (!data.ok) throw new Error(data.error || 'Erreur de lancement');

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      this.addLog(`✅ App lancée avec succès (${duration}s)`, 'success');
      this.updateStep('launch', 'complete');
      this.installProgress = 100;
      this.updateProgress();

    } catch (e) {
      this.updateStep('launch', 'error');
      // Ne pas terminer en erreur ici, l'app pourrait s'être lancée quand même
      this.addLog(`⚠️ Lancement: ${e.message}`, 'warning');
      this.installProgress = 100;
      this.updateProgress();
    }
  }

  /**
   * Met à jour le statut général
   */
  updateStatus(text, type) {
    const badge = document.getElementById('installerStatus');
    const statusText = badge.querySelector('.status-text');
    const statusDot = badge.querySelector('.status-dot');

    statusText.textContent = text;
    statusDot.className = `status-dot ${type}`;
  }

  /**
   * Met à jour une étape
   */
  updateStep(stepId, status) {
    const step = document.getElementById(`step-${stepId}`);
    const icon = step.querySelector('.step-icon');
    const classList = step.classList;

    classList.remove('pending', 'in-progress', 'complete', 'error');
    classList.add(status);

    const icons = {
      'pending': '⏳',
      'in-progress': '⚙️',
      'complete': '✅',
      'error': '❌'
    };

    icon.textContent = icons[status];
  }

  /**
   * Met à jour la barre de progression
   */
  updateProgress() {
    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressText');
    fill.style.width = this.installProgress + '%';
    text.textContent = this.installProgress + '%';
  }

  /**
   * Ajoute un log
   */
  addLog(message, type = 'info') {
    this.statusLog.push({ message, type, time: new Date().toLocaleTimeString() });

    const container = document.getElementById('logsContainer');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `
      <span class="log-time">[${new Date().toLocaleTimeString()}]</span>
      <span class="log-message">${this.escapeHtml(message)}</span>
    `;
    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;
  }

  /**
   * Bascule l'affichage des logs
   */
  toggleLogs() {
    const logsSection = document.getElementById('logsSection');
    logsSection.style.display = logsSection.style.display === 'none' ? 'block' : 'none';
  }

  /**
   * Annule l'installation
   */
  cancelInstallation() {
    if (confirm('Êtes-vous sûr de vouloir annuler?')) {
      this.isInstalling = false;
      this.updateStatus('⏸️ Installation annulée', 'warning');
      document.getElementById('progressSection').style.display = 'none';
      document.getElementById('cancelBtn').style.display = 'none';
      document.getElementById('startInstallBtn').disabled = false;
    }
  }

  /**
   * Affiche le modal d'abonnement
   */
  showSubscriptionModal(accessData) {
    // Créer le modal s'il n'existe pas
    let modal = document.getElementById('subscriptionModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'subscriptionModal';
      modal.className = 'modal-subscription';
      document.body.appendChild(modal);
      
      // Ajouter le CSS
      const style = document.createElement('style');
      style.textContent = `
        .modal-subscription {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        .modal-subscription.hidden {
          display: none;
        }
        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 40px;
          max-width: 600px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          text-align: center;
          animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .modal-content h2 {
          font-size: 28px;
          margin: 0 0 10px 0;
          color: #333;
        }
        .modal-subtitle {
          font-size: 16px;
          color: #666;
          margin-bottom: 30px;
          font-weight: 300;
        }
        .feature-box {
          background: #f5f7fa;
          border-radius: 8px;
          padding: 25px;
          margin-bottom: 30px;
          text-align: left;
        }
        .feature-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .feature-list li {
          padding: 10px 0;
          border-bottom: 1px solid #ddd;
          color: #555;
        }
        .feature-list li:last-child {
          border-bottom: none;
        }
        .feature-list li:before {
          content: "✓ ";
          color: #00b86c;
          font-weight: bold;
          margin-right: 10px;
        }
        .pricing-box {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
          padding: 30px;
          margin-bottom: 25px;
        }
        .price {
          font-size: 48px;
          font-weight: bold;
          margin: 0;
        }
        .price-period {
          font-size: 14px;
          opacity: 0.9;
        }
        .price-desc {
          font-size: 14px;
          margin-top: 15px;
          opacity: 0.95;
        }
        .modal-buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
        }
        .btn-subscribe {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 14px 32px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .btn-subscribe:hover {
          transform: scale(1.05);
        }
        .btn-close {
          background: #f0f0f0;
          color: #333;
          border: none;
          padding: 14px 32px;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-close:hover {
          background: #e0e0e0;
        }
      `;
      document.head.appendChild(style);
    }

    // Remplir le contenu du modal
    modal.innerHTML = `
      <div class="modal-content">
        <h2>🎧 VOIX VERS CASQUE</h2>
        <p class="modal-subtitle">Streaming Audio Immersif pour Meta Quest</p>
        
        <div class="feature-box">
          <h3 style="margin-top: 0; text-align: center;">✨ Avantages</h3>
          <ul class="feature-list">
            <li>Son immersif en temps réel (latence &lt;50ms)</li>
            <li>Intégration totale avec vos apps VR</li>
            <li>Qualité audio optimisée 24-bit/48kHz</li>
            <li>Contrôle depuis le dashboard</li>
            <li>Compatible Quest 3 & Quest Pro</li>
          </ul>
        </div>

        <div class="pricing-box">
          <p class="price">29€</p>
          <p class="price-period">par mois</p>
          <p class="price-desc">Accès complet à tous les outils VHR Dashboard</p>
        </div>

        <div class="modal-buttons">
          <button class="btn-subscribe" onclick="window.location.href='/pricing'">S'abonner maintenant</button>
          <button class="btn-close" onclick="document.getElementById('subscriptionModal').classList.add('hidden')">Fermer</button>
        </div>
      </div>
    `;
    
    modal.classList.remove('hidden');
  }

  /**
   * Échappe les caractères HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
  // Vérifier si le conteneur existe
  const container = document.getElementById('androidInstallerContainer');
  if (!container) return;

  const installer = new AndroidInstaller();
  installer.initializeUI();
  window.androidInstaller = installer;
});
