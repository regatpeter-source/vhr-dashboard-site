#!/usr/bin/env node

/**
 * Android APK Builder - Compile via Docker
 * Gère la compilation des APK sur Linux (où Gradle fonctionne)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const DOCKER_IMAGE = 'node:18';
const PROJECT_DIR = path.join(__dirname, '..');

async function buildApk(buildType = 'debug') {
  console.log(`\n[APK Builder] Démarrage de la compilation ${buildType}...`);
  
  // Vérifier que le projet Android existe
  const androidDir = path.join(PROJECT_DIR, 'tts-receiver-app');
  if (!fs.existsSync(androidDir)) {
    console.error('❌ Répertoire Android non trouvé:', androidDir);
    process.exit(1);
  }

  console.log('[APK Builder] ✅ Projet Android trouvé');
  
  // Créer le Dockerfile temporaire
  const dockerFile = `
FROM ubuntu:22.04

# Installer Java et Android SDK
RUN apt-get update && apt-get install -y \\
    openjdk-11-jdk \\
    wget \\
    unzip \\
    git \\
    && rm -rf /var/lib/apt/lists/*

# Installer Android SDK
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

RUN mkdir -p $ANDROID_HOME && \\
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip -O /tmp/cmdline-tools.zip && \\
    unzip -q /tmp/cmdline-tools.zip -d $ANDROID_HOME && \\
    mv $ANDROID_HOME/cmdline-tools $ANDROID_HOME/cmdline-tools-latest && \\
    mkdir -p $ANDROID_HOME/cmdline-tools/latest && \\
    mv $ANDROID_HOME/cmdline-tools-latest/* $ANDROID_HOME/cmdline-tools/latest/ && \\
    rm -rf /tmp/cmdline-tools.zip

# Accepter les licences
RUN yes | sdkmanager --sdk_root=$ANDROID_HOME --licenses > /dev/null 2>&1 || true

# Installer les SDK components
RUN sdkmanager --sdk_root=$ANDROID_HOME "platforms;android-32" "build-tools;32.0.0"

# Copier le projet
COPY tts-receiver-app /app

WORKDIR /app

# Compiler
RUN chmod +x gradlew && \\
    ./gradlew assemble${buildType === 'debug' ? 'Debug' : 'Release'} \\
    -Dorg.gradle.jvmargs="-Xmx4096m" \\
    --no-daemon

# Copier la sortie
RUN cp build/outputs/apk/${buildType}/app-${buildType}.apk /app-${buildType}.apk
`;

  const dockerfilePath = path.join(PROJECT_DIR, 'Dockerfile.build-apk');
  fs.writeFileSync(dockerfilePath, dockerFile);
  console.log('[APK Builder] 📝 Dockerfile créé');

  try {
    // Construire l'image Docker
    console.log('[APK Builder] 🐳 Construction de l\'image Docker...');
    await runCommand('docker', [
      'build',
      '-f', dockerfilePath,
      '-t', 'vhr-apk-builder:latest',
      '.'
    ], { cwd: PROJECT_DIR });

    console.log('[APK Builder] ✅ Image Docker construite');

    // Lancer la compilation dans le container
    console.log('[APK Builder] 🏗️  Compilation en cours...');
    await runCommand('docker', [
      'run',
      '--rm',
      '-v', `${PROJECT_DIR}/tts-receiver-app/build:/app/build`,
      'vhr-apk-builder:latest'
    ]);

    console.log('[APK Builder] ✅ APK compilé avec succès!');

    // Vérifier que l'APK existe
    const apkPath = path.join(androidDir, 'build', 'outputs', 'apk', buildType, `app-${buildType}.apk`);
    if (fs.existsSync(apkPath)) {
      const stats = fs.statSync(apkPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`[APK Builder] 📦 APK générée: ${apkPath}`);
      console.log(`[APK Builder] 📊 Taille: ${sizeMB}MB`);
      return apkPath;
    } else {
      console.error('❌ APK non trouvée après compilation');
      process.exit(1);
    }
  } finally {
    // Nettoyer
    if (fs.existsSync(dockerfilePath)) {
      fs.unlinkSync(dockerfilePath);
    }
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options
    });

    child.on('error', (err) => {
      console.error(`❌ Erreur: ${command} ${args.join(' ')}`);
      console.error(err.message);
      reject(err);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

// CLI
const buildType = process.argv[2] || 'debug';
buildApk(buildType)
  .then(() => {
    console.log('\n✅ Compilation réussie!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Compilation échouée:', err.message);
    process.exit(1);
  });
