/**
 * User Android TTS App Installer Module
 * Installation pour utilisateurs avec licence (non-admin)
 */

class UserAndroidInstaller {
  constructor(userId) {
    this.userId = userId;
    this.isInstalling = false;
    this.installProgress = 0;
    this.statusLog = [];
    this.canInstall = false;
    this.installationType = null; // 'subscription' ou 'perpetual'
  }

  /**
   * Vérifie si l'utilisateur a le droit d'installer
   */
  async checkInstallPermission() {
    try {
      const response = await fetch('/api/installer/check-permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId })
      });

      const data = await response.json();
      
      if (data.ok) {
        this.canInstall = true;
        this.installationType = data.installationType; // 'subscription' ou 'perpetual'
        return true;
      } else {
        this.canInstall = false;
        console.warn('[Installer] Permission denied:', data.error);
        return false;
      }
    } catch (e) {
      console.error('[Installer] Permission check error:', e);
      return false;
    }
  }

  /**
   * Initialise l'interface d'installation pour utilisateur
   */
  initializeUI() {
    const container = document.getElementById('userInstallerContainer');
    if (!container) return;

    // Si pas de permission, afficher un message
    if (!this.canInstall) {
      container.innerHTML = `
        <div class="installer-card">
          <div class="installer-header">
            <h3>📱 Installer l'App Android TTS</h3>
          </div>
          <div class="installer-body">
            <div class="access-denied">
              <p>🔒 Accès restreint</p>
              <p>Vous n'avez pas accès à l'installation. Veuillez:</p>
              <ul>
                <li>Vous abonner à l'offre mensuelle (29€/mois)</li>
                <li>Ou acheter l'accès à vie (499€)</li>
              </ul>
              <a href="/pricing.html" class="btn-primary" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #667eea; color: white; border-radius: 6px; text-decoration: none;">Voir les offres</a>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Afficher l'interface d'installation
    const badgeType = this.installationType === 'perpetual' ? '♾️ Accès Illimité' : '📅 Abonnement Actif';
    
    container.innerHTML = `
      <div class="installer-card">
        <div class="installer-header">
          <h3>📱 Installer l'App Android TTS</h3>
          <p class="installer-subtitle">Compilez et déployez l'app directement sur votre Quest</p>
          <span class="license-badge">${badgeType}</span>
        </div>

        <div class="installer-body">
          <!-- Statut actuel -->
          <div class="status-section">
            <div class="status-badge" id="userInstallerStatus">
              <span class="status-dot idle"></span>
              <span class="status-text">Prêt à installer</span>
            </div>
          </div>

          <!-- Prérequis simplifiés pour l'utilisateur -->
          <div class="requirements-section">
            <h4>📋 Prérequis</h4>
            <div class="requirements-note">
              <p>L'installation automatique nécessite que votre serveur local ait:</p>
              <ul class="requirements-list">
                <li>Java JDK 11 ou supérieur</li>
                <li>Android SDK avec Gradle</li>
                <li>Meta Quest connecté en USB ADB</li>
              </ul>
              <p style="margin-top: 12px; font-size: 0.9em; color: #666;">
                💡 Si vous n'avez pas ces outils installés, <a href="/developer-setup.html" target="_blank">consultez notre guide de configuration</a>
              </p>
            </div>
          </div>

          <!-- Options d'installation -->
          <div class="options-section">
            <h4>⚙️ Options de Build</h4>
            <div class="option-group">
              <label>
                <input type="radio" name="userBuildType" value="debug" checked />
                Debug APK (Rapide, recommandé)
              </label>
              <p class="option-hint">Parfait pour tester et développer</p>
            </div>
            <div class="option-group">
              <label>
                <input type="radio" name="userBuildType" value="release" />
                Release APK (Optimisé)
              </label>
              <p class="option-hint">Pour une production stable</p>
            </div>

            <!-- Sélection de l'appareil -->
            <div class="device-selection" style="margin-top: 20px;">
              <label for="userDeviceSelect">Appareil Meta Quest:</label>
              <select id="userDeviceSelect" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 1em;">
                <option value="">Charger les appareils...</option>
              </select>
              <p class="device-hint" style="margin-top: 8px; font-size: 0.85em; color: #666;">Assurez-vous que votre casque est connecté en ADB</p>
            </div>

            <!-- Options post-installation -->
            <div class="options-flags" style="margin-top: 20px;">
              <label>
                <input type="checkbox" id="userAutoStartCheck" />
                Lancer l'app après installation
              </label>
              <label style="margin-top: 12px;">
                <input type="checkbox" id="userKeepAPKCheck" checked />
                Garder l'APK (pour réinstallation rapide)
              </label>
            </div>
          </div>

          <!-- Barre de progression -->
          <div class="progress-section" id="userProgressSection" style="display: none; margin-top: 24px;">
            <h4>📊 Progression</h4>
            <div class="progress-bar-container">
              <div class="progress-bar">
                <div class="progress-fill" id="userProgressFill" style="width: 0%"></div>
              </div>
              <div class="progress-text">
                <span id="userProgressPercent">0%</span> - <span id="userProgressStep">Initialisation...</span>
              </div>
            </div>

            <!-- Logs de progression -->
            <div class="status-logs" id="userStatusLogs" style="
              background: #f5f5f5;
              border: 1px solid #ddd;
              border-radius: 6px;
              padding: 12px;
              margin-top: 12px;
              max-height: 300px;
              overflow-y: auto;
              font-family: 'Courier New', monospace;
              font-size: 0.85em;
              color: #333;
            "></div>
          </div>

          <!-- Boutons d'action -->
          <div class="action-buttons" style="display: flex; gap: 12px; margin-top: 24px;">
            <button id="userBtnCompile" class="btn-action" style="
              flex: 1;
              padding: 12px;
              background: #667eea;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 1em;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s;
            ">
              🚀 Compiler l'APK
            </button>
            <button id="userBtnInstall" class="btn-action" style="
              flex: 1;
              padding: 12px;
              background: #4caf50;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 1em;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s;
              opacity: 0.5;
              cursor: not-allowed;
            " disabled>
              📲 Installer sur Quest
            </button>
          </div>

          <!-- Messages informatifs -->
          <div id="userMessageBox" style="
            margin-top: 20px;
            padding: 12px;
            border-radius: 6px;
            display: none;
          "></div>
        </div>
      </div>
    `;

    // Ajouter les écouteurs d'événements
    this.attachEventListeners();
    
    // Charger les appareils disponibles
    this.loadDevices();
  }

  /**
   * Attache les écouteurs d'événements aux boutons
   */
  attachEventListeners() {
    const btnCompile = document.getElementById('userBtnCompile');
    const btnInstall = document.getElementById('userBtnInstall');
    
    btnCompile.addEventListener('click', () => this.compileAPK());
    btnInstall.addEventListener('click', () => this.installAPK());
  }

  /**
   * Charge la liste des appareils disponibles
   */
  async loadDevices() {
    try {
      const response = await fetch('/api/adb/devices');
      const data = await response.json();
      
      if (data.ok && data.devices.length > 0) {
        const select = document.getElementById('userDeviceSelect');
        select.innerHTML = data.devices.map(d => 
          `<option value="${d.serialNumber}">${d.model || d.serialNumber}</option>`
        ).join('');
      } else {
        const select = document.getElementById('userDeviceSelect');
        select.innerHTML = '<option value="">Aucun appareil détecté</option>';
      }
    } catch (e) {
      console.error('[Installer] Device load error:', e);
    }
  }

  /**
   * Log un message de statut
   */
  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    this.statusLog.push({ message, type, timestamp });
    
    const logsDiv = document.getElementById('userStatusLogs');
    if (logsDiv) {
      const line = document.createElement('div');
      line.style.color = type === 'error' ? '#c62828' : (type === 'success' ? '#2e7d32' : '#333');
      line.textContent = `[${timestamp}] ${message}`;
      logsDiv.appendChild(line);
      logsDiv.scrollTop = logsDiv.scrollHeight;
    }
  }

  /**
   * Met à jour la progression
   */
  updateProgress(percent, step) {
    this.installProgress = percent;
    const fillDiv = document.getElementById('userProgressFill');
    const percentSpan = document.getElementById('userProgressPercent');
    const stepSpan = document.getElementById('userProgressStep');
    
    if (fillDiv) fillDiv.style.width = percent + '%';
    if (percentSpan) percentSpan.textContent = percent + '%';
    if (stepSpan) stepSpan.textContent = step;
  }

  /**
   * Affiche un message à l'utilisateur
   */
  showMessage(message, type = 'info') {
    const msgBox = document.getElementById('userMessageBox');
    if (!msgBox) return;
    
    msgBox.style.display = 'block';
    msgBox.style.background = type === 'error' ? '#ffebee' : (type === 'success' ? '#e8f5e9' : '#e3f2fd');
    msgBox.style.borderLeft = `4px solid ${type === 'error' ? '#c62828' : (type === 'success' ? '#2e7d32' : '#1976d2')}`;
    msgBox.style.color = type === 'error' ? '#c62828' : (type === 'success' ? '#2e7d32' : '#1565c0');
    msgBox.textContent = message;
  }

  /**
   * Compile l'APK
   */
  async compileAPK() {
    if (this.isInstalling) return;
    
    this.isInstalling = true;
    const progressSection = document.getElementById('userProgressSection');
    const btnCompile = document.getElementById('userBtnCompile');
    const btnInstall = document.getElementById('userBtnInstall');
    
    btnCompile.disabled = true;
    btnCompile.style.opacity = '0.5';
    
    if (progressSection) progressSection.style.display = 'block';
    
    const buildType = document.querySelector('input[name="userBuildType"]:checked').value;
    
    this.log(`Démarrage de la compilation (${buildType})...`);
    this.updateProgress(5, 'Initialisation...');
    this.showMessage('Compilation en cours... La première compilation peut prendre 5-15 minutes.', 'info');

    try {
      const response = await fetch('/api/android/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildType })
      });

      const data = await response.json();

      if (data.ok) {
        this.updateProgress(100, 'Compilation terminée!');
        this.log(`✅ APK compilé avec succès (${data.size}MB)`, 'success');
        this.showMessage(`APK compilé avec succès! (${data.size}MB, ${data.duration}s)`, 'success');
        
        // Activer le bouton d'installation
        this.apkPath = data.apkPath;
        btnInstall.disabled = false;
        btnInstall.style.opacity = '1';
        btnInstall.style.cursor = 'pointer';
      } else {
        this.updateProgress(0, 'Erreur');
        this.log(`❌ Erreur: ${data.error}`, 'error');
        this.showMessage(`Erreur de compilation: ${data.error}`, 'error');
      }
    } catch (e) {
      this.updateProgress(0, 'Erreur');
      this.log(`❌ Erreur réseau: ${e.message}`, 'error');
      this.showMessage(`Erreur: ${e.message}`, 'error');
    } finally {
      this.isInstalling = false;
      btnCompile.disabled = false;
      btnCompile.style.opacity = '1';
    }
  }

  /**
   * Installe l'APK sur le device
   */
  async installAPK() {
    if (!this.apkPath) {
      this.showMessage('Veuillez d\'abord compiler l\'APK', 'error');
      return;
    }

    if (this.isInstalling) return;
    
    this.isInstalling = true;
    const deviceSelect = document.getElementById('userDeviceSelect');
    const deviceId = deviceSelect.value;
    
    if (!deviceId) {
      this.showMessage('Veuillez sélectionner un appareil', 'error');
      this.isInstalling = false;
      return;
    }

    const progressSection = document.getElementById('userProgressSection');
    const btnInstall = document.getElementById('userBtnInstall');
    
    btnInstall.disabled = true;
    btnInstall.style.opacity = '0.5';
    
    if (progressSection) progressSection.style.display = 'block';
    
    this.log(`Installation sur ${deviceId}...`);
    this.updateProgress(30, 'Installation APK...');
    this.showMessage('Installation en cours...', 'info');

    try {
      const response = await fetch('/api/android/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          apkPath: this.apkPath,
          deviceId: deviceId
        })
      });

      const data = await response.json();

      if (data.ok) {
        this.updateProgress(100, 'Installation terminée!');
        this.log('✅ App installée avec succès!', 'success');
        this.showMessage('App installée avec succès!', 'success');

        // Lancer l'app si cochée
        if (document.getElementById('userAutoStartCheck').checked) {
          this.launchApp(deviceId);
        }
      } else {
        this.updateProgress(0, 'Erreur');
        this.log(`❌ Erreur: ${data.error}`, 'error');
        this.showMessage(`Erreur d'installation: ${data.error}`, 'error');
      }
    } catch (e) {
      this.updateProgress(0, 'Erreur');
      this.log(`❌ Erreur réseau: ${e.message}`, 'error');
      this.showMessage(`Erreur: ${e.message}`, 'error');
    } finally {
      this.isInstalling = false;
      btnInstall.disabled = false;
      btnInstall.style.opacity = '1';
    }
  }

  /**
   * Lance l'app sur le device
   */
  async launchApp(deviceId) {
    this.log('Lancement de l\'app...');
    
    try {
      const response = await fetch('/api/android/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });

      const data = await response.json();
      if (data.ok) {
        this.log('✅ App lancée!', 'success');
      } else {
        this.log(`⚠️ Impossible de lancer l'app: ${data.error}`, 'error');
      }
    } catch (e) {
      this.log(`⚠️ Erreur lors du lancement: ${e.message}`, 'error');
    }
  }
}

// Initialisation globale
window.UserAndroidInstaller = UserAndroidInstaller;
