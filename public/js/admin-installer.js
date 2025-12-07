/**
 * Admin Android TTS App Installer Module
 * Compilation et déploiement complets (admin dashboard)
 */

class AdminAndroidInstaller {
  constructor() {
    this.isInstalling = false;
    this.installProgress = 0;
    this.statusLog = [];
    this.apkPath = null;
  }

  /**
   * Initialise l'interface d'installation pour admin
   */
  initializeUI() {
    const container = document.getElementById('adminInstallerContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="installer-card">
        <div class="installer-header">
          <h3>📱 Système de Compilation et Installation</h3>
          <p class="installer-subtitle">Compilation Android + Déploiement sur Quest</p>
        </div>

        <div class="installer-body">
          <!-- Statut actuel -->
          <div class="status-section">
            <div class="status-badge" id="adminInstallerStatus">
              <span class="status-dot idle"></span>
              <span class="status-text">Prêt à compiler</span>
            </div>
          </div>

          <!-- Options de compilation -->
          <div class="options-section">
            <h4>⚙️ Options de Build</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
              <!-- Colonne gauche: Options de build -->
              <div>
                <h5 style="color: #667eea; margin-bottom: 16px; font-size: 16px;">🔨 Type de Build</h5>
                <div class="option-group">
                  <label>
                    <input type="radio" name="adminBuildType" value="debug" checked />
                    Debug APK (Rapide)
                  </label>
                  <p class="option-hint">Pour développement et tests</p>
                </div>
                <div class="option-group">
                  <label>
                    <input type="radio" name="adminBuildType" value="release" />
                    Release APK (Optimisé)
                  </label>
                  <p class="option-hint">Pour déploiement production</p>
                </div>
              </div>

              <!-- Colonne droite: Configuration -->
              <div>
                <h5 style="color: #667eea; margin-bottom: 16px; font-size: 16px;">🎯 Configuration</h5>
                <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; color: #333;">
                  <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                    <span>Gradle:</span>
                    <span style="font-weight: bold;">v8.7</span>
                  </div>
                  <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                    <span>Java:</span>
                    <span style="font-weight: bold;">JDK 11+</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span>Min SDK:</span>
                    <span style="font-weight: bold;">API 24</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Sélection des appareils -->
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
              <h5 style="color: #667eea; margin-bottom: 16px; font-size: 16px;">📱 Appareils connectés</h5>
              <div id="adminDevicesList" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
                <div style="padding: 12px; background: #e3f2fd; border-radius: 6px; color: #1565c0; text-align: center;">
                  <p>Charger les appareils...</p>
                </div>
              </div>
              <p style="margin-top: 12px; font-size: 0.9em; color: #666;">
                💡 Assurez-vous que vos casques sont connectés via ADB (USB ou WiFi)
              </p>
            </div>

            <!-- Options avancées -->
            <div style="background: #f5f7fa; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
              <h5 style="color: #667eea; margin-bottom: 16px; font-size: 16px;">⚡ Options avancées</h5>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <label style="display: flex; align-items: center; gap: 10px;">
                  <input type="checkbox" id="adminParallelBuild" checked />
                  <span>Build parallèle</span>
                </label>
                <label style="display: flex; align-items: center; gap: 10px;">
                  <input type="checkbox" id="adminMinify" />
                  <span>Minify (Release)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 10px;">
                  <input type="checkbox" id="adminAutoSign" />
                  <span>Auto-sign Release</span>
                </label>
                <label style="display: flex; align-items: center; gap: 10px;">
                  <input type="checkbox" id="adminAutoInstall" checked />
                  <span>Auto-install après build</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Barre de progression -->
          <div class="progress-section" id="adminProgressSection" style="display: none;">
            <h4>📊 Progression</h4>
            <div class="progress-bar-container">
              <div class="progress-bar">
                <div class="progress-fill" id="adminProgressFill" style="width: 0%"></div>
              </div>
              <div class="progress-text">
                <span id="adminProgressPercent">0%</span> - <span id="adminProgressStep">Initialisation...</span>
              </div>
            </div>

            <!-- Logs de progression -->
            <div class="status-logs" id="adminStatusLogs" style="
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
          <div class="action-buttons" style="display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap;">
            <button id="adminBtnCompile" class="btn-action" style="
              flex: 1;
              min-width: 200px;
              padding: 14px;
              background: linear-gradient(135deg, #667eea, #764ba2);
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 1em;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s;
            ">
              🔨 Compiler l'APK
            </button>
            <button id="adminBtnInstall" class="btn-action" style="
              flex: 1;
              min-width: 200px;
              padding: 14px;
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
            <button id="adminBtnLaunch" class="btn-action" style="
              flex: 1;
              min-width: 200px;
              padding: 14px;
              background: #2196f3;
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
              ▶️ Lancer l'App
            </button>
          </div>

          <!-- Messages informatifs -->
          <div id="adminMessageBox" style="
            margin-top: 20px;
            padding: 16px;
            border-radius: 6px;
            display: none;
            border-left: 4px solid #667eea;
          "></div>

          <!-- Infos supplémentaires -->
          <div style="background: #f0f4ff; padding: 16px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #667eea; color: #333;">
            <h4 style="margin-top: 0; color: #667eea;">ℹ️ Informations</h4>
            <ul style="margin: 8px 0; padding-left: 20px; font-size: 0.95em;">
              <li>La première compilation peut prendre 5-15 minutes</li>
              <li>Les dépendances Gradle seront téléchargées automatiquement</li>
              <li>Les builds suivantes seront plus rapides (cache)</li>
              <li>Assurez-vous d'avoir Java JDK 11+ installé</li>
              <li>L'APK sera sauvegardé après la compilation</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    // Ajouter les écouteurs d'événements
    this.attachEventListeners();
    
    // Charger les appareils
    this.loadDevices();
  }

  /**
   * Attache les écouteurs d'événements
   */
  attachEventListeners() {
    const btnCompile = document.getElementById('adminBtnCompile');
    const btnInstall = document.getElementById('adminBtnInstall');
    const btnLaunch = document.getElementById('adminBtnLaunch');
    
    btnCompile.addEventListener('click', () => this.compileAPK());
    btnInstall.addEventListener('click', () => this.installAPK());
    btnLaunch.addEventListener('click', () => this.launchApp());
  }

  /**
   * Charge les appareils disponibles
   */
  async loadDevices() {
    try {
      const response = await fetch('/api/adb/devices');
      const data = await response.json();
      
      const container = document.getElementById('adminDevicesList');
      if (data.ok && data.devices.length > 0) {
        container.innerHTML = data.devices.map(d => `
          <div style="
            padding: 16px;
            background: #e8f5e9;
            border: 2px solid #4caf50;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            flex-direction: column;
            gap: 8px;
          " class="device-card" data-serial="${d.serialNumber}">
            <div style="font-weight: bold; color: #2e7d32; font-size: 16px;">✓ ${d.model || d.serialNumber}</div>
            <div style="font-size: 0.85em; color: #558b2f;">${d.serialNumber}</div>
            <div style="font-size: 0.8em; color: #7cb342; margin-top: 4px;">Statut: <span style="font-weight: bold;">${d.status}</span></div>
          </div>
        `).join('');
        
        // Ajouter les clics sur les devices
        document.querySelectorAll('.device-card').forEach(card => {
          card.addEventListener('click', () => {
            document.querySelectorAll('.device-card').forEach(c => {
              c.style.borderColor = '#4caf50';
              c.style.background = '#e8f5e9';
            });
            card.style.borderColor = '#1b5e20';
            card.style.background = '#c8e6c9';
            this.selectedDevice = card.dataset.serial;
          });
        });
        
        // Sélectionner le premier par défaut
        if (document.querySelectorAll('.device-card').length > 0) {
          document.querySelectorAll('.device-card')[0].click();
        }
      } else {
        container.innerHTML = '<div style="padding: 12px; background: #ffebee; border-radius: 6px; color: #c62828; text-align: center;">Aucun appareil détecté</div>';
      }
    } catch (e) {
      console.error('[Admin Installer] Device load error:', e);
    }
  }

  /**
   * Log un message
   */
  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    this.statusLog.push({ message, type, timestamp });
    
    const logsDiv = document.getElementById('adminStatusLogs');
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
    const fillDiv = document.getElementById('adminProgressFill');
    const percentSpan = document.getElementById('adminProgressPercent');
    const stepSpan = document.getElementById('adminProgressStep');
    
    if (fillDiv) fillDiv.style.width = percent + '%';
    if (percentSpan) percentSpan.textContent = percent + '%';
    if (stepSpan) stepSpan.textContent = step;
  }

  /**
   * Affiche un message
   */
  showMessage(message, type = 'info') {
    const msgBox = document.getElementById('adminMessageBox');
    if (!msgBox) return;
    
    msgBox.style.display = 'block';
    msgBox.style.borderLeftColor = type === 'error' ? '#c62828' : (type === 'success' ? '#2e7d32' : '#667eea');
    msgBox.style.background = type === 'error' ? '#ffebee' : (type === 'success' ? '#e8f5e9' : '#f0f4ff');
    msgBox.style.color = type === 'error' ? '#c62828' : (type === 'success' ? '#2e7d32' : '#1565c0');
    msgBox.style.whiteSpace = 'pre-wrap';
    msgBox.style.wordWrap = 'break-word';
    msgBox.innerHTML = message.replace(/\n/g, '<br>');
  }

  /**
   * Compile l'APK
   */
  async compileAPK() {
    if (this.isInstalling) return;
    
    this.isInstalling = true;
    const progressSection = document.getElementById('adminProgressSection');
    const btnCompile = document.getElementById('adminBtnCompile');
    const btnInstall = document.getElementById('adminBtnInstall');
    
    btnCompile.disabled = true;
    btnCompile.style.opacity = '0.5';
    
    if (progressSection) progressSection.style.display = 'block';
    
    const buildType = document.querySelector('input[name="adminBuildType"]:checked').value;
    
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
        this.showMessage(`✅ APK compilé avec succès! (${data.size}MB, ${data.duration}s)`, 'success');
        
        this.apkPath = data.apkPath;
        btnInstall.disabled = false;
        btnInstall.style.opacity = '1';
        btnInstall.style.cursor = 'pointer';
      } else {
        this.updateProgress(0, 'Erreur');
        this.log(`❌ Erreur: ${data.error}`, 'error');
        this.showMessage(`❌ Erreur de compilation: ${data.error}`, 'error');
      }
    } catch (e) {
      this.updateProgress(0, 'Erreur');
      this.log(`❌ Erreur réseau: ${e.message}`, 'error');
      this.showMessage(`❌ Erreur: ${e.message}`, 'error');
    } finally {
      this.isInstalling = false;
      btnCompile.disabled = false;
      btnCompile.style.opacity = '1';
    }
  }

  /**
   * Installe l'APK
   */
  async installAPK() {
    if (!this.apkPath || !this.selectedDevice) {
      this.showMessage('Veuillez d\'abord compiler l\'APK et sélectionner un appareil', 'error');
      return;
    }

    if (this.isInstalling) return;
    
    this.isInstalling = true;
    const btnInstall = document.getElementById('adminBtnInstall');
    const btnLaunch = document.getElementById('adminBtnLaunch');
    const progressSection = document.getElementById('adminProgressSection');
    
    btnInstall.disabled = true;
    btnInstall.style.opacity = '0.5';
    
    if (progressSection) progressSection.style.display = 'block';
    
    this.log(`Installation sur ${this.selectedDevice}...`);
    this.updateProgress(30, 'Installation APK...');
    this.showMessage('Installation en cours...', 'info');

    try {
      const response = await fetch('/api/android/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          apkPath: this.apkPath,
          deviceId: this.selectedDevice
        })
      });

      const data = await response.json();

      if (data.ok) {
        this.updateProgress(100, 'Installation terminée!');
        this.log('✅ App installée avec succès!', 'success');
        this.showMessage('✅ App installée avec succès!', 'success');
        
        btnLaunch.disabled = false;
        btnLaunch.style.opacity = '1';
        btnLaunch.style.cursor = 'pointer';
      } else {
        this.updateProgress(0, 'Erreur');
        this.log(`❌ Erreur: ${data.error}`, 'error');
        this.showMessage(`❌ Erreur d'installation: ${data.error}`, 'error');
      }
    } catch (e) {
      this.updateProgress(0, 'Erreur');
      this.log(`❌ Erreur réseau: ${e.message}`, 'error');
      this.showMessage(`❌ Erreur: ${e.message}`, 'error');
    } finally {
      this.isInstalling = false;
      btnInstall.disabled = false;
      btnInstall.style.opacity = '1';
    }
  }

  /**
   * Lance l'app
   */
  async launchApp() {
    if (!this.selectedDevice) {
      this.showMessage('Veuillez sélectionner un appareil', 'error');
      return;
    }

    this.log('Lancement de l\'app...');
    this.showMessage('Lancement en cours...', 'info');
    
    try {
      const response = await fetch('/api/android/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: this.selectedDevice })
      });

      const data = await response.json();
      if (data.ok) {
        this.log('✅ App lancée!', 'success');
        this.showMessage('✅ App lancée sur le casque!', 'success');
      } else {
        this.log(`⚠️ Impossible de lancer l'app: ${data.error}`, 'error');
        this.showMessage(`⚠️ Impossible de lancer l'app: ${data.error}`, 'error');
      }
    } catch (e) {
      this.log(`⚠️ Erreur lors du lancement: ${e.message}`, 'error');
      this.showMessage(`⚠️ Erreur: ${e.message}`, 'error');
    }
  }
}

// Export global
window.AdminAndroidInstaller = AdminAndroidInstaller;
