/**
 * APK Compilation Service - Docker Backend
 * Compile les APK via Docker pour éviter les problèmes Windows
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const APK_BUILD_DIR = path.join(__dirname, '..', 'tts-receiver-app', 'build', 'outputs', 'apk');
const PROJECT_DIR = path.join(__dirname, '..');

/**
 * Compile APK via Docker
 */
function compileViaDocker(buildType = 'debug', timeout = 600000) {
  return new Promise((resolve, reject) => {
    console.log(`[APK] Starting Docker compilation (${buildType})...`);
    
    // Vérifier que Docker est disponible
    try {
      execSync('docker --version', { stdio: 'ignore' });
    } catch (e) {
      return reject(new Error('Docker not installed or not in PATH. Install Docker and try again.'));
    }
    
    // Créer un Dockerfile temporaire pour la compilation
    const dockerCode = `
FROM gradle:8.7-jdk11-focal

# Installer Android SDK
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools

RUN apt-get update && apt-get install -y wget unzip

RUN mkdir -p \$ANDROID_HOME && \\
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip -O /tmp/cmdline.zip && \\
    unzip -q /tmp/cmdline.zip -d \$ANDROID_HOME && \\
    mkdir -p \$ANDROID_HOME/cmdline-tools/latest && \\
    mv \$ANDROID_HOME/cmdline-tools/* \$ANDROID_HOME/cmdline-tools/latest/ && \\
    rm -rf /tmp/cmdline.zip

RUN yes | sdkmanager --sdk_root=\$ANDROID_HOME --licenses > /dev/null 2>&1 || true
RUN sdkmanager --sdk_root=\$ANDROID_HOME "platforms;android-32" "build-tools;32.0.0"

COPY tts-receiver-app /app
WORKDIR /app

RUN chmod +x gradlew && \\
    ./gradlew assemble${buildType === 'debug' ? 'Debug' : 'Release'} \\
    -Dorg.gradle.jvmargs="-Xmx4096m" \\
    --no-daemon

ENTRYPOINT ["/bin/bash"]
`;
    
    const dockerfilePath = path.join(PROJECT_DIR, 'Dockerfile.apk-build-temp');
    try {
      fs.writeFileSync(dockerfilePath, dockerCode);
      console.log('[APK] Dockerfile créé');
      
      // Construire l'image Docker
      console.log('[APK] Building Docker image...');
      execSync('docker build -f Dockerfile.apk-build-temp -t vhr-apk-builder:latest .', {
        cwd: PROJECT_DIR,
        stdio: 'inherit',
        timeout: 900000 // 15 minutes pour le build d'image
      });
      
      console.log('[APK] Running compilation...');
      // Lancer la compilation dans le container
      execSync(`docker run --rm -v ${path.join(PROJECT_DIR, 'tts-receiver-app')}/build:/app/build vhr-apk-builder:latest -c "echo APK compilation complete"`, {
        stdio: 'inherit',
        timeout
      });
      
      // Vérifier que l'APK a été généré
      const apkPath = path.join(APK_BUILD_DIR, buildType, `app-${buildType}.apk`);
      if (!fs.existsSync(apkPath)) {
        console.error('[APK] APK not found at:', apkPath);
        throw new Error(`APK not found after compilation at ${apkPath}`);
      }
      
      const stats = fs.statSync(apkPath);
      console.log(`[APK] ✅ APK compiled successfully: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
      
      resolve({
        success: true,
        path: apkPath,
        size: stats.size,
        sizeGB: (stats.size / (1024 * 1024)).toFixed(2)
      });
    } catch (e) {
      console.error('[APK] Compilation failed:', e.message);
      reject(e);
    } finally {
      // Nettoyer le Dockerfile temporaire
      if (fs.existsSync(dockerfilePath)) {
        fs.unlinkSync(dockerfilePath);
      }
    }
  });
}

/**
 * Compile APK localement (fallback ou Windows)
 */
async function compileLocal(buildType = 'debug') {
  console.log(`[APK] Starting local Gradle compilation (${buildType})...`);
  
  const androidDir = path.join(PROJECT_DIR, 'tts-receiver-app');
  return new Promise((resolve, reject) => {
    const gradlew = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
    
    if (!fs.existsSync(gradlew)) {
      return reject(new Error('Gradle wrapper not found'));
    }
    
    const args = [
      `assemble${buildType === 'debug' ? 'Debug' : 'Release'}`,
      '-Dorg.gradle.jvmargs=-Xmx4096m',
      '--no-daemon'
    ];
    
    const proc = spawn(gradlew, args, {
      cwd: androidDir,
      stdio: 'inherit'
    });
    
    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error('Gradle compilation timeout'));
    }, 600000); // 10 minutes
    
    proc.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code === 0) {
        const apkPath = path.join(androidDir, 'build', 'outputs', 'apk', buildType, `app-${buildType}.apk`);
        if (fs.existsSync(apkPath)) {
          const stats = fs.statSync(apkPath);
          console.log(`[APK] ✅ APK compiled: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
          resolve({
            success: true,
            path: apkPath,
            size: stats.size,
            sizeMB: (stats.size / (1024 * 1024)).toFixed(2)
          });
        } else {
          reject(new Error(`APK not found at ${apkPath}`));
        }
      } else {
        reject(new Error(`Gradle exited with code ${code}`));
      }
    });
    
    proc.on('error', reject);
  });
}

module.exports = {
  compileViaDocker,
  compileLocal,
  
  /**
   * Smart compile: try Docker first, fallback to local
   */
  async compile(buildType = 'debug', preferDocker = true) {
    if (preferDocker && process.platform !== 'win32') {
      // Sur Linux/Mac, Docker est plus fiable
      try {
        return await compileViaDocker(buildType);
      } catch (e) {
        console.warn('[APK] Docker compilation failed, trying local:', e.message);
      }
    }
    
    // Fallback sur compilation locale
    return await compileLocal(buildType);
  }
};
