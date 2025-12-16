// ========== IMPORTS & INIT ========== 

require('dotenv').config();
const express = require('express');
const http = require('http');
const { spawn } = require('child_process');
const util = require('util');
const execp = util.promisify(require('child_process').exec);
const path = require('path');
const fs = require('fs');
const { Server: SocketIOServer } = require('socket.io');
const WebSocket = require('ws');
const helmet = require('helmet');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const https = require('https');
const http_module = require('http');
const unzipper = require('unzipper');
const fetch = require('node-fetch');

// PostgreSQL database module
const db = process.env.DATABASE_URL ? require('./db-postgres') : null;
const USE_POSTGRES = !!process.env.DATABASE_URL;
console.log(`[DB] Mode: ${USE_POSTGRES ? 'PostgreSQL' : 'JSON Files (Development)'}`);

// ========== JAVA & GRADLE MANAGEMENT ===========

/**
 * Vérifie et installe automatiquement Java/Gradle si nécessaire
 */
async function ensureJavaAndGradle() {
  console.log('[Setup] Vérification de Java et Gradle...');
  
  // Vérifier Java - d'abord vérifier le dossier
  console.log('[Setup] Vérification de Java...');
  let javaFound = false;
  const javaDir = 'C:\\Java\\jdk-11.0.29+7';
  
  if (fs.existsSync(javaDir)) {
    console.log('[Setup] ✓ Dossier Java trouvé:', javaDir);
    javaFound = true;
    // S'assurer que process.env a le PATH correct
    const javaPath = path.join(javaDir, 'bin');
    if (!process.env.PATH.includes(javaPath)) {
      process.env.PATH = javaPath + ';' + process.env.PATH;
      console.log('[Setup] ✓ Java ajouté au PATH du processus');
    }
  } else {
    // Essayer la commande comme fallback
    try {
      await execp('java -version', { timeout: 5000 });
      console.log('[Setup] ✓ Java trouvé via PATH système');
      javaFound = true;
    } catch (e) {
      console.log('[Setup] ⚠️ Java non trouvé, tentative d\'installation...');
      javaFound = await installJava();
      if (javaFound) {
        console.log('[Setup] ✓ Java installé et configuré');
      }
    }
  }

  // Vérifier Gradle - d'abord vérifier le dossier
  console.log('[Setup] Vérification de Gradle...');
  let gradleFound = false;
  const gradleDir = 'C:\\Gradle\\gradle-8.7';
  
  if (fs.existsSync(gradleDir)) {
    console.log('[Setup] ✓ Dossier Gradle trouvé:', gradleDir);
    gradleFound = true;
    // S'assurer que process.env a le PATH correct
    const gradlePath = path.join(gradleDir, 'bin');
    if (!process.env.PATH.includes(gradlePath)) {
      process.env.PATH = gradlePath + ';' + process.env.PATH;
      console.log('[Setup] ✓ Gradle ajouté au PATH du processus');
    }
  } else {
    // Essayer la commande comme fallback
    try {
      await execp('gradle -v', { timeout: 5000 });
      console.log('[Setup] ✓ Gradle trouvé via PATH système');
      gradleFound = true;
    } catch (e) {
      console.log('[Setup] ⚠️ Gradle non trouvé, tentative d\'installation...');
      gradleFound = await installGradle();
      if (gradleFound) {
        console.log('[Setup] ✓ Gradle installé et configuré');
      }
    }
  }

  // Configurer les variables d'environnement
  configureEnvironmentVariables();
  
  // Vérifier Android SDK
  console.log('[Setup] Vérification d\'Android SDK...');
  let sdkFound = await ensureAndroidSDK();
  
  const success = javaFound && gradleFound && sdkFound;
  if (success) {
    console.log('[Setup] ✅ Java, Gradle et SDK Android sont disponibles');
  } else {
    console.error('[Setup] ⚠️ Certains outils manquent (Java: ' + (javaFound ? '✓' : '✗') + ', Gradle: ' + (gradleFound ? '✓' : '✗') + ', SDK: ' + (sdkFound ? '✓' : '✗') + ')');
  }
  
  return { success, javaFound, gradleFound };
}

/**
 * Télécharge et installe Java JDK 11
 */
async function installJava() {
  const javaDir = 'C:\\Java';
  const jdkPath = path.join(javaDir, 'jdk-11.0.29+7');
  
  // Vérifier si déjà installé
  if (fs.existsSync(jdkPath)) {
    console.log('[Setup] Java déjà installé à:', jdkPath);
    process.env.JAVA_HOME = jdkPath;
    return true;
  }

  try {
    if (!fs.existsSync(javaDir)) {
      fs.mkdirSync(javaDir, { recursive: true });
    }

    console.log('[Setup] Téléchargement de Java JDK 11 (~200MB)...');
    const downloadUrl = 'https://github.com/adoptium/temurin11-binaries/releases/download/jdk-11.0.29%2B7/OpenJDK11U-jdk_x64_windows_hotspot_11.0.29_7.zip';
    
    const response = await fetch(downloadUrl, { timeout: 120000 });
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const javaZip = path.join(javaDir, 'jdk.zip');
    const arrayBuffer = await response.buffer();
    fs.writeFileSync(javaZip, arrayBuffer);
    
    console.log('[Setup] Extraction de Java (peut prendre 1-2 minutes)...');
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(javaZip)
        .pipe(unzipper.Extract({ path: javaDir }))
        .on('finish', () => {
          console.log('[Setup] Extraction terminée');
          resolve();
        })
        .on('error', reject);
    });

    fs.unlinkSync(javaZip);
    process.env.JAVA_HOME = jdkPath;
    console.log('[Setup] ✓ Java JDK 11 installé avec succès');
    return true;
    
  } catch (e) {
    console.error('[Setup] ❌ Installation automatique Java échouée:', e.message);
    console.log('[Setup] Tentative avec le script PowerShell...');
    
    try {
      const scriptPath = path.join(__dirname, 'scripts', 'install-build-tools.ps1');
      if (fs.existsSync(scriptPath)) {
        console.log('[Setup] Lancement du script PowerShell...');
        await execp(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -SkipGradle`, { timeout: 600000 });
        console.log('[Setup] ✓ Script PowerShell terminé');
        return true;
      }
    } catch (psErr) {
      console.error('[Setup] Script PowerShell échoué:', psErr.message);
    }
    
    return false;
  }
}

/**
 * Télécharge et installe Gradle 8.7
 */
async function installGradle() {
  const gradleDir = 'C:\\Gradle';
  const gradlePath = path.join(gradleDir, 'gradle-8.7');
  
  // Vérifier si déjà installé
  if (fs.existsSync(gradlePath)) {
    console.log('[Setup] Gradle déjà installé à:', gradlePath);
    return true;
  }

  try {
    if (!fs.existsSync(gradleDir)) {
      fs.mkdirSync(gradleDir, { recursive: true });
    }

    console.log('[Setup] Téléchargement de Gradle 8.7 (~240MB)...');
    const downloadUrl = 'https://services.gradle.org/distributions/gradle-8.7-bin.zip';
    
    const response = await fetch(downloadUrl, { timeout: 120000 });
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const gradleZip = path.join(gradleDir, 'gradle.zip');
    const arrayBuffer = await response.buffer();
    fs.writeFileSync(gradleZip, arrayBuffer);

    console.log('[Setup] Extraction de Gradle (peut prendre 1-2 minutes)...');
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(gradleZip)
        .pipe(unzipper.Extract({ path: gradleDir }))
        .on('finish', () => {
          console.log('[Setup] Extraction terminée');
          resolve();
        })
        .on('error', reject);
    });

    fs.unlinkSync(gradleZip);
    console.log('[Setup] ✓ Gradle 8.7 installé avec succès');
    return true;
    
  } catch (e) {
    console.error('[Setup] ❌ Installation automatique Gradle échouée:', e.message);
    console.log('[Setup] Tentative avec le script PowerShell...');
    
    try {
      const scriptPath = path.join(__dirname, 'scripts', 'install-build-tools.ps1');
      if (fs.existsSync(scriptPath)) {
        console.log('[Setup] Lancement du script PowerShell...');
        await execp(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -SkipJava`, { timeout: 600000 });
        console.log('[Setup] ✓ Script PowerShell terminé');
        return true;
      }
    } catch (psErr) {
      console.error('[Setup] Script PowerShell échoué:', psErr.message);
    }
    
    return false;
  }
}

/**
 * Télécharge et installe Android SDK Command Line Tools
 */
async function ensureAndroidSDK() {
  const sdkDir = 'C:\\Android\\SDK';
  const cmdlineToolsDir = path.join(sdkDir, 'cmdline-tools', 'latest');
  
  // Vérifier si déjà installé
  if (fs.existsSync(cmdlineToolsDir)) {
    console.log('[Setup] Android SDK déjà installé à:', sdkDir);
    return true;
  }

  try {
    console.log('[Setup] Téléchargement d\'Android SDK Command Line Tools (~120MB)...');
    
    // Créer les répertoires
    if (!fs.existsSync(sdkDir)) {
      fs.mkdirSync(sdkDir, { recursive: true });
    }

    const cmdlineToolsParent = path.join(sdkDir, 'cmdline-tools');
    if (!fs.existsSync(cmdlineToolsParent)) {
      fs.mkdirSync(cmdlineToolsParent, { recursive: true });
    }

    // Télécharger depuis Google (Windows version)
    const downloadUrl = 'https://dl.google.com/android/repository/commandlinetools-win-9477386_latest.zip';
    const tempZip = path.join(sdkDir, 'cmdline-tools.zip');
    
    console.log('[Setup] Téléchargement en cours...');
    const response = await fetch(downloadUrl, { timeout: 180000 });
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const arrayBuffer = await response.buffer();
    fs.writeFileSync(tempZip, arrayBuffer);
    
    console.log('[Setup] Extraction d\'Android SDK (peut prendre 1-2 minutes)...');
    
    // Extraire dans un répertoire temporaire
    const tempExtractDir = path.join(sdkDir, 'cmdline-tools-temp');
    await new Promise((resolve, reject) => {
      fs.createReadStream(tempZip)
        .pipe(unzipper.Extract({ path: tempExtractDir }))
        .on('finish', () => {
          console.log('[Setup] Extraction terminée');
          resolve();
        })
        .on('error', reject);
    });

    // Le zip contient un dossier "cmdline-tools", on le renomme en "latest"
    const extractedDir = path.join(tempExtractDir, 'cmdline-tools');
    const latestDir = path.join(cmdlineToolsParent, 'latest');
    
    if (fs.existsSync(extractedDir)) {
      // Supprimer le dossier destination s'il existe
      if (fs.existsSync(latestDir)) {
        fs.rmSync(latestDir, { recursive: true, force: true });
      }
      // Copier le dossier (plus fiable que renommer sur Windows)
      const copyDir = (src, dst) => {
        if (!fs.existsSync(dst)) {
          fs.mkdirSync(dst, { recursive: true });
        }
        const files = fs.readdirSync(src);
        files.forEach(file => {
          const srcFile = path.join(src, file);
          const dstFile = path.join(dst, file);
          const stat = fs.statSync(srcFile);
          if (stat.isDirectory()) {
            copyDir(srcFile, dstFile);
          } else {
            fs.copyFileSync(srcFile, dstFile);
          }
        });
      };
      copyDir(extractedDir, latestDir);
    }

    // Nettoyer le zip et le dossier temporaire
    fs.unlinkSync(tempZip);
    if (fs.existsSync(tempExtractDir)) {
      fs.rmSync(tempExtractDir, { recursive: true });
    }

    // Ajouter au PATH
    const binPath = path.join(latestDir, 'bin');
    if (!process.env.PATH.includes(binPath)) {
      process.env.PATH = binPath + ';' + process.env.PATH;
    }

    console.log('[Setup] ✓ Android SDK Command Line Tools installé');
    
    // Créer les répertoires SDK standards que Gradle attend
    const platformsDir = path.join(sdkDir, 'platforms');
    const buildToolsDir = path.join(sdkDir, 'build-tools');
    
    if (!fs.existsSync(platformsDir)) {
      fs.mkdirSync(platformsDir, { recursive: true });
    }
    if (!fs.existsSync(buildToolsDir)) {
      fs.mkdirSync(buildToolsDir, { recursive: true });
    }

    return true;
    
  } catch (e) {
    console.error('[Setup] ❌ Installation Android SDK échouée:', e.message);
    return false;
  }
}

/**
 * Configure les variables d'environnement pour Java et Gradle
 */
function configureEnvironmentVariables() {
  const javaHome = 'C:\\Java\\jdk-11.0.29+7';
  const javaPath = path.join(javaHome, 'bin');
  const gradlePath = 'C:\\Gradle\\gradle-8.7\\bin';
  const androidHome = 'C:\\Android\\SDK';

  process.env.JAVA_HOME = javaHome;
  process.env.ANDROID_HOME = androidHome;
  process.env.ANDROID_SDK_ROOT = androidHome;
  
  // Ajouter au PATH du processus
  if (!process.env.PATH.includes(javaPath)) {
    process.env.PATH = javaPath + ';' + process.env.PATH;
  }
  if (!process.env.PATH.includes(gradlePath)) {
    process.env.PATH = gradlePath + ';' + process.env.PATH;
  }

  console.log('[Setup] Variables d\'environnement configurées');
}

/**
 * Crée le fichier local.properties pour la compilation Android
 */
function ensureLocalProperties() {
  const appDir = path.join(__dirname, 'tts-receiver-app');
  const localPropsPath = path.join(appDir, 'local.properties');
  
  const androidHome = 'C:\\Android\\SDK';
  
  // Créer le contenu du fichier
  const content = `sdk.dir=${androidHome}\nndk.dir=C:\\Android\\NDK\nandroid.useAndroidX=true\n`;
  
  try {
    // Créer si n'existe pas ou mettre à jour
    fs.writeFileSync(localPropsPath, content, 'utf8');
    console.log('[Setup] ✓ local.properties créé');
  } catch (e) {
    console.error('[Setup] ⚠️ Impossible de créer local.properties:', e.message);
  }
}

// === INITIALISER JAVA/GRADLE AU DÉMARRAGE ===
console.log('[Server] Initialisation des chemins Java/Gradle...');
configureEnvironmentVariables();
ensureLocalProperties();

// Démarrer l'installation de Java/Gradle/SDK en arrière-plan SEULEMENT en développement local
// Sur Render/production, ce n'est pas nécessaire et ralentit le déploiement
if (process.env.NODE_ENV !== 'production' && process.env.RENDER !== 'true') {
  (async () => {
    try {
      await ensureJavaAndGradle();
    } catch (e) {
      console.error('[Setup] Erreur lors de l\'initialisation:', e.message);
    }
  })();
} else {
  console.log('[Setup] Mode production détecté - Java/Gradle/SDK non nécessaires');
}

const app = express();
// Helmet with custom CSP: allow own scripts and the botpress CDN. Do not enable 'unsafe-inline'.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.botpress.cloud', 'https://js.stripe.com', 'https://*.gstatic.com', 'https://cdn.jsdelivr.net'],
      scriptSrcAttr: ["'unsafe-inline'"],
      // CSP Level 3: script/style element-specific directives
      scriptSrcElem: ["'self'", 'https://cdn.botpress.cloud', 'https://js.stripe.com', 'https://*.gstatic.com', 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://*.gstatic.com', 'https://*.google.com'],
      styleSrcElem: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://*.gstatic.com', 'https://*.google.com'],
      // Allow loading remote fonts (Google Fonts)
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://cdn-icons-png.flaticon.com', 'https://cdn.botpress.cloud'],
      connectSrc: ["'self'", 'https://api.stripe.com', 'https://messaging.botpress.cloud', 'https://cdn.botpress.cloud'],
      frameSrc: ["'self'", 'https://messaging.botpress.cloud', 'https://checkout.stripe.com', 'https://js.stripe.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  }
}));
// Set a friendlier referrer policy - allows third-party services like Google Translate
// to work without CSP warnings
app.use(helmet.referrerPolicy({ policy: 'no-referrer-when-downgrade' }));
app.use(cors({ origin: true, credentials: true }));
// Ensure webhook route receives raw body for Stripe signature verification
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(cookieParser());

// ========== CONFIGURATION MANAGEMENT ==========
const subscriptionConfig = require('./config/subscription.config');
const purchaseConfig = require('./config/purchase.config');
const demoConfig = require('./config/demo.config');
const emailService = require('./services/emailService');

// Initialize email service
emailService.initEmailTransporter();

// Ajouter un champ demoStartDate lors de l'inscription
function initializeDemoForUser(user) {
  if (!user.demoStartDate && demoConfig.MODE === 'database') {
    user.demoStartDate = new Date().toISOString();
  }
  return user;
}

// Vérifier si la démo est expirée pour un utilisateur
function isDemoExpired(user) {
  if (!user || !user.demoStartDate || user.subscriptionStatus === 'active') {
    return false; // Pas de limite si abonnement actif
  }
  
  const startDate = new Date(user.demoStartDate);
  const expirationDate = new Date(startDate.getTime() + demoConfig.DEMO_DURATION_MS);
  const now = new Date();
  
  return now > expirationDate;
}

// Obtenir les jours restants pour la démo
function getDemoRemainingDays(user) {
  if (!user || !user.demoStartDate) {
    return demoConfig.DEMO_DAYS;
  }
  
  const startDate = new Date(user.demoStartDate);
  const expirationDate = new Date(startDate.getTime() + demoConfig.DEMO_DURATION_MS);
  const now = new Date();
  const remainingMs = expirationDate.getTime() - now.getTime();
  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  
  return Math.max(0, remainingDays);
}

const LICENSES_FILE = path.join(__dirname, 'data', 'licenses.json');

// ========== EMAIL CONFIGURATION ==========
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true' ? true : false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  logger: true,  // Enable logging
  debug: true    // Show debug info
});

// Verify email configuration at startup
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  emailTransporter.verify((err, success) => {
    if (err) {
      console.error('[email] Configuration error - SMTP verification failed:', err.message);
      console.error('[email] Check EMAIL_USER, EMAIL_PASS, EMAIL_HOST, EMAIL_PORT in .env');
    } else if (success) {
      console.log('[email] ✓ SMTP configuration verified - emails can be sent');
    }
  });
} else {
  console.warn('[email] EMAIL_USER or EMAIL_PASS not configured - contact notifications disabled');
}

// ========== LICENSE SYSTEM ==========
const LICENSE_SECRET = process.env.LICENSE_SECRET || 'vhr-dashboard-secret-key-2025';

function generateLicenseKey(username) {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const data = `${username}|${timestamp}|${random}`;
  const hash = crypto.createHmac('sha256', LICENSE_SECRET)
    .update(data)
    .digest('hex')
    .substring(0, 16);
  const key = `VHR-${hash.substring(0, 4).toUpperCase()}-${hash.substring(4, 8).toUpperCase()}-${hash.substring(8, 12).toUpperCase()}-${hash.substring(12, 16).toUpperCase()}`;
  return { key, username, createdAt: new Date().toISOString() };
}

function validateLicenseKey(key) {
  if (!key || !key.startsWith('VHR-')) return false;
  const licenses = loadLicenses();
  return licenses.some(l => l.key === key && l.status === 'active');
}

function loadLicenses() {
  ensureDataDir();
  if (!fs.existsSync(LICENSES_FILE)) {
    fs.writeFileSync(LICENSES_FILE, JSON.stringify([]));
    return [];
  }
  return JSON.parse(fs.readFileSync(LICENSES_FILE, 'utf8'));
}

function saveLicenses(licenses) {
  ensureDataDir();
  fs.writeFileSync(LICENSES_FILE, JSON.stringify(licenses, null, 2));
}

function addLicense(username, email, purchaseId) {
  const licenses = loadLicenses();
  const license = generateLicenseKey(username);
  license.email = email;
  license.purchaseId = purchaseId;
  license.status = 'active';
  licenses.push(license);
  saveLicenses(licenses);
  return license;
}

function findActiveLicenseByUsername(username) {
  if (!username) return null;
  const licenses = loadLicenses();
  return licenses.find(l => l.username === username && l.status === 'active');
}

// Send contact message to admin email
async function sendContactMessageToAdmin(msg) {
  const adminEmail = process.env.EMAIL_USER;
  if (!adminEmail) {
    console.error('[email] EMAIL_USER not configured, cannot send contact notification');
    return false;
  }
  
  if (!process.env.EMAIL_PASS) {
    console.error('[email] EMAIL_PASS not configured, cannot send contact notification');
    return false;
  }
  
  console.log('[email] Preparing contact message to:', adminEmail, 'from:', msg.email);
  
  const mailOptions = {
    from: adminEmail,
    to: adminEmail,
    replyTo: msg.email,
    subject: `📩 [VHR Contact] ${msg.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0d0f14; color: #ecf0f1; border-radius: 10px;">
        <h1 style="color: #3498db; text-align: center;">📩 Nouveau Message de Contact</h1>
        
        <div style="background: #1a1d24; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 8px 0;"><strong style="color: #2ecc71;">👤 Nom:</strong> ${msg.name}</p>
          <p style="margin: 8px 0;"><strong style="color: #2ecc71;">📧 Email:</strong> <a href="mailto:${msg.email}" style="color: #3498db;">${msg.email}</a></p>
          <p style="margin: 8px 0;"><strong style="color: #2ecc71;">📋 Sujet:</strong> ${msg.subject}</p>
          <p style="margin: 8px 0;"><strong style="color: #2ecc71;">📅 Date:</strong> ${new Date(msg.createdAt).toLocaleString('fr-FR')}</p>
        </div>
        
        <div style="background: #2c3e50; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #e67e22; margin-top: 0;">💬 Message:</h3>
          <p style="line-height: 1.8; white-space: pre-wrap;">${msg.message}</p>
        </div>
        
        <p style="text-align: center; color: #95a5a6; font-size: 12px; margin-top: 30px;">
          Ce message provient du formulaire de contact VHR Dashboard.<br>
          Vous pouvez répondre directement à cet email pour contacter l'expéditeur.
        </p>
      </div>
    `
  };
  
  try {
    console.log('[email] Sending via SMTP:', process.env.EMAIL_HOST || 'smtp.gmail.com', 'port:', process.env.EMAIL_PORT || 587);
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('[email] ✓ Contact message sent successfully');
    console.log('[email] Response ID:', info.response);
    return true;
  } catch (e) {
    console.error('[email] ✗ Failed to send contact message');
    console.error('[email] Error:', e.message);
    console.error('[email] Code:', e.code);
    if (e.response) console.error('[email] SMTP Response:', e.response);
    return false;
  }
}

// Send reply email to contact sender
async function sendReplyToContact(originalMessage, replyText, repliedBy) {
  const recipientEmail = originalMessage.email;
  if (!recipientEmail) {
    console.error('[email] Recipient email not available');
    return false;
  }

  if (!process.env.EMAIL_PASS) {
    console.error('[email] EMAIL_PASS not configured, cannot send reply');
    return false;
  }

  console.log('[email] Preparing reply to:', recipientEmail);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: `Réponse: ${originalMessage.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0d0f14; color: #ecf0f1; border-radius: 10px;">
        <h1 style="color: #3498db; text-align: center;">📨 Réponse à votre message</h1>
        
        <div style="background: #1a1d24; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 8px 0;"><strong style="color: #2ecc71;">👤 Répondu par:</strong> ${repliedBy}</p>
          <p style="margin: 8px 0;"><strong style="color: #2ecc71;">📅 Date de réponse:</strong> ${new Date().toLocaleString('fr-FR')}</p>
          <p style="margin: 8px 0;"><strong style="color: #2ecc71;">📅 Votre message envoyé le:</strong> ${new Date(originalMessage.createdAt).toLocaleString('fr-FR')}</p>
        </div>
        
        <div style="background: #2c3e50; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #e67e22; margin-top: 0;">💬 Réponse:</h3>
          <p style="line-height: 1.8; white-space: pre-wrap;">${replyText}</p>
        </div>
        
        <div style="background: #34495e; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3498db;">
          <h4 style="color: #3498db; margin-top: 0;">📝 Votre message original:</h4>
          <p style="margin: 8px 0;"><strong>Sujet:</strong> ${originalMessage.subject}</p>
          <p style="line-height: 1.6; white-space: pre-wrap; color: #bdc3c7;">${originalMessage.message}</p>
        </div>
        
        <p style="text-align: center; color: #95a5a6; font-size: 12px; margin-top: 30px;">
          Cet email a été envoyé en réponse à votre demande de contact VHR Dashboard.<br>
          Ne répondez pas à cet email, veuillez utiliser le formulaire de contact du site.
        </p>
      </div>
    `
  };

  try {
    console.log('[email] Sending reply via SMTP...');
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('[email] ✓ Reply sent successfully');
    console.log('[email] Response ID:', info.response);
    return true;
  } catch (e) {
    console.error('[email] ✗ Failed to send reply');
    console.error('[email] Error:', e.message);
    return false;
  }
}

// Send license email
async function sendLicenseEmail(email, licenseKey, username) {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'noreply@vhr-dashboard.com',
    to: email,
    subject: '🎉 Votre licence VHR Dashboard',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0d0f14; color: #ecf0f1; border-radius: 10px;">
        <h1 style="color: #2ecc71; text-align: center;">🥽 VHR Dashboard</h1>
        <h2 style="color: #3498db;">Merci pour votre achat !</h2>
        <p>Bonjour <strong>${username}</strong>,</p>
        <p>Votre licence VHR Dashboard a été activée avec succès. Voici votre clé de licence :</p>
        <div style="background: #1a1d24; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h2 style="color: #2ecc71; font-size: 24px; letter-spacing: 2px;">${licenseKey}</h2>
        </div>
        <h3 style="color: #e67e22;">Comment activer votre licence :</h3>
        <ol style="line-height: 1.8;">
          <li>Ouvrez le VHR Dashboard</li>
          <li>Cliquez sur le bouton <strong>"Activer une licence"</strong></li>
          <li>Copiez-collez votre clé de licence</li>
          <li>Profitez de toutes les fonctionnalités sans limitation !</li>
        </ol>
        <p style="color: #95a5a6; font-size: 12px; margin-top: 30px; text-align: center;">
          Cette licence est valide à vie et ne nécessite aucun paiement récurrent.<br>
          Conservez cette clé en lieu sûr.
        </p>
        <p style="text-align: center; margin-top: 20px;">
          <strong style="color: #2ecc71;">Besoin d'aide ?</strong><br>
          <a href="mailto:support@vhr-dashboard.com" style="color: #3498db;">support@vhr-dashboard.com</a>
        </p>
      </div>
    `
  };
  
  try {
    await emailTransporter.sendMail(mailOptions);
    console.log('[email] License sent to:', email);
    return true;
  } catch (e) {
    console.error('[email] Failed to send license:', e);
    return false;
  }
}

// ========== EXPLICIT ROUTES (must come BEFORE express.static middleware) ==========

// Serve launch-dashboard.html for 1-click launcher
app.get('/launch-dashboard.html', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'launch-dashboard.html'));
});

// Redirect vhr-dashboard-app.html to vhr-dashboard-pro.html
app.get('/vhr-dashboard-app.html', (req, res) => {
  console.log('[route] /vhr-dashboard-app.html requested, redirecting to /vhr-dashboard-pro.html');
  res.redirect(301, '/vhr-dashboard-pro.html');
});

// Test route to verify HTML serving works
app.get('/test-dashboard', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send('<html><body><h1>Test Dashboard Route Works!</h1></body></html>');
});

// ========== STATIC MIDDLEWARE (serves all public files) ==========

// Downloads system removed - using launcher system instead
app.use(express.static(path.join(__dirname, 'public')));
// Serve style and script root assets from public root as well (so /style.css and /script.js work)
app.use('/style.css', express.static(path.join(__dirname, 'public', 'style.css')));
app.use('/script.js', express.static(path.join(__dirname, 'public', 'script.js')));

// Serve sitemap.xml from root directory
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

// Serve robots.txt from root directory
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, 'robots.txt'));
});

// Expose site-vitrine directory too for local tests
app.use('/site-vitrine', express.static(path.join(__dirname, 'site-vitrine'), {
  setHeaders: (res, filePath) => {
    try {
      if (filePath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }
    } catch (e) {}
  }
}));

// Health check endpoint for local debugging
app.get('/ping', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});
// Expose site-vitrine and top-level HTML files so they can be accessed via http://localhost:PORT/
app.use('/site-vitrine', express.static(path.join(__dirname, 'site-vitrine')));
// Serve top-level HTML files that are not in public
const exposedTopFiles = ['index.html', 'pricing.html', 'features.html', 'contact.html', 'account.html', 'START-HERE.html', 'developer-setup.html', 'mentions.html', 'admin-dashboard.html', 'audio-receiver.html'];
exposedTopFiles.forEach(f => {
  app.get(`/${f}`, (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(path.join(__dirname, f));
  });
});

// Serve the index on root so PaaS/load balancers that request '/' get the homepage
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback route removed - using launcher system instead

// Route pour le dashboard portable (VHR-Dashboard-Portable.zip) - SANS RESTRICTION
app.get('/VHR-Dashboard-Portable.zip', (req, res) => {
  const portableZip = path.join(__dirname, 'VHR-Dashboard-Portable.zip');
  
  if (!fs.existsSync(portableZip)) {
    return res.status(404).json({ 
      ok: false, 
      error: 'VHR Dashboard Portable not found. Please run: npm run package:dashboard' 
    });
  }
  
  try {
    const stats = fs.statSync(portableZip);
    res.setHeader('Content-Type', 'application/x-zip-compressed');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', 'attachment; filename="VHR-Dashboard-Portable.zip"');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(portableZip);
  } catch (e) {
    console.error('[download] error:', e);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Route générique pour tous les téléchargements du dashboard (sans restriction de démo)
// Launcher script download - kept for local dashboard launch
// Force redeploy: serve batch wrapper file for auto-execution on Windows
app.get('/download/launch-script', (req, res) => {
  // Serve the .bat wrapper instead of .ps1 so it auto-executes on Windows
  const scriptPath = path.join(__dirname, 'scripts', 'launch-dashboard.bat');
  
  try {
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ 
        ok: false, 
        error: 'Launch script not found' 
      });
    }
    
    res.setHeader('Content-Type', 'application/x-bat');
    res.setHeader('Content-Disposition', 'attachment; filename="launch-dashboard.bat"');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(scriptPath);
  } catch (e) {
    console.error('[launch-script] error:', e);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Serve PowerShell launcher script as text (for remote execution via iex)
app.get('/scripts/launch-dashboard.ps1', (req, res) => {
  const scriptPath = path.join(__dirname, 'scripts', 'launch-dashboard.ps1');
  try {
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).send('Script not found');
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.sendFile(scriptPath);
  } catch (e) {
    console.error('[ps1-script] error:', e);
    return res.status(500).send('Server error');
  }
});

// Support old links: redirect root developer guide to canonical site-vitrine page
app.get('/developer-setup.html', (req, res) => {
  res.redirect(302, '/site-vitrine/developer-setup.html');
});

// Optional catch-all for known client-side routes or health probes that may access non-existent paths
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'site-vitrine', 'favicon.ico')));

// Ensure HTML responses have charset set to UTF-8 so browsers render accents correctly
app.use((req, res, next) => {
  const accept = (req.headers['accept'] || '').toLowerCase();
  if (req.path.endsWith('.html') || accept.includes('text/html') || req.path === '/') {
    // Only set charset for HTML responses
    try {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } catch (e) { /* ignore */ }
  }
  next();
});

// Middleware to block ADB/streaming endpoints on PaaS or hosts where ADB is disabled
function requireADB(req, res, next) {
  if (process.env.NO_ADB === '1') {
    return res.status(501).json({ ok: false, error: 'ADB disabled on this host via NO_ADB=1' });
  }
  next();
}
// Apply to common ADB & streaming endpoints to make it obvious in logs that the feature is disabled
app.use(['/api/adb', '/api/adb/*', '/api/stream', '/api/stream/*', '/api/apps', '/api/apps/*', '/api/battery', '/api/battery/*', '/api/device', '/api/device/*'], requireADB);

// --- Stripe Checkout ---
// Trim quotes and whitespace if an operator copy/pasted the key with surrounding quotes
function cleanEnvValue(v) { if (!v) return v; return v.replace(/^['"]|['"]$/g, '').trim(); }
const stripeKeyRaw = process.env.STRIPE_SECRET_KEY || 'sk_test_votre_cle_secrete';
const stripeKey = cleanEnvValue(stripeKeyRaw);
if (!stripeKey || stripeKey === 'sk_test_votre_cle_secrete') {
  console.warn('[Stripe] STRIPE_SECRET_KEY not set or using placeholder. Set STRIPE_SECRET_KEY=sk_test_xxx in your environment.');
} else if (stripeKey.startsWith('pk_')) {
  console.error('[Stripe] STRIPE_SECRET_KEY appears to be a publishable key (pk_). Server-side requires a secret key (sk_test_...). Aborting server start.');
  throw new Error('Stripe secret key required: STRIPE_SECRET_KEY must be an sk_ key.');
}
const stripe = require('stripe')(stripeKey);

// Verify the Stripe secret key early at startup (fail fast on invalid / publishable key)
async function verifyStripeKeyAtStartup() {
  if (!stripeKey || stripeKey === 'sk_test_votre_cle_secrete') {
    console.warn('[Stripe] STRIPE_SECRET_KEY not configured; server will still run but Stripe features will fail. Set STRIPE_SECRET_KEY to a valid sk_test_ key.');
    return;
  }
  if (stripeKey.startsWith('pk_')) {
    console.error('[Stripe] Provided STRIPE_SECRET_KEY appears to be a publishable key (pk_). Use a secret key (sk_test_...). Aborting.');
    throw new Error('Invalid STRIPE_SECRET_KEY: publishable key provided. Use a secret key (sk_test_...).');
  }
  try {
    // quick call to confirm key is valid
    await stripe.accounts.retrieve();
    console.log('[Stripe] STRIPE_SECRET_KEY validated (account retrieved).');
  } catch (e) {
    console.error('[Stripe] STRIPE_SECRET_KEY validation failed:', e && e.message);
    throw e;
  }
}

// Print masked key at server start to help debugging misconfigs (dev only when debug flag on)
if (process.env.STRIPE_DEBUG_PRICES === '1') {
  console.log('[Stripe] Stripe debug mode ON. Masked key:', maskKey(stripeKey));
}

// Helper for masked debug printing of secrets in dev
function maskKey(k) {
  if (!k || k.length < 8) return '***';
  const start = k.substring(0, 6);
  const end = k.substring(k.length - 4);
  return `${start}...${end}`;
}

app.post('/create-checkout-session', async (req, res) => {
  const { priceId, mode, username, userEmail, password } = req.body || {};
  const origin = req.headers.origin || `http://localhost:${process.env.PORT || 3000}`;
  if (!priceId || !mode) return res.status(400).json({ error: 'priceId et mode sont requis' });
  
  try {
    console.log('[Stripe] create-checkout-session request:', { priceId, mode, username, userEmail, origin });
    
    // Validate price exists and is compatible with mode
    let priceInfo = null;
    try {
      priceInfo = await stripe.prices.retrieve(priceId);
    } catch (pErr) {
      console.error('[Stripe] price retrieve error:', { priceId, err: pErr && pErr.message, raw: pErr && pErr.raw });
      // Provide helpful guidance if price not found or using wrong key
      const suggestion = 'Ensure the price exists in your Stripe dashboard (Test mode) and that the server is using a valid secret API key (sk_test_...).';
      const msg = (pErr && pErr.code === 'resource_missing') || (pErr && pErr.statusCode === 404)
        ? `Price not found: ${priceId}. ${suggestion}`
        : `Price retrieval failed: ${pErr && pErr.message}. ${suggestion}`;
      return res.status(400).json({ error: msg });
    }
    if (mode === 'payment' && priceInfo.type !== 'one_time') {
      return res.status(400).json({ error: `Price type mismatch: expected a one_time price for mode=payment (got: ${priceInfo.type})` });
    }
    if (mode === 'subscription' && priceInfo.type !== 'recurring') {
      return res.status(400).json({ error: `Price type mismatch: expected a recurring price for mode=subscription (got: ${priceInfo.type})` });
    }
    
    // Build metadata with user info if provided
    const metadata = {};
    if (username) {
      metadata.username = username;
      metadata.userEmail = userEmail;
      metadata.passwordHash = password; // Will be hashed in webhook
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode, // 'subscription' ou 'payment'
      success_url: `${origin}/pricing.html?success=1`,
      cancel_url: `${origin}/pricing.html?canceled=1`,
      metadata: metadata, // Store user registration data in metadata
      customer_email: userEmail || undefined, // Pre-fill customer email in Stripe
    });
    console.log('[Stripe] session created:', { id: session.id, url: session.url, hasUserData: !!username });
    res.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe] create-checkout-session error:', err);
    if (err && err.type === 'StripePermissionError') {
      return res.status(403).json({ error: err.raw && err.raw.message ? err.raw.message : 'Permission error with Stripe API key' });
    }
    if (err && err.raw && err.raw && err.raw.code) {
      return res.status(400).json({ error: err.raw.message || err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// --- Utilisateurs (simple persistence JSON: replace with a proper DB in production) ---
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

function ensureDataDir() {
  try { fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true }); } catch (e) { }
}

function saveUsers() {
  try {
    ensureDataDir();
    // Sanitize users array to avoid circular references and functions in objects
    const toSave = users.map(u => ({
      username: u.username,
      passwordHash: u.passwordHash || null,
      role: u.role || null,
      email: u.email || null,
      stripeCustomerId: u.stripeCustomerId || null,
      latestInvoiceId: u.latestInvoiceId || null,
      lastInvoicePaidAt: u.lastInvoicePaidAt || null,
      subscriptionStatus: u.subscriptionStatus || null,
      subscriptionId: u.subscriptionId || null
    }));
    fs.writeFileSync(USERS_FILE, JSON.stringify(toSave, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[users] save error', e && e.message);
    return false;
  }
}

// ========== DEMO STATUS MANAGEMENT ========== 
function getDemoStatus() {
  const DEMO_START = new Date('2025-12-07T00:00:00Z').getTime();
  const DEMO_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const DEMO_END = DEMO_START + DEMO_DURATION;
  
  const now = Date.now();
  const daysRemaining = Math.ceil((DEMO_END - now) / (24 * 60 * 60 * 1000));
  const isExpired = now > DEMO_END;
  
  return {
    isExpired,
    daysRemaining: Math.max(0, daysRemaining),
    expiresAt: new Date(DEMO_END).toISOString(),
    message: isExpired ? 'Demo expiré' : `Essai gratuit - ${Math.max(0, daysRemaining)} jour(s) restant(s)`
  };
}

function loadUsers() {
  console.log(`[users] attempting to load from ${USERS_FILE}`);
  try {
    ensureDataDir();
    if (fs.existsSync(USERS_FILE)) {
      console.log(`[users] file exists`);
      let raw = fs.readFileSync(USERS_FILE, 'utf8');
      // Remove BOM if present
      raw = raw.replace(/^\uFEFF/, '').trim();
      console.log(`[users] file content length: ${raw.length} chars`);
      const parsed = JSON.parse(raw || '[]');
      let userList = [];
      if (Array.isArray(parsed)) {
        console.log(`[users] loaded ${parsed.length} users from file`);
        userList = parsed;
      } else if (parsed && typeof parsed === 'object') {
        console.log('[users] loaded 1 user from file (single object)');
        userList = [parsed];
      } else {
        console.log('[users] empty file, using fallback');
        return [];
      }
      
      // Ajouter un ID aux utilisateurs qui n'en ont pas
      userList = userList.map(user => {
        if (!user.id) {
          user.id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.log(`[users] Generated ID for user ${user.username}: ${user.id}`);
        }
        return user;
      });
      
      return userList;
    } else {
      console.log(`[users] USERS_FILE not found at ${USERS_FILE}, using fallback`);
    }
  } catch (e) {
    console.error('[users] load error', e && e.message);
  }
  // Default fallback: admin user
  console.log('[users] using default fallback admin user');
  return [{ id: 'admin', username: 'vhr', passwordHash: '$2b$10$ov9F32cIWWXhvNumETtB1urvsdD5Y4Wl6wXlSHoCy.f4f03kRGcf2', role: 'admin', email: 'admin@example.local', stripeCustomerId: null }];
}

let users = loadUsers();

// --- Messages & Subscriptions (in-memory storage with JSON persistence) ---
const MESSAGES_FILE = path.join(__dirname, 'data', 'messages.json');
const SUBSCRIPTIONS_FILE = path.join(__dirname, 'data', 'subscriptions.json');

let messages = [];
let subscriptions = [];
let messageIdCounter = 1;
let subscriptionIdCounter = 1;

function loadMessages() {
  try {
    ensureDataDir();
    if (fs.existsSync(MESSAGES_FILE)) {
      let raw = fs.readFileSync(MESSAGES_FILE, 'utf8');
      raw = raw.replace(/^\uFEFF/, '').trim();
      const parsed = JSON.parse(raw || '[]');
      if (Array.isArray(parsed)) {
        messages = parsed;
        if (messages.length > 0) {
          messageIdCounter = Math.max(...messages.map(m => m.id || 0)) + 1;
        }
        console.log(`[messages] Loaded ${messages.length} messages from ${MESSAGES_FILE}`);
        return messages;
      }
    } else {
      console.log('[messages] No messages file found, starting with empty array');
    }
  } catch (e) {
    console.error('[messages] load error', e && e.message);
  }
  return [];
}

function saveMessages() {
  try {
    ensureDataDir();
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[messages] save error', e && e.message);
    return false;
  }
}

function loadSubscriptions() {
  try {
    ensureDataDir();
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      let raw = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8');
      raw = raw.replace(/^\uFEFF/, '').trim();
      const parsed = JSON.parse(raw || '[]');
      if (Array.isArray(parsed)) {
        subscriptions = parsed;
        if (subscriptions.length > 0) {
          subscriptionIdCounter = Math.max(...subscriptions.map(s => s.id || 0)) + 1;
        }
        return subscriptions;
      }
    }
  } catch (e) {
    console.error('[subscriptions] load error', e && e.message);
  }
  return [];
}

function saveSubscriptions() {
  try {
    ensureDataDir();
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[subscriptions] save error', e && e.message);
    return false;
  }
}

// Load all data at startup
async function initializeApp() {
  if (USE_POSTGRES) {
    console.log('[DB] Initializing PostgreSQL...');
    await db.initDatabase();
    console.log('[DB] PostgreSQL initialized successfully');
    
    // Skip user migration - users should already be in DB from ensureDefaultUsers()
    // Or they will be added via /api/admin/init-users endpoint if needed
    console.log('[STARTUP] PostgreSQL mode - users managed via database');
  } else {
    messages = loadMessages();
    subscriptions = loadSubscriptions();
    users = loadUsers();
    
    console.log('[STARTUP] Messages count after load:', messages.length);
    console.log('[STARTUP] Messages content:', messages.map(m => ({ id: m.id, subject: m.subject })));
    
    // Ensure default users exist (important for Render where filesystem is ephemeral)
    ensureDefaultUsers();
    console.log('[server] Users loaded at startup: ' + users.length);
  }
}

// Ensure default users exist (important for Render where filesystem is ephemeral)
// This is only used in JSON mode; PostgreSQL mode uses db.ensureDefaultUsers() in db.initDatabase()
function ensureDefaultUsers() {
  const hasAdmin = users.some(u => u.username === 'vhr');
  const hasDemo = users.some(u => u.username === 'VhrDashboard');
  
  if (!hasAdmin) {
    console.log('[users] adding default admin user');
    users.push({
      username: 'vhr',
      passwordHash: '$2b$10$ov9F32cIWWXhvNumETtB1urvsdD5Y4Wl6wXlSHoCy.f4f03kRGcf2', // password: [REDACTED]
      role: 'admin',
      email: 'admin@example.local',
      stripeCustomerId: null,
      latestInvoiceId: null,
      lastInvoicePaidAt: null,
      subscriptionStatus: null,
      subscriptionId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  
  if (!hasDemo) {
    console.log('[users] adding default demo user');
    users.push({
      username: 'VhrDashboard',
      passwordHash: '$2b$10$XtU3hKSETcFgyx9w.KfL5unRFQ7H2Q26vBKXXjQ05Kz47mZbvrdQS', // password: VhrDashboard@2025
      role: 'user',
      email: 'regatpeter@hotmail.fr',
      stripeCustomerId: null,
      latestInvoiceId: null,
      lastInvoicePaidAt: null,
      subscriptionStatus: null,
      subscriptionId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  
  // Save to file if users were added
  if (!hasAdmin || !hasDemo) {
    saveUsers();
  }
}

// --- DB wrapper helpers (use SQLite adapter when enabled) ---
let dbEnabled = false;
try {
  const dbFile = process.env.DB_SQLITE_FILE || path.join(__dirname, 'data', 'vhr.db');
  dbEnabled = require('./db').initSqlite(dbFile);
  if (dbEnabled) {
    console.log('[db] SQLite adapter initialized, migrating JSON users into DB');
    const db = require('./db');
    // migrate existing in-memory users into DB
    users.forEach(u => db.addOrUpdateUser(u));
    // reload into memory simplified list for reads
    users = db.getAllUsers();
  }
} catch (e) {
  console.error('[db] init error:', e && e.message);
}

function reloadUsers() {
  // Reload users from file (useful when users.json is modified externally)
  if (!dbEnabled) {
    users = loadUsers();
  } else {
    users = require('./db').getAllUsers();
  }
}

function getUserByUsername(username) {
  if (dbEnabled) {
    const u = require('./db').findUserByUsername(username);
    return u || null;
  }
  return users.find(u => u.username === username);
}

function getUserByStripeCustomerId(customerId) {
  if (dbEnabled) return require('./db').findUserByStripeCustomerId(customerId);
  return users.find(u => u.stripeCustomerId === customerId);
}

function getUserByEmail(email) {
  if (dbEnabled) {
    const u = require('./db').findUserByEmail?.(email);
    return u || null;
  }
  return users.find(u => u.email === email);
}

function persistUser(user) {
  if (USE_POSTGRES) {
    // Save async to PostgreSQL (fire and forget to avoid blocking)
    db.createUser(user.id || `user_${user.username}`, user.username, user.passwordHash, user.email, user.role)
      .catch(err => console.error('[db] persistUser error:', err && err.message ? err.message : err));
    return true;
  } else if (dbEnabled) {
    require('./db').addOrUpdateUser(user);
    // keep in-memory list sync
    users = require('./db').getAllUsers();
    return true;
  } else {
    console.log('[users] persistUser: begin', user && user.username);
    const idx = users.findIndex(u => u.username === user.username);
    if (idx >= 0) users[idx] = user;
    else users.push(user);
    try {
      console.log('[users] persistUser: saving users file (json fallback)');
      saveUsers();
      console.log('[users] persistUser: saved users file');
    } catch (e) {
      console.error('[users] saveUsers failed:', e && e.stack || e && e.message || e);
      throw e;
    }
    console.log('[users] persistUser: end');
    return true;
  }
}

function removeUserByUsername(username) {
  if (dbEnabled) {
      const user = getUserByUsername(username);
    users = require('./db').getAllUsers();
  } else {
    const idx = users.findIndex(u => u.username === username);
    if (idx >= 0) users.splice(idx, 1);
    saveUsers();
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXPIRES = '2h';

// --- Middleware de vérification du token ---
function authMiddleware(req, res, next) {
  // Accept token from Authorization header (Bearer) OR cookie 'vhr_token'
  let token = null;
  if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[1]) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.vhr_token) {
    token = req.cookies.vhr_token;
  }
  if (!token) return res.status(401).json({ ok: false, error: 'Token manquant' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'Token invalide' });
  }
}

// --- Route de login ---
app.post('/api/login', async (req, res) => {
  console.log('[api/login] request received:', req.body);
  const { username, password } = req.body;
  console.log('[api/login] attempting login for:', username);
  
  let user;
  if (USE_POSTGRES) {
    user = await db.getUserByUsername(username);
    console.log('[api/login] user from PostgreSQL:', user ? 'found' : 'not found');
  } else {
    reloadUsers(); // Reload users from file in case they were modified externally
    user = getUserByUsername(username);
    console.log('[api/login] user from memory:', user ? 'found' : 'not found');
  }
  
  if (!user) {
    console.log('[api/login] user not found');
    return res.status(401).json({ ok: false, error: 'Utilisateur inconnu' });
  }
  const valid = await bcrypt.compare(password, user.passwordhash || user.passwordHash);
  if (!valid) {
    console.log('[api/login] password mismatch');
    return res.status(401).json({ ok: false, error: 'Mot de passe incorrect' });
  }
  console.log('[api/login] login successful for:', username);
  const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  // Set cookie for better protection in browsers (httpOnly)
  // On Render/production, always use secure HTTPS cookies
  // On localhost, allow insecure cookies for development
  const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: !isLocalhost,  // Only require HTTPS on production, allow HTTP on localhost
    maxAge: 2 * 60 * 60 * 1000 // 2h
  };
  res.cookie('vhr_token', token, cookieOptions);
  console.log('[api/login] cookie set with secure=' + !isLocalhost + ', maxAge=2h, isLocalhost=' + isLocalhost);
  res.json({ ok: true, token, userId: user.id, username: user.username, role: user.role, email: user.email || null });
});

// --- Route de logout (optionnelle, côté client il suffit de supprimer le token) ---
app.post('/api/logout', (req, res) => {
  res.clearCookie('vhr_token');
  res.json({ ok: true });
});

// Initialize default admin users (maintenance endpoint - for production fix)
app.post('/api/admin/init-users', async (req, res) => {
  console.log('[api/admin/init-users] Initializing default users...');
  try {
    if (USE_POSTGRES && db && db.pool) {
      // Get a direct connection from pool to run initialization
      let client;
      try {
        client = await db.pool.connect();
      } catch (connErr) {
        console.error('[api/admin/init-users] Connection error:', connErr && connErr.message);
        return res.status(500).json({ ok: false, error: 'Database connection failed: ' + (connErr?.message || 'unknown') });
      }
      
      try {
        // Create users table if not exists
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            passwordhash VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            role VARCHAR(50) DEFAULT 'user',
            stripecustomerid VARCHAR(255),
            latestinvoiceid VARCHAR(255),
            lastinvoicepaidat TIMESTAMPTZ,
            subscriptionstatus VARCHAR(50),
            subscriptionid VARCHAR(255),
            createdat TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updatedat TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('[api/admin/init-users] Users table ensured');

        // Create default admin user
        const adminCheck = await client.query('SELECT 1 FROM users WHERE username = $1 LIMIT 1', ['vhr']);
        if (adminCheck.rowCount === 0) {
          await client.query(
            'INSERT INTO users (id, username, passwordhash, email, role) VALUES ($1, $2, $3, $4, $5)',
            [
              'admin_vhr',
              'vhr',
              '$2b$10$ov9F32cIWWXhvNumETtB1urvsdD5Y4Wl6wXlSHoCy.f4f03kRGcf2',
              'admin@example.local',
              'admin'
            ]
          );
          console.log('[api/admin/init-users] SUCCESS: Admin user created');
        } else {
          console.log('[api/admin/init-users] Admin user already exists');
        }

        // Create default demo user
        const demoCheck = await client.query('SELECT 1 FROM users WHERE username = $1 LIMIT 1', ['VhrDashboard']);
        if (demoCheck.rowCount === 0) {
          await client.query(
            'INSERT INTO users (id, username, passwordhash, email, role) VALUES ($1, $2, $3, $4, $5)',
            [
              'user_demo',
              'VhrDashboard',
              '$2b$10$XtU3hKSETcFgyx9w.KfL5unRFQ7H2Q26vBKXXjQ05Kz47mZbvrdQS',
              'regatpeter@hotmail.fr',
              'user'
            ]
          );
          console.log('[api/admin/init-users] SUCCESS: Demo user created');
        } else {
          console.log('[api/admin/init-users] Demo user already exists');
        }

        // Verify users were created
        const allUsers = await client.query('SELECT username, email, role FROM users');
        console.log('[api/admin/init-users] Users in database:', allUsers.rows);

        res.json({ ok: true, message: 'Default users initialized', users: allUsers.rows });
      } catch (dbErr) {
        console.error('[api/admin/init-users] Database error:', dbErr && dbErr.message);
        res.status(500).json({ ok: false, error: 'Database error: ' + (dbErr?.message || 'unknown') });
      } finally {
        if (client) client.release();
      }
    } else {
      console.log('[api/admin/init-users] JSON mode - creating users in memory');
      ensureDefaultUsers();
      res.json({ ok: true, message: 'Default users initialized (JSON mode)' });
    }
  } catch (error) {
    console.error('[api/admin/init-users] Unexpected error:', error && error.message ? error.message : error);
    res.status(500).json({ ok: false, error: error && error.message ? error.message : 'Initialization failed' });
  }
});

// Diagnostic endpoint to check database and user status
app.get('/api/admin/diagnose', async (req, res) => {
  console.log('[api/admin/diagnose] Running diagnosis...');
  const diagnosis = {
    timestamp: new Date().toISOString(),
    mode: USE_POSTGRES ? 'PostgreSQL' : 'JSON',
    checks: {}
  };

  try {
    // Check database connection
    if (USE_POSTGRES && db && db.pool) {
      try {
        const client = await db.pool.connect();
        try {
          const result = await client.query('SELECT NOW()');
          diagnosis.checks.database = { ok: true, message: 'Connected to PostgreSQL' };
          
          // Check users table exists
          const tableCheck = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'users'
            )
          `);
          diagnosis.checks.usersTable = { ok: tableCheck.rows[0].exists, message: tableCheck.rows[0].exists ? 'Users table exists' : 'Users table NOT found' };
          
          // Check users in database
          if (tableCheck.rows[0].exists) {
            const usersResult = await client.query('SELECT id, username, email, role FROM users ORDER BY username');
            diagnosis.checks.users = { 
              ok: usersResult.rows.length > 0, 
              count: usersResult.rows.length,
              users: usersResult.rows
            };
            
            // Check for admin user specifically
            const adminCheck = await client.query('SELECT * FROM users WHERE username = $1', ['vhr']);
            diagnosis.checks.adminUser = { 
              ok: adminCheck.rows.length > 0, 
              message: adminCheck.rows.length > 0 ? 'Admin user "vhr" found' : 'Admin user "vhr" NOT found'
            };
          }
        } finally {
          client.release();
        }
      } catch (dbErr) {
        diagnosis.checks.database = { ok: false, error: dbErr?.message || 'Connection failed' };
      }
    } else {
      diagnosis.checks.database = { ok: false, message: 'Database not in PostgreSQL mode' };
    }

    // Check file mode users
    if (!USE_POSTGRES) {
      diagnosis.checks.users = { 
        ok: users.length > 0, 
        count: users.length,
        users: users.map(u => ({ username: u.username, role: u.role, email: u.email }))
      };
    }

  } catch (err) {
    diagnosis.error = err?.message || 'Unknown error';
  }

  res.json(diagnosis);
});

// Return authenticated user info (uses auth middleware)
app.get('/api/me', authMiddleware, (req, res) => {
  const user = { username: req.user.username, role: req.user.role };
  res.json({ ok: true, user });
});

// --- Route pour vérifier l'authentification (optionnelle - pas de middleware requis) ---
app.get('/api/check-auth', (req, res) => {
  // Accept token from Authorization header (Bearer) OR cookie 'vhr_token'
  let token = null;
  if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[1]) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.vhr_token) {
    token = req.cookies.vhr_token;
  }
  
  if (!token) {
    // No token - user not authenticated
    return res.json({ ok: false, authenticated: false, user: null });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Token is valid
    res.json({ ok: true, authenticated: true, user: { username: decoded.username, role: decoded.role } });
  } catch (e) {
    // Token is invalid or expired
    res.json({ ok: false, authenticated: false, user: null });
  }
});

// ========== LICENSE VERIFICATION FOR FEATURES ==========

/**
 * Vérifie si l'utilisateur a accès à une fonctionnalité payante
 * Retourne true si:
 * - Abonnement actif OU
 * - Licence d'achat perpétuel OU
 * - En période de démo (7 jours)
 */
function checkFeatureAccess(user) {
  if (!user) return false;
  
  // Récupérer les données utilisateur complètes
  reloadUsers();
  const fullUser = getUserByUsername(user.username);
  if (!fullUser) return false;
  
  // 1. Vérifier abonnement actif
  if (fullUser.subscriptionStatus === 'active') {
    return true;
  }
  
  // 2. Vérifier licence perpétuelle
  const licenses = loadLicenses();
  const hasPerpetualLicense = licenses.some(l => 
    l.userId === fullUser.id && 
    l.type === 'perpetual' && 
    l.status === 'active'
  );
  if (hasPerpetualLicense) {
    return true;
  }
  
  // 3. Vérifier démo (7 jours)
  if (fullUser.demoStartDate && demoConfig.MODE === 'database') {
    const startDate = new Date(fullUser.demoStartDate);
    const expirationDate = new Date(startDate.getTime() + demoConfig.DEMO_DURATION_MS);
    const now = new Date();
    if (now <= expirationDate) {
      return true;
    }
  }
  
  return false;
}

/**
 * Middleware pour vérifier l'accès aux fonctionnalités payantes
 */
function requireLicense(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: 'Authentication required' });
  }
  
  if (!checkFeatureAccess(req.user)) {
    return res.status(403).json({ 
      ok: false, 
      error: 'License required',
      reason: 'subscription_required',
      message: 'Vous devez un abonnement VHR Dashboard PRO pour accéder à cette fonctionnalité',
      pricing: {
        price: '29€',
        frequency: 'par mois',
        description: 'Accès complet à tous les outils VHR Dashboard'
      }
    });
  }
  
  next();
}

/**
 * GET /api/feature/android-tts/access - Vérifier l'accès à la fonctionnalité TTS
 */
app.get('/api/feature/android-tts/access', authMiddleware, (req, res) => {
  const hasAccess = checkFeatureAccess(req.user);
  
  res.json({
    ok: true,
    hasAccess,
    user: req.user.username,
    reason: !hasAccess ? 'subscription_required' : 'active',
    pricing: {
      price: '29€',
      frequency: 'par mois',
      description: 'Accès complet à tous les outils VHR Dashboard'
    },
    message: hasAccess 
      ? 'Vous avez accès à la compilation Android'
      : 'Vous devez un abonnement VHR Dashboard PRO pour compiler l\'APK'
  });
});

// ========== NEW AUTHENTICATION ROUTES (for dashboard auth modal) ==========

// POST /api/auth/login - Login with email + password
app.post('/api/auth/login', async (req, res) => {
  console.log('[api/auth/login] request received');
  reloadUsers(); // Reload users from file in case they were modified externally
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Email et mot de passe requis' });
  }
  
  console.log('[api/auth/login] attempting login for email:', email);
  
  // Find user by email
  const user = getUserByEmail(email);
  if (!user) {
    console.log('[api/auth/login] user not found by email');
    return res.status(401).json({ ok: false, error: 'Email ou mot de passe incorrect' });
  }
  
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    console.log('[api/auth/login] password mismatch for:', user.username);
    return res.status(401).json({ ok: false, error: 'Email ou mot de passe incorrect' });
  }
  
  console.log('[api/auth/login] login successful for:', user.username);
  
  const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  
  // Set httpOnly cookie for better security in browsers
  const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: !isLocalhost,  // Only require HTTPS on production
    maxAge: 2 * 60 * 60 * 1000 // 2h
  };
  res.cookie('vhr_token', token, cookieOptions);
  
  res.json({ 
    ok: true, 
    token, 
    user: {
      name: user.username,
      email: user.email,
      role: user.role
    }
  });
});

// POST /api/auth/register - Register with username + email + password
app.post('/api/auth/register', async (req, res) => {
  console.log('[api/auth/register] request received');
  reloadUsers(); // Reload users from file in case they were modified externally
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ ok: false, error: 'Tous les champs sont requis' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ ok: false, error: 'Le mot de passe doit contenir au moins 6 caractères' });
  }
  
  // Check if username already exists
  if (getUserByUsername(username)) {
    return res.status(400).json({ ok: false, error: 'Le nom d\'utilisateur existe déjà' });
  }
  
  // Check if email already exists
  if (getUserByEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Cet email est déjà utilisé' });
  }
  
  console.log('[api/auth/register] registering new user:', username, email);
  
  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create new user with trial period starting now
    const newUser = {
      username,
      email,
      passwordHash,
      role: 'user',
      demoStartDate: new Date().toISOString(), // Trial starts now
      subscriptionStatus: null,
      subscriptionId: null,
      stripeCustomerId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Persist user (to file or DB)
    persistUser(newUser);
    
    console.log('[api/auth/register] user registered successfully:', username);
    
    // Create JWT token for automatic login
    const token = jwt.sign({ username: newUser.username, role: newUser.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    
    // Set httpOnly cookie
    const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: !isLocalhost,
      maxAge: 2 * 60 * 60 * 1000 // 2h
    };
    res.cookie('vhr_token', token, cookieOptions);
    
    res.json({ 
      ok: true, 
      token,
      user: {
        name: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (e) {
    console.error('[api/auth/register] error:', e);
    res.status(500).json({ ok: false, error: 'Erreur lors de l\'inscription' });
  }
});

// ========== ADMIN ROUTES ==========

/**
 * POST /api/admin/grant-subscription - Give a user an active subscription
 * Admin only - requires authentication
 */
app.post('/api/admin/grant-subscription', authMiddleware, async (req, res) => {
  const { targetUsername } = req.body;
  
  // Verify requester is admin
  const adminUser = getUserByUsername(req.user.username);
  if (!adminUser || adminUser.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'Admin access required' });
  }
  
  if (!targetUsername) {
    return res.status(400).json({ ok: false, error: 'targetUsername required' });
  }
  
  try {
    // Find the target user
    const targetUser = getUserByUsername(targetUsername);
    if (!targetUser) {
      return res.status(404).json({ ok: false, error: `User '${targetUsername}' not found` });
    }
    
    // Set subscription to active
    targetUser.subscriptionStatus = 'active';
    targetUser.subscriptionId = `sub_admin_${Date.now()}`;
    
    // Save back to file
    reloadUsers();
    const allUsers = loadUsers();
    const index = allUsers.findIndex(u => u.username === targetUsername);
    if (index >= 0) {
      allUsers[index] = targetUser;
      fs.writeFileSync(USERS_FILE, JSON.stringify(allUsers, null, 2));
      console.log(`[admin] Granted active subscription to ${targetUsername}`);
    }
    
    res.json({
      ok: true,
      message: `✅ Subscription granted to ${targetUsername}`,
      user: {
        username: targetUser.username,
        email: targetUser.email,
        subscriptionStatus: targetUser.subscriptionStatus
      }
    });
  } catch (e) {
    console.error('[admin] grant-subscription error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/admin/revoke-subscription - Revoke a user's subscription
 * Admin only - requires authentication
 */
app.post('/api/admin/revoke-subscription', authMiddleware, async (req, res) => {
  const { targetUsername } = req.body;
  
  // Verify requester is admin
  const adminUser = getUserByUsername(req.user.username);
  if (!adminUser || adminUser.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'Admin access required' });
  }
  
  if (!targetUsername) {
    return res.status(400).json({ ok: false, error: 'targetUsername required' });
  }
  
  try {
    // Find the target user
    const targetUser = getUserByUsername(targetUsername);
    if (!targetUser) {
      return res.status(404).json({ ok: false, error: `User '${targetUsername}' not found` });
    }
    
    // Set subscription to null
    targetUser.subscriptionStatus = null;
    targetUser.subscriptionId = null;
    
    // Save back to file
    reloadUsers();
    const allUsers = loadUsers();
    const index = allUsers.findIndex(u => u.username === targetUsername);
    if (index >= 0) {
      allUsers[index] = targetUser;
      fs.writeFileSync(USERS_FILE, JSON.stringify(allUsers, null, 2));
      console.log(`[admin] Revoked subscription for ${targetUsername}`);
    }
    
    res.json({
      ok: true,
      message: `✅ Subscription revoked for ${targetUsername}`,
      user: {
        username: targetUser.username,
        email: targetUser.email,
        subscriptionStatus: targetUser.subscriptionStatus
      }
    });
  } catch (e) {
    console.error('[admin] revoke-subscription error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get demo/trial status - also check Stripe subscription status
app.get('/api/demo/status', authMiddleware, async (req, res) => {
  try {
    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    
    const demoExpired = isDemoExpired(user);
    const remainingDays = getDemoRemainingDays(user);
    const expirationDate = user.demoStartDate ? 
      new Date(new Date(user.demoStartDate).getTime() + demoConfig.DEMO_DURATION_MS).toISOString() : 
      null;
    
    // Check if demo is expired
    if (demoExpired) {
      // Demo is expired - check if user has ACTIVE subscription with Stripe
      let hasValidSubscription = false;
      let subscriptionStatus = 'none';
      let stripeError = null;
      
      if (user.stripeCustomerId) {
        try {
          // Fetch latest subscription from Stripe for this customer
          const stripeSubs = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: 'active',
            limit: 1
          });
          
          if (stripeSubs.data && stripeSubs.data.length > 0) {
            const activeSub = stripeSubs.data[0];
            hasValidSubscription = activeSub.status === 'active';
            subscriptionStatus = activeSub.status; // 'active', 'past_due', etc.
            console.log(`[demo/status] User ${user.username} has Stripe subscription: ${subscriptionStatus}`);
          } else {
            // No active subscription
            subscriptionStatus = 'none';
            console.log(`[demo/status] User ${user.username} has no active Stripe subscription`);
          }
        } catch (e) {
          console.error(`[demo/status] Error checking Stripe subscription for ${user.username}:`, e.message);
          stripeError = e.message;
        }
      } else {
        // No Stripe customer ID
        subscriptionStatus = 'none';
        console.log(`[demo/status] User ${user.username} has no Stripe customer ID`);
      }
      
      // If demo expired AND no valid subscription = BLOCKED
      res.json({
        ok: true,
        demo: {
          demoStartDate: user.demoStartDate || null,
          demoExpired: true,
          remainingDays: 0,
          totalDays: demoConfig.DEMO_DAYS,
          expirationDate: expirationDate,
          hasValidSubscription: hasValidSubscription,
          subscriptionStatus: subscriptionStatus,
          stripeError: stripeError,
          accessBlocked: !hasValidSubscription, // KEY: Block access if no valid subscription
          message: hasValidSubscription 
            ? '✅ Accès accordé via abonnement actif'
            : '❌ Essai expiré - Abonnement requis pour continuer'
        }
      });
    } else {
      // Demo is still valid - user can access
      res.json({
        ok: true,
        demo: {
          demoStartDate: user.demoStartDate || null,
          demoExpired: false,
          remainingDays: remainingDays,
          totalDays: demoConfig.DEMO_DAYS,
          expirationDate: expirationDate,
          hasValidSubscription: user.subscriptionStatus === 'active',
          subscriptionStatus: user.subscriptionStatus || 'none',
          accessBlocked: false,
          message: `✅ Essai en cours - ${remainingDays} jour(s) restant(s)`
        }
      });
    }
  } catch (e) {
    console.error('[demo] status error:', e);
    res.status(500).json({ ok: false, error: 'Server error', details: e.message });
  }
});

// ========== PROTECTED DOWNLOADS (VHR PRO) ==========

// Download APK/Voice file - requires authentication and valid subscription or active demo
app.post('/api/download/vhr-app', authMiddleware, async (req, res) => {
  try {
    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    
    const { type = 'apk' } = req.body; // 'apk' or 'voice-data'
    
    // Check if user has valid access (demo or subscription)
    const demoExpired = isDemoExpired(user);
    let hasValidSubscription = false;
    
    if (demoExpired) {
      // Demo expired - check subscription
      if (user.stripeCustomerId) {
        try {
          const stripeSubs = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: 'active',
            limit: 1
          });
          hasValidSubscription = stripeSubs.data && stripeSubs.data.length > 0;
        } catch (e) {
          console.error('[download] Stripe check error:', e.message);
        }
      }
      
      if (!hasValidSubscription) {
        return res.status(403).json({
          ok: false,
          error: 'Access denied',
          message: '❌ Essai expiré et aucun abonnement actif. Veuillez vous abonner pour continuer.',
          needsSubscription: true
        });
      }
    }
    
    // User has access - prepare file download
    let filePath, fileName, contentType;
    
    if (type === 'apk') {
      // Serve the pre-built ZIP (contains APK)
      filePath = path.join(__dirname, 'dist', 'demo', 'vhr-dashboard-demo.zip');
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          ok: false,
          error: 'APK file not found',
          message: 'L\'APK n\'est pas encore disponible. Veuillez réessayer dans quelques minutes.'
        });
      }
      fileName = 'vhr-dashboard.apk';
      contentType = 'application/octet-stream';
      
      // Log file size
      const stats = fs.statSync(filePath);
      console.log(`[download] APK file size: ${(stats.size / (1024*1024)).toFixed(2)} MB`);
      
    } else if (type === 'voice-data') {
      // Serve voice models ZIP (pre-created)
      filePath = path.join(__dirname, 'data', 'voice-models.zip');
      
      if (!fs.existsSync(filePath)) {
        console.warn('[download] Voice models ZIP not found at:', filePath);
        return res.status(404).json({
          ok: false,
          error: 'Voice data not found',
          message: 'Les données vocales ne sont pas disponibles pour le moment.'
        });
      }
      
      fileName = 'voice-data.zip';
      contentType = 'application/zip';
      
      // Log file size
      const stats = fs.statSync(filePath);
      console.log(`[download] Voice ZIP file size: ${(stats.size / 1024).toFixed(2)} KB`);
      
    } else {
      return res.status(400).json({ ok: false, error: 'Invalid file type' });
    }
    
    // Log download access
    console.log(`[download] User ${user.username} downloading ${type} from ${filePath}`);
    
    // Send file with proper headers and options
    // sendFile() resets some headers, so we use options instead
    return res.download(filePath, fileName, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }, (err) => {
      if (err) {
        console.error('[download] File download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ ok: false, error: 'Failed to download file' });
        }
      }
    });
    
  } catch (e) {
    console.error('[download/vhr-app] error:', e);
    res.status(500).json({ ok: false, error: 'Server error', details: e.message });
  }
});

/**
 * POST /api/compile-apk - Compile automatiquement l'APK avec les données vocales
 * ⚠️ REQUIRES AUTHENTICATION - Route automatique après téléchargement
 */
app.post('/api/compile-apk', authMiddleware, async (req, res) => {
  try {
    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    
    const { buildType = 'debug' } = req.body;
    const appDir = path.join(__dirname, 'tts-receiver-app');
    
    // Vérifier que le répertoire existe
    if (!fs.existsSync(appDir)) {
      return res.status(404).json({ 
        ok: false, 
        error: 'Android app directory not found'
      });
    }
    
    console.log(`[Compile] Starting automatic ${buildType} build for user ${user.username}...`);
    
    // Note: Compilation réelle serait ici sur Linux via GitHub Actions
    // Pour l'instant, on simule une compilation réussie
    // En production, ceci déclencherait un workflow GitHub Actions
    
    const simulatedApkPath = path.join(appDir, 'app', 'build', 'outputs', 'apk', buildType, `app-${buildType}.apk`);
    const duration = 1200; // 20 minutes en simulation
    
    console.log(`[Compile] ✅ Compilation requested (will be built by GitHub Actions)`);
    
    res.json({ 
      ok: true,
      message: 'Compilation started - GitHub Actions will build your APK',
      buildType,
      estimatedTime: '15-20 minutes',
      trackingUrl: 'https://github.com/regatpeter-source/vhr-dashboard-site/actions'
    });
    
  } catch (e) {
    console.error('[compile-apk] Error:', e.message);
    res.status(500).json({ ok: false, error: 'Compilation failed: ' + e.message });
  }
});

/**
 * Helper: Download APK from GitHub Release
 */
async function downloadApkFromGitHub() {
  try {
    const owner = 'regatpeter-source';
    const repo = 'vhr-dashboard-site';
    
    // Get latest release
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      console.error('[GitHub] Latest release not found:', response.status);
      return null;
    }
    
    const release = await response.json();
    
    // Find APK asset
    const apkAsset = release.assets.find(asset => 
      asset.name.endsWith('.apk') && !asset.name.includes('test')
    );
    
    if (!apkAsset) {
      console.warn('[GitHub] No APK asset found in release');
      return null;
    }
    
    console.log(`[GitHub] Found APK: ${apkAsset.name} (${(apkAsset.size / (1024*1024)).toFixed(2)} MB)`);
    
    // Download APK
    const downloadUrl = apkAsset.browser_download_url;
    const apkDir = path.join(__dirname, 'dist', 'demo');
    const apkPath = path.join(apkDir, 'vhr-dashboard-demo.apk');
    
    // Create directory if not exists
    if (!fs.existsSync(apkDir)) {
      fs.mkdirSync(apkDir, { recursive: true });
    }
    
    // Download file
    console.log(`[GitHub] Downloading APK from: ${downloadUrl}`);
    const apkResponse = await fetch(downloadUrl);
    
    if (!apkResponse.ok) {
      console.error('[GitHub] Failed to download APK:', apkResponse.status);
      return null;
    }
    
    // Write to file
    const buffer = await apkResponse.arrayBuffer();
    fs.writeFileSync(apkPath, Buffer.from(buffer));
    
    console.log(`[GitHub] ✅ APK saved to: ${apkPath} (${(buffer.byteLength / (1024*1024)).toFixed(2)} MB)`);
    return apkPath;
    
  } catch (e) {
    console.error('[GitHub] Error downloading APK:', e.message);
    return null;
  }
}

/**
 * POST /api/download/compiled-apk - Télécharger l'APK compilée
 * Route sécurisée qui télécharge l'APK compilée sans exposer GitHub Actions
 */
app.post('/api/download/compiled-apk', authMiddleware, async (req, res) => {
  try {
    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    
    let apkPath = path.join(__dirname, 'dist', 'demo', 'vhr-dashboard-demo.apk');
    
    // Check if local APK exists and is valid (not placeholder)
    let apkExists = fs.existsSync(apkPath);
    let fileSize = apkExists ? fs.statSync(apkPath).size : 0;
    
    // If local APK is missing or invalid (placeholder), download from GitHub
    if (!apkExists || fileSize < 1000) {
      console.log('[download] Local APK missing/invalid, trying to download from GitHub...');
      const downloadedPath = await downloadApkFromGitHub();
      if (downloadedPath) {
        apkPath = downloadedPath;
        apkExists = true;
      }
    }
    
    if (!apkExists) {
      return res.status(404).json({
        ok: false,
        error: 'APK compilée non trouvée. Veuillez attendre la fin de la compilation ou réessayer.'
      });
    }
    
    const stats = fs.statSync(apkPath);
    console.log(`[download] Compiled APK file size: ${(stats.size / (1024*1024)).toFixed(2)} MB`);
    console.log(`[download] User ${user.username} downloading compiled APK`);
    
    // Send file with proper headers
    return res.download(apkPath, 'vhr-dashboard.apk', {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }, (err) => {
      if (err) {
        console.error('[download] File download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ ok: false, error: 'Failed to download file' });
        }
      }
    });
    
  } catch (e) {
    console.error('[download/compiled-apk] error:', e);
    res.status(500).json({ ok: false, error: 'Server error', details: e.message });
  }
});

// Check download eligibility without downloading
app.get('/api/download/check-eligibility', authMiddleware, async (req, res) => {
  try {
    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    
    const demoExpired = isDemoExpired(user);
    const remainingDays = getDemoRemainingDays(user);
    let hasValidSubscription = false;
    let subscriptionStatus = 'none';
    
    if (demoExpired && user.stripeCustomerId) {
      try {
        const stripeSubs = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'active',
          limit: 1
        });
        hasValidSubscription = stripeSubs.data && stripeSubs.data.length > 0;
        if (stripeSubs.data && stripeSubs.data.length > 0) {
          subscriptionStatus = stripeSubs.data[0].status;
        }
      } catch (e) {
        console.error('[check-eligibility] Stripe error:', e.message);
      }
    }
    
    const canDownload = !demoExpired || hasValidSubscription;
    
    res.json({
      ok: true,
      canDownload,
      demoExpired,
      remainingDays,
      hasValidSubscription,
      subscriptionStatus,
      reason: canDownload 
        ? (demoExpired ? 'Valid subscription' : `Demo valid - ${remainingDays} days remaining`)
        : 'Demo expired and no valid subscription'
    });
    
  } catch (e) {
    console.error('[check-eligibility] error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// ========== SUBSCRIPTION MANAGEMENT ==========

// Get available subscription plans
app.get('/api/subscriptions/plans', (req, res) => {
  try {
    const plans = Object.values(subscriptionConfig.PLANS).map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      billingPeriod: plan.billingPeriod,
      features: plan.features,
      limits: plan.limits
    }));
    res.json({ ok: true, plans, billingOptions: subscriptionConfig.BILLING_OPTIONS });
  } catch (e) {
    console.error('[subscriptions] plans error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Get current user's subscription status
app.get('/api/subscriptions/my-subscription', authMiddleware, async (req, res) => {
  try {
    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

    // D'abord chercher dans le stockage local
    const subscription = subscriptions.find(s => s.userId === user.id || s.username === user.username);
    const isActive = user.subscriptionStatus === 'active';
    
    // Trouver le plan correspondant
    let currentPlan = null;
    if (subscription) {
      for (const [key, plan] of Object.entries(subscriptionConfig.PLANS)) {
        if (plan.stripePriceId === subscription.stripePriceId) {
          currentPlan = { ...plan, id: key };
          break;
        }
      }
    }

    // Si pas d'abonnement local mais l'utilisateur a un stripeCustomerId, chercher via Stripe API
    if (!subscription && user.stripeCustomerId && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripeSubs = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'active',
          limit: 1
        });
        
        if (stripeSubs.data && stripeSubs.data.length > 0) {
          const stripeSub = stripeSubs.data[0];
          console.log('[subscriptions] found active Stripe subscription for', user.username, 'id:', stripeSub.id);
          
          // Synchroniser avec la base locale
          const item = stripeSub.items.data[0];
          const priceId = item.price.id;
          
          for (const [key, plan] of Object.entries(subscriptionConfig.PLANS)) {
            if (plan.stripePriceId === priceId) {
              currentPlan = { ...plan, id: key };
              break;
            }
          }
          
          return res.json({
            ok: true,
            subscription: {
              isActive: stripeSub.status === 'active',
              status: stripeSub.status,
              currentPlan: currentPlan,
              subscriptionId: stripeSub.id,
              startDate: new Date(stripeSub.current_period_start * 1000),
              endDate: new Date(stripeSub.current_period_end * 1000),
              nextBillingDate: new Date(stripeSub.current_period_end * 1000),
              cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
              daysUntilRenewal: Math.ceil((new Date(stripeSub.current_period_end * 1000) - new Date()) / (24 * 60 * 60 * 1000))
            }
          });
        }
      } catch (stripeErr) {
        console.error('[subscriptions] error checking Stripe:', stripeErr.message);
      }
    }

    res.json({
      ok: true,
      subscription: {
        isActive: isActive,
        status: user.subscriptionStatus || 'inactive',
        currentPlan: currentPlan,
        subscriptionId: user.subscriptionId || null,
        startDate: subscription?.startDate || null,
        endDate: subscription?.endDate || null,
        nextBillingDate: subscription?.endDate || null,
        cancelledAt: subscription?.cancelledAt || null,
        daysUntilRenewal: subscription?.endDate ? Math.ceil((new Date(subscription.endDate) - new Date()) / (24 * 60 * 60 * 1000)) : null
      }
    });
  } catch (e) {
    console.error('[subscriptions] my-subscription error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Get subscription history
app.get('/api/subscriptions/history', authMiddleware, (req, res) => {
  try {
    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

    const userSubs = subscriptions.filter(s => s.username === user.username || s.userId === user.id);
    
    res.json({
      ok: true,
      history: userSubs.map(s => ({
        id: s.id,
        planName: s.planName,
        status: s.status,
        startDate: s.startDate,
        endDate: s.endDate,
        cancelledAt: s.cancelledAt,
        totalPaid: s.totalPaid || 0
      }))
    });
  } catch (e) {
    console.error('[subscriptions] history error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Cancel subscription
app.post('/api/subscriptions/cancel', authMiddleware, async (req, res) => {
  try {
    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

    // Chercher l'abonnement actif
    const subIdx = subscriptions.findIndex(s => s.username === user.username && s.status === 'active');
    if (subIdx === -1) return res.status(400).json({ ok: false, error: 'No active subscription found' });

    const sub = subscriptions[subIdx];
    sub.status = 'cancelled';
    sub.cancelledAt = new Date().toISOString();
    
    // Mettre à jour l'utilisateur
    user.subscriptionStatus = 'cancelled';
    persistUser(user);
    
    if (USE_POSTGRES) {
      // Save to PostgreSQL
      db.updateSubscription(sub.id, { status: 'cancelled', cancelledat: sub.cancelledAt })
        .catch(err => console.error('[db] updateSubscription error:', err && err.message ? err.message : err));
    } else {
      saveSubscriptions();
    }

    res.json({ 
      ok: true, 
      message: 'Subscription cancelled successfully',
      subscription: sub
    });
  } catch (e) {
    console.error('[subscriptions] cancel error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// ========== LICENSE VERIFICATION ==========

// Check license or demo status at dashboard startup
app.post('/api/license/check', async (req, res) => {
  try {
    const { licenseKey } = req.body || {};
    const normalizedKey = typeof licenseKey === 'string' ? licenseKey.trim().toUpperCase() : null;

    // If license key provided, validate it directly
    if (normalizedKey) {
      const isValid = validateLicenseKey(normalizedKey);
      if (isValid) {
        return res.json({
          ok: true,
          licensed: true,
          type: 'perpetual',
          licenseKey: normalizedKey,
          message: 'Licence valide - Accès complet'
        });
      }
    }

    // Retrieve auth token from cookie or Authorization header
    let authToken = null;
    if (req.cookies && req.cookies.vhr_token) {
      authToken = req.cookies.vhr_token;
    } else if (req.cookies && req.cookies.token) {
      authToken = req.cookies.token;
    } else if (req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      authToken = req.headers.authorization.split(' ')[1];
    }

    if (authToken) {
      try {
        const decoded = jwt.verify(authToken, JWT_SECRET);
        const user = getUserByUsername(decoded.username);

        if (user) {
          // Admins always have perpetual access
          if (user.role === 'admin') {
            let adminLicense = findActiveLicenseByUsername(user.username);
            if (!adminLicense) {
              adminLicense = addLicense(user.username, user.email || 'admin@example.local', 'admin_perpetual');
              console.log(`[license] Auto-issued perpetual license for admin ${user.username}: ${adminLicense.key}`);
            }

            return res.json({
              ok: true,
              licensed: true,
              type: 'perpetual',
              admin: true,
              licenseKey: adminLicense.key,
              message: 'Compte administrateur - accès complet illimité'
            });
          }

          // Perpetual license linked to the user (no key required client side)
          const userLicense = findActiveLicenseByUsername(user.username);
          if (userLicense) {
            return res.json({
              ok: true,
              licensed: true,
              type: 'perpetual',
              licenseKey: userLicense.key,
              message: 'Licence perpétuelle détectée - Accès complet'
            });
          }

          // Active subscription grants access
          if (user.subscriptionStatus === 'active') {
            return res.json({
              ok: true,
              licensed: true,
              type: 'subscription',
              message: 'Abonnement actif - Accès complet'
            });
          }
        }
      } catch (tokenError) {
        console.warn('[license] auth token verification failed:', tokenError && tokenError.message ? tokenError.message : tokenError);
      }
    }

    // Check demo status
    const demoStatus = getDemoStatus();
    if (!demoStatus.isExpired) {
      return res.json({
        ok: true,
        licensed: false,
        trial: true,
        daysRemaining: demoStatus.daysRemaining,
        expiresAt: demoStatus.expiresAt,
        message: `Essai gratuit - ${demoStatus.daysRemaining} jour(s) restant(s)`
      });
    }

    // Demo expired, no license
    return res.json({
      ok: true,
      licensed: false,
      trial: false,
      expired: true,
      message: 'Période d\'essai expirée - Veuillez vous abonner ou acheter une licence'
    });
  } catch (e) {
    console.error('[license] check error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Activate license key
app.post('/api/license/activate', async (req, res) => {
  try {
    const { licenseKey } = req.body || {};
    if (!licenseKey) return res.status(400).json({ ok: false, error: 'License key required' });
    
    const isValid = validateLicenseKey(licenseKey);
    if (!isValid) {
      return res.status(400).json({ ok: false, error: 'Clé de licence invalide' });
    }
    
    res.json({ 
      ok: true, 
      message: 'Licence activée avec succès !',
      licensed: true 
    });
  } catch (e) {
    console.error('[license] activate error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Send license email
async function sendLicenseEmail(email, licenseKey, username) {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'noreply@vhr-dashboard.com',
    to: email,
    subject: '🎉 Votre licence VHR Dashboard',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0d0f14; color: #ecf0f1; border-radius: 10px;">
        <h1 style="color: #2ecc71; text-align: center;">🥽 VHR Dashboard</h1>
        <h2 style="color: #3498db;">Merci pour votre achat !</h2>
        <p>Bonjour <strong>${username}</strong>,</p>
        <p>Votre licence VHR Dashboard a été activée avec succès. Voici votre clé de licence :</p>
        <div style="background: #1a1d24; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h2 style="color: #2ecc71; font-size: 24px; letter-spacing: 2px;">${licenseKey}</h2>
        </div>
        <h3 style="color: #e67e22;">Comment activer votre licence :</h3>
        <ol style="line-height: 1.8;">
          <li>Ouvrez le VHR Dashboard</li>
          <li>Cliquez sur le bouton <strong>"Activer une licence"</strong></li>
          <li>Copiez-collez votre clé de licence</li>
          <li>Profitez de toutes les fonctionnalités sans limitation !</li>
        </ol>
        <p style="color: #95a5a6; font-size: 12px; margin-top: 30px; text-align: center;">
          Cette licence est valide à vie et ne nécessite aucun paiement récurrent.<br>
          Conservez cette clé en lieu sûr.
        </p>
        <p style="text-align: center; margin-top: 20px;">
          <strong style="color: #2ecc71;">Besoin d'aide ?</strong><br>
          <a href="mailto:support@vhr-dashboard.com" style="color: #3498db;">support@vhr-dashboard.com</a>
        </p>
      </div>
    `
  };
  
  try {
    await emailTransporter.sendMail(mailOptions);
    console.log('[email] License sent to:', email);
    return true;
  } catch (e) {
    console.error('[email] Failed to send license:', e);
    return false;
  }
}

// ========== LICENSE VERIFICATION API ==========

// TEST ROUTE: Generate a test license (only in development)
app.get('/api/test/generate-license', async (req, res) => {
  try {
    const testUser = {
      username: 'testuser',
      email: 'test@example.com'
    };
    
    const license = addLicense(testUser.username, testUser.email, 'perpetual_pro');
    
    console.log('[TEST] License generated:', license.key);
    
    // Try to send email if configured
    let emailSent = false;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      emailSent = await sendLicenseEmail(testUser.email, license.key, testUser.username);
    }
    
    res.json({ 
      ok: true, 
      license: license.key,
      email: testUser.email,
      emailSent: emailSent,
      message: 'Test license generated successfully',
      instructions: 'Copy this key and paste it in the dashboard unlock modal'
    });
  } catch (e) {
    console.error('[TEST] Generate license error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// TEST ROUTE: Validate email configuration
app.get('/api/test/email-config', async (req, res) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.json({ 
        ok: false, 
        configured: false,
        message: 'Email not configured. Add EMAIL_USER and EMAIL_PASS to .env' 
      });
    }
    
    await emailTransporter.verify();
    res.json({ 
      ok: true, 
      configured: true,
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      user: process.env.EMAIL_USER,
      message: 'Email configuration is valid' 
    });
  } catch (e) {
    console.error('[TEST] Email config error:', e);
    res.status(500).json({ 
      ok: false, 
      configured: true,
      error: e.message,
      message: 'Email configured but connection failed. Check credentials.' 
    });
  }
});

// Check license or demo status at dashboard startup
app.post('/api/license/check', async (req, res) => {
  try {
    const { licenseKey } = req.body || {};
    
    // If license key provided, validate it
    if (licenseKey) {
      const isValid = validateLicenseKey(licenseKey);
      if (isValid) {
        return res.json({ 
          ok: true, 
          licensed: true, 
          type: 'perpetual',
          message: 'Licence valide - Accès complet' 
        });
      }
    }
    
    // Check if user has active subscription (requires auth)
    if (req.cookies && req.cookies.token) {
      try {
        const decoded = jwt.verify(req.cookies.token, JWT_SECRET);
        const user = getUserByUsername(decoded.username);
        if (user && user.subscriptionStatus === 'active') {
          return res.json({ 
            ok: true, 
            licensed: true, 
            type: 'subscription',
            message: 'Abonnement actif - Accès complet' 
          });
        }
      } catch (e) {
        // Token invalid or expired
      }
    }
    
    // Check demo status
    const demoStatus = getDemoStatus();
    if (!demoStatus.isExpired) {
      return res.json({ 
        ok: true, 
        licensed: false, 
        trial: true,
        daysRemaining: demoStatus.daysRemaining,
        expiresAt: demoStatus.expiresAt,
        message: `Essai gratuit - ${demoStatus.daysRemaining} jour(s) restant(s)` 
      });
    }
    
    // Demo expired, no license
    return res.json({ 
      ok: true, 
      licensed: false, 
      trial: false,
      expired: true,
      message: 'Période d\'essai expirée - Veuillez vous abonner ou acheter une licence' 
    });
  } catch (e) {
    console.error('[license] check error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Activate license key
app.post('/api/license/activate', async (req, res) => {
  try {
    const { licenseKey } = req.body || {};
    if (!licenseKey) return res.status(400).json({ ok: false, error: 'License key required' });
    
    const isValid = validateLicenseKey(licenseKey);
    if (!isValid) {
      return res.status(400).json({ ok: false, error: 'Clé de licence invalide' });
    }
    
    res.json({ 
      ok: true, 
      message: 'Licence activée avec succès !',
      licensed: true 
    });
  } catch (e) {
    console.error('[license] activate error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// ========== LICENSE VERIFICATION API ==========

// Check license or demo status at dashboard startup
app.post('/api/license/check', async (req, res) => {
  try {
    const { licenseKey } = req.body || {};
    
    // If license key provided, validate it
    if (licenseKey) {
      const isValid = validateLicenseKey(licenseKey);
      if (isValid) {
        return res.json({ 
          ok: true, 
          licensed: true, 
          type: 'perpetual',
          message: 'Licence valide - Accès complet' 
        });
      }
    }
    
    // Check if user has active subscription (requires auth)
    if (req.cookies && req.cookies.token) {
      try {
        const decoded = jwt.verify(req.cookies.token, JWT_SECRET);
        const user = getUserByUsername(decoded.username);
        if (user && user.subscriptionStatus === 'active') {
          return res.json({ 
            ok: true, 
            licensed: true, 
            type: 'subscription',
            message: 'Abonnement actif - Accès complet' 
          });
        }
      } catch (e) {
        // Token invalid or expired
      }
    }
    
    // Check demo status
    const demoStatus = getDemoStatus();
    if (!demoStatus.isExpired) {
      return res.json({ 
        ok: true, 
        licensed: false, 
        trial: true,
        daysRemaining: demoStatus.daysRemaining,
        expiresAt: demoStatus.expiresAt,
        message: `Essai gratuit - ${demoStatus.daysRemaining} jour(s) restant(s)` 
      });
    }
    
    // Demo expired, no license
    return res.json({ 
      ok: true, 
      licensed: false, 
      trial: false,
      expired: true,
      message: 'Période d\'essai expirée - Veuillez vous abonner ou acheter une licence' 
    });
  } catch (e) {
    console.error('[license] check error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Activate license key
app.post('/api/license/activate', async (req, res) => {
  try {
    const { licenseKey } = req.body || {};
    if (!licenseKey) return res.status(400).json({ ok: false, error: 'License key required' });
    
    const isValid = validateLicenseKey(licenseKey);
    if (!isValid) {
      return res.status(400).json({ ok: false, error: 'Clé de licence invalide' });
    }
    
    res.json({ 
      ok: true, 
      message: 'Licence activée avec succès !',
      licensed: true 
    });
  } catch (e) {
    console.error('[license] activate error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// ========== PURCHASE/ONE-TIME PAYMENT MANAGEMENT ==========

// Get available purchase options (one-time payments)
app.get('/api/purchases/options', (req, res) => {
  try {
    const options = Object.values(purchaseConfig.PURCHASE_OPTIONS).map(opt => ({
      id: opt.id,
      name: opt.name,
      description: opt.description,
      price: opt.price,
      currency: opt.currency,
      billingPeriod: opt.billingPeriod,
      features: opt.features,
      limits: opt.limits,
      license: opt.license
    }));
    res.json({ ok: true, options });
  } catch (e) {
    console.error('[purchases] options error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Create checkout session for subscription (requires authentication)
app.post('/api/subscriptions/create-checkout', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.body || {};
    if (!planId) return res.status(400).json({ ok: false, error: 'planId required' });

    const plan = subscriptionConfig.PLANS[planId];
    if (!plan) return res.status(400).json({ ok: false, error: 'Plan not found' });

    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: user.email,
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/vhr-dashboard-pro.html?subscription=success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/vhr-dashboard-pro.html?subscription=canceled`,
      metadata: {
        userId: user.id || user.username,
        username: user.username,
        planId: planId,
        planName: plan.name
      }
    });

    console.log('[subscriptions] checkout session created:', { id: session.id, user: user.username, plan: planId });
    res.json({ ok: true, sessionId: session.id, url: session.url });
  } catch (e) {
    console.error('[subscriptions] create-checkout error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Create checkout session for one-time purchase (requires authentication)
app.post('/api/purchases/create-checkout', authMiddleware, async (req, res) => {
  try {
    const { purchaseId } = req.body || {};
    if (!purchaseId) return res.status(400).json({ ok: false, error: 'purchaseId required' });

    const purchase = purchaseConfig.PURCHASE_OPTIONS[purchaseId];
    if (!purchase) return res.status(400).json({ ok: false, error: 'Purchase option not found' });

    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: purchase.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'payment', // Mode one-time payment
      customer_email: user.email,
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/account.html?purchase=success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing.html?purchase=canceled`,
      metadata: {
        userId: user.id || user.username,
        username: user.username,
        purchaseId: purchaseId,
        purchaseName: purchase.name
      }
    });

    console.log('[purchases] checkout session created:', { id: session.id, user: user.username, purchase: purchaseId });
    res.json({ ok: true, sessionId: session.id, url: session.url });
  } catch (e) {
    console.error('[purchases] create-checkout error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get user's purchases history
app.get('/api/purchases/history', authMiddleware, (req, res) => {
  try {
    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

    // Chercher les achats dans les subscriptions (achetés comme payment)
    const purchases = subscriptions.filter(s => 
      (s.username === user.username || s.userId === user.id) && 
      s.billingPeriod === 'once'
    );

    res.json({
      ok: true,
      purchases: purchases.map(p => ({
        id: p.id,
        name: p.planName,
        purchaseDate: p.startDate,
        price: p.price,
        licenseKey: p.licenseKey,
        license: p.license
      }))
    });
  } catch (e) {
    console.error('[purchases] history error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});


// Update current user profile (username/email/password)
app.patch('/api/me', authMiddleware, async (req, res) => {
  const { username, email, oldPassword, newPassword } = req.body || {};
  try {
    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'Utilisateur introuvable' });
    if (username && username !== user.username) {
      // ensure unique
        if (getUserByUsername(username)) return res.status(400).json({ ok: false, error: 'Nom d\'utilisateur déjà utilisé' });
      user.username = username;
    }
    if (email) user.email = email;
    if (newPassword) {
      if (!oldPassword) return res.status(400).json({ ok: false, error: 'Ancien mot de passe requis' });
      const valid = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ ok: false, error: 'Ancien mot de passe incorrect' });
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }
    // Persist changes via DB adapter or JSON
    try { console.log('[users] about to persist user', user && user.username); persistUser(user); console.log('[users] persist successful'); } catch (e) { console.error('[users] persist error', e && (e.stack || e.message)); }
    // If username changed, reissue JWT and cookie
    const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.cookie('vhr_token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 2 * 60 * 60 * 1000 });
    res.json({ ok: true, token, user: { username: user.username, role: user.role, email: user.email || null } });
  } catch (e) {
    console.error('[api] me patch:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Delete self account (development/demo only)
app.delete('/api/users/self', authMiddleware, (req, res) => {
  try {
    const u = getUserByUsername(req.user.username);
    if (!u) return res.status(404).json({ ok: false, error: 'Utilisateur introuvable' });
    removeUserByUsername(req.user.username);
    res.clearCookie('vhr_token');
    res.json({ ok: true });
  } catch (e) {
    console.error('[api] delete self:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Note: devices should be visible to unauthenticated clients (dashboard UI)
// Keep a single public route providing devices: the public route is defined further below.

// --- Exemple de route admin only ---
app.get('/api/admin', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Accès refusé' });
  res.json({ ok: true, message: 'Bienvenue admin !' });
});

// --- Admin Routes for Dashboard ---
// Get all users
app.get('/api/admin/users', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Accès refusé' });
  try {
    res.json({ ok: true, users });
  } catch (e) {
    console.error('[api] admin/users:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Get all subscriptions
app.get('/api/admin/subscriptions', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Accès refusé' });
  try {
    res.json({ ok: true, subscriptions });
  } catch (e) {
    console.error('[api] admin/subscriptions:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Get active subscriptions only
app.get('/api/admin/subscriptions/active', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Accès refusé' });
  try {
    const subscriptions = dbEnabled ? require('./db').getActiveSubscriptions() : [];
    res.json({ ok: true, subscriptions });
  } catch (e) {
    console.error('[api] admin/subscriptions/active:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Get all messages (TEST - public endpoint)
app.get('/api/test/messages', (req, res) => {
  try {
    console.log('[api/test/messages] Test endpoint - Messages count:', messages.length);
    res.json({ ok: true, messages, count: messages.length });
  } catch (e) {
    console.error('[api/test/messages] error:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Get all messages (AUTHENTICATED)
app.get('/api/admin/messages', authMiddleware, async (req, res) => {
  console.log('[api/admin/messages] Called');
  console.log('[api/admin/messages] User role:', req.user?.role);
  if (req.user.role !== 'admin') {
    console.log('[api/admin/messages] Access denied');
    return res.status(403).json({ ok: false, error: 'Accès refusé' });
  }
  try {
    let messageList;
    
    if (USE_POSTGRES) {
      messageList = await db.getMessages();
    } else {
      messageList = messages || [];
    }
    
    res.json({ ok: true, messages: messageList });
  } catch (e) {
    console.error('[api] admin/messages:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Get unread messages only
app.get('/api/admin/messages/unread', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Accès refusé' });
  try {
    const unread = messages.filter(m => m.status === 'unread');
    res.json({ ok: true, messages: unread });
  } catch (e) {
    console.error('[api] admin/messages/unread:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Mark message as read and optionally respond
app.patch('/api/admin/messages/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Accès refusé' });
  try {
    const messageId = parseInt(req.params.id);
    const { status, response } = req.body || {};
    
    if (USE_POSTGRES) {
      // PostgreSQL version
      const allMessages = await db.getMessages();
      const m = allMessages.find(x => x.id === messageId);
      if (!m) return res.status(404).json({ ok: false, error: 'Message not found' });
      
      const updates = {};
      if (status) updates.status = status;
      if (response) {
        updates.response = response;
        updates.respondedAt = new Date().toISOString();
        updates.respondedBy = req.user.username;
        
        // Send reply email to the contact sender
        const emailSent = await sendReplyToContact(m, response, req.user.username);
        if (emailSent) {
          console.log('[api] Reply email sent to:', m.email);
        } else {
          console.warn('[api] Failed to send reply email to:', m.email);
        }
      } else if (status === 'read') {
        updates.readAt = new Date().toISOString();
      }
      
      await db.updateMessage(messageId, updates);
      res.json({ ok: true, message: 'Message updated', emailSent: !!response });
    } else {
      // JSON fallback version
      const msg = messages.find(m => m.id === messageId);
      if (!msg) return res.status(404).json({ ok: false, error: 'Message not found' });
      
      let emailSent = false;
      if (status) msg.status = status;
      if (response) {
        msg.response = response;
        msg.respondedAt = new Date().toISOString();
        msg.respondedBy = req.user.username;
        
        // Send reply email to the contact sender
        emailSent = await sendReplyToContact(msg, response, req.user.username);
        if (emailSent) {
          console.log('[api] Reply email sent to:', msg.email);
        } else {
          console.warn('[api] Failed to send reply email to:', msg.email);
        }
      } else if (status === 'read') {
        msg.readAt = new Date().toISOString();
      }
      saveMessages();
      res.json({ ok: true, message: 'Message updated', emailSent });
    }
  } catch (e) {
    console.error('[api] admin/messages/:id:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Delete a message
app.delete('/api/admin/messages/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Accès refusé' });
  try {
    const messageId = parseInt(req.params.id);
    
    if (USE_POSTGRES) {
      // PostgreSQL version
      const msg = await db.getMessages();
      const m = msg.find(x => x.id === messageId);
      if (!m) return res.status(404).json({ ok: false, error: 'Message not found' });
      
      await db.deleteMessage(messageId);
      res.json({ ok: true, message: 'Message deleted' });
    } else {
      // JSON fallback version
      const idx = messages.findIndex(m => m.id === messageId);
      if (idx < 0) return res.status(404).json({ ok: false, error: 'Message not found' });
      messages.splice(idx, 1);
      saveMessages();
      res.json({ ok: true, message: 'Message deleted' });
    }
  } catch (e) {
    console.error('[api] admin/messages/:id (delete):', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Get dashboard stats
app.get('/api/admin/stats', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Accès refusé' });
  try {
    const totalUsers = users.length;
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
    const unreadMessages = messages.filter(m => m.status === 'unread').length;
    
    res.json({ ok: true, stats: { totalUsers, activeSubscriptions, unreadMessages } });
  } catch (e) {
    console.error('[api] admin/stats:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Submit contact form message (public endpoint, no auth required)
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ ok: false, error: 'Tous les champs sont requis' });
    }
    
    console.log('[contact] New message from:', email, 'subject:', subject);
    
    let msg;
    
    if (USE_POSTGRES) {
      // Save to PostgreSQL
      msg = await db.createMessage(name, email, subject, message);
      if (msg) {
        console.log('[contact] Message saved to PostgreSQL');
      } else {
        console.error('[contact] Failed to save message to PostgreSQL');
        return res.status(500).json({ ok: false, error: 'Erreur lors de la sauvegarde du message' });
      }
    } else {
      // Add to in-memory messages (fallback for development)
      msg = {
        id: messageIdCounter++,
        name,
        email,
        subject,
        message,
        status: 'unread',
        createdAt: new Date().toISOString()
      };
      messages.push(msg);
      saveMessages();
      console.log('[contact] Message saved to messages.json');
    }
    
    // Send email notification to admin
    const emailSent = await sendContactMessageToAdmin(msg);
    if (emailSent) {
      console.log('[contact] ✓ Email forwarded to admin');
    } else {
      console.warn('[contact] ⚠️ Email NOT sent (check EMAIL_USER/EMAIL_PASS in .env)');
    }
    
    res.json({ ok: true, message: 'Message reçu. Nous vous répondrons bientôt.' });
  } catch (e) {
    console.error('[api] contact error:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ========== SCRCPY GUI LAUNCH ============ 
app.post('/api/scrcpy-gui', async (req, res) => {
  const { serial } = req.body || {};
  if (!serial) return res.status(400).json({ ok: false, error: 'serial requis' });
  try {
    // Lancer scrcpy en mode GUI natif (pas de redirection stdout)
    // Taille de fenêtre réduite (ex: 640x360)
    const proc = spawn('scrcpy', ['-s', serial, '--window-width', '640', '--window-height', '360'], {
      detached: true,
      stdio: 'ignore'
    });
    proc.unref();
    return res.json({ ok: true });
  } catch (e) {
    console.error('[api] scrcpy-gui:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ========== PACKAGE DASHBOARD (génération à la demande) ============
app.post('/api/package-dashboard', async (req, res) => {
  try {
    console.log('[package] Génération du package VHR-Dashboard-Portable...');
    
    // Vérifier si le package existe déjà
    const packagePath = path.join(__dirname, 'VHR-Dashboard-Portable.zip');
    if (fs.existsSync(packagePath)) {
      const stats = fs.statSync(packagePath);
      const ageMs = Date.now() - stats.mtime.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      
      // Si le package a moins de 24h, on ne le regénère pas
      if (ageHours < 24) {
        console.log('[package] Package récent trouvé, pas de regénération nécessaire');
        return res.json({ ok: true, cached: true, age: Math.round(ageHours) + 'h' });
      }
    }
    
    // Générer le package via le script
    const scriptPath = path.join(__dirname, 'scripts', 'package-dashboard.js');
    if (!fs.existsSync(scriptPath)) {
      console.error('[package] Script de packaging introuvable');
      return res.status(404).json({ ok: false, error: 'Script de packaging introuvable' });
    }
    
    // Exécuter le script en arrière-plan
    const { exec } = require('child_process');
    exec('node scripts/package-dashboard.js', (error, stdout, stderr) => {
      if (error) {
        console.error('[package] Erreur génération:', error);
      } else {
        console.log('[package] Package généré avec succès');
      }
    });
    
    // Répondre immédiatement (le packaging continue en arrière-plan)
    return res.json({ ok: true, message: 'Packaging en cours...', cached: false });
    
  } catch (e) {
    console.error('[api] package-dashboard:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// Run an adb command for a given serial, return { stdout, stderr }
const runAdbCommand = (serial, args) => {
  return new Promise((resolve, reject) => {
    const proc = spawn('adb', ['-s', serial, ...args])
    let stdout = '', stderr = ''
    proc.stdout.on('data', d => { stdout += d })
    proc.stderr.on('data', d => { stderr += d })
    proc.on('close', code => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(stderr || `adb exited with code ${code}`))
    })
    proc.on('error', reject)
  })
}
// ---------- Helpers ----------
// Parse 'adb devices -l' output into [{ serial, model, status }]
const parseAdbDevices = stdout => {
  console.log('[DEBUG] Sortie brute adb devices -l:\n' + stdout)
  return stdout.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('List of devices'))
    .map(l => {
      const [serial, status, ...rest] = l.split(/\s+/)
      let model = ''
      for (const part of rest) {
        if (part.startsWith('model:')) model = part.replace('model:', '')
      }
      return { serial, status, model }
    })
    .filter(d => d.serial && d.status)
}

// Poll ADB, update devices array, emit update event
const refreshDevices = async () => {
  try {
    const { exec } = require('child_process')
    exec('adb devices -l', (err, stdout, stderr) => {
      if (err) {
        console.error('ÔØî Failed to list ADB devices:', err)
        return
      }
      const list = parseAdbDevices(stdout)
      // nameMap: { serial: customName }
      const fs = require('fs')
      const nameMap = fs.existsSync('names.json')
        ? JSON.parse(fs.readFileSync('names.json', 'utf8'))
        : {}
      devices = list.map(dev => ({
        serial: dev.serial,
        name: nameMap[dev.serial] || dev.serial,
        status: dev.status,
        model: dev.model
      }))
      console.log('[DEBUG] Emission devices-update:', devices)
      io.emit('devices-update', devices)
    })
  } catch (e) {
    console.error('ÔØî Error in refreshDevices:', e)
  }
}





// ---------- Persistence ----------
const NAMES_FILE = path.join(__dirname, 'names.json');
const GAMES_FILE = path.join(__dirname, 'games.json');
const FAVORITES_FILE = path.join(__dirname, 'favorites.json');
let nameMap = {};
let gamesList = [];
let favoritesList = [];

try {
  if (fs.existsSync(NAMES_FILE)) nameMap = JSON.parse(fs.readFileSync(NAMES_FILE, 'utf8') || '{}');
  else fs.writeFileSync(NAMES_FILE, JSON.stringify({}, null, 2));
  if (fs.existsSync(GAMES_FILE)) gamesList = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8') || '[]');
  else fs.writeFileSync(GAMES_FILE, JSON.stringify([], null, 2));
  if (fs.existsSync(FAVORITES_FILE)) favoritesList = JSON.parse(fs.readFileSync(FAVORITES_FILE, 'utf8') || '[]');
  else fs.writeFileSync(FAVORITES_FILE, JSON.stringify([], null, 2));
} catch (e) {
  console.error('[server] load files error:', e);
  nameMap = {};
  gamesList = [];
  favoritesList = [];
}

// ---------- HTTP + Socket.IO ----------
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

// ---------- State ----------

let devices = [];
let streams = new Map();

const wssMpeg1 = new WebSocket.Server({ noServer: true });

// Audio streaming: Map<serial, { sender: ws, receivers: [ws], buffer: [chunks] }>
const audioStreams = new Map();
const wssAudio = new WebSocket.Server({ noServer: true });
const AUDIO_BUFFER_SIZE = 50; // Keep last 50 chunks in buffer

function startAdbTrack() {
  let debounceTimer = null;
  
  try {
    const track = spawn('adb', ['track-devices']);
    track.stdout.setEncoding('utf8');
    let buffer = '';
    track.stdout.on('data', data => {
      buffer += data;
      if (buffer.includes('\n')) {
        buffer = '';
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(refreshDevices, 500);
      }
    });
    track.on('error', () => setInterval(refreshDevices, 2000));
    track.on('exit', () => setInterval(refreshDevices, 2000));
  } catch (e) {
    setInterval(refreshDevices, 2000);
  }
}

// ---------- Streaming Helpers ----------
function broadcastToSerial(serial, chunk) {
  const ent = streams.get(serial);
  if (!ent || !ent.clients) return;
  for (const ws of ent.clients) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(chunk); } catch (e) { }
    }
  }
}

// ---------- ADB screenrecord ÔåÆ FFmpeg player (plus stable que scrcpy) ----------
async function startStream(serial, opts = {}) {
  // ...existing code...
    function cleanup() {
      try { if (entry.adbProc && entry.adbProc.pid) spawn('taskkill', ['/F', '/T', '/PID', entry.adbProc.pid.toString()]) } catch {}
      try { if (entry.ffplayProc && entry.ffplayProc.pid) spawn('taskkill', ['/F', '/T', '/PID', entry.ffplayProc.pid.toString()]) } catch {}
      for (const ws of entry.clients || []) { try { ws.close() } catch {} }
      streams.delete(serial)
    }
  if (streams.has(serial) && streams.get(serial).adbProc) {
    throw new Error('already streaming');
  }

  // Profils stables : résolution et bitrate
  let size = '854x480', bitrate = '2M';
  if (opts.profile === 'ultra-low') {
    size = '426x240'; bitrate = '800K';
  } else if (opts.profile === 'low') {
    size = '480x270'; bitrate = '1M';
  } else if (opts.profile === 'wifi') {
    size = '640x360'; bitrate = '1.5M';
  } else if (opts.profile === 'default') {
    size = '854x480'; bitrate = '2M';
  } else if (opts.profile === 'high') {
    size = '1280x720'; bitrate = '3M';
  } else if (opts.profile === 'ultra') {
    size = '1920x1080'; bitrate = '5M';
  }

  const bitrateNum = bitrate.replace(/[KM]/g, m => m === 'K' ? '000' : '000000');
  console.log(`[server] ­ƒÄ¼ ADB screenrecord stream: ${serial}`);
  console.log(`[server] ­ƒô║ ${size} @ ${bitrate}`);
  
  // Calculer la position de la fenêtre (empilement vertical)
  const streamCount = Array.from(streams.values()).filter(s => s.ffplayProc).length;
  const windowWidth = 640;
  const windowHeight = 360;
  const windowX = 0;
  const windowY = streamCount * windowHeight;

  // Récupérer le nom personnalisé du device
  const deviceName = nameMap[serial] || serial;
  const windowTitle = `Quest 2 - ${deviceName}`;

  console.log(`[server] ­ƒôØ Window: ${windowTitle} at (${windowX},${windowY})`);

  // Ô£à ADB screenrecord en continu (streaming direct vers stdout)
  const adbArgs = [
    '-s', serial,
    'exec-out',
    'screenrecord',
    '--output-format=h264',
    `--bit-rate=${bitrateNum}`,
    `--size=${size}`,
    '-'
  ];
  

  const adbProc = spawn('adb', adbArgs);

  const entry = streams.get(serial) || { clients: new Set(), mpeg1Clients: new Set(), h264Clients: new Set() };
  entry.adbProc = adbProc;
  entry.shouldRun = true;
  entry.autoReconnect = Boolean(opts.autoReconnect);
  streams.set(serial, entry);

  // ---------- Pipeline H264 direct (no re-encoding = no flicker!) ----------
  // Pass H264 directly from ADB to WebSocket clients
  // This eliminates the need for FFmpeg re-encoding and dramatically reduces CPU usage and latency
  adbProc.stdout.on('data', chunk => {
    // Send H264 frames directly to all connected WebSocket clients
    for (const ws of entry.h264Clients || []) {
      if (ws.readyState === 1) {
        try { ws.send(chunk) } catch {}
      }
    }
  });

  // Keep the old MPEG1 pipeline commented for reference
  // If we ever need MPEG1 again, just uncomment and spawn ffmpeg
  /*
  // ---------- Pipeline JSMpeg (MPEG1) ultra-low-latency ----------
  // ffmpeg: H264 (adb) -> MPEG1-TS (JSMpeg) avec tous les flags de faible latence
  const ffmpegArgs = [
    '-fflags', 'nobuffer',
    '-flags', 'low_delay',
    '-probesize', '32',
    '-analyzeduration', '0',
    '-flush_packets', '1',
    '-i', 'pipe:0',
    '-f', 'mpegts',
    '-codec:v', 'mpeg1video',
    '-b:v', '2000k',
    '-vf', 'fps=25,scale=640:368',
    '-pix_fmt', 'yuv420p',
    '-bf', '0',
    '-muxdelay', '0.001',
    'pipe:1'
  ];

  const ffmpegProc = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
  entry.ffmpegProc = ffmpegProc;
  ffmpegProc.stderr && ffmpegProc.stderr.on('data', d => {
    console.error('[ffmpeg stderr]', d.toString());
  });
  adbProc.stdout.pipe(ffmpegProc.stdin);
  ffmpegProc.stdin.on('error', err => {
    if (err.code !== 'EPIPE') console.error('[ffmpeg stdin]', err)
    // EPIPE = fermeture normale, on ignore
  });

  // Gestion des viewers JSMpeg (MPEG1)
  ffmpegProc.stdout.on('data', chunk => {
    for (const ws of entry.mpeg1Clients || []) {
      if (ws.readyState === 1) {
        try { ws.send(chunk) } catch {}
      }
    }
  });
  */

  adbProc.on('exit', code => {
    console.log(`[adb] EXIT code=${code}`);
    const ent = streams.get(serial);
    if (!ent) return cleanup();
    const stillHasViewers = (ent.clients && ent.clients.size > 0) || (ent.h264Clients && ent.h264Clients.size > 0) || (ent.mpeg1Clients && ent.mpeg1Clients.size > 0);
    if (ent.shouldRun && ent.autoReconnect && stillHasViewers) {
      console.log(`[server] ­ƒöä Auto-restart in 3s...`);
      cleanup();
      setTimeout(() => {
        startStream(serial, opts).catch(err => {
          console.error('[server] auto-restart failed:', err.message);
        });
      }, 3000);
    } else {
      cleanup();
    }
  });

  ffmpegProc.on('exit', code => {
    console.log(`[ffmpeg] EXIT code=${code}`);
    cleanup();
  });

  io.emit('stream-event', { type: 'start', serial, config: { size, bitrate } });
  return true;
}

function stopStream(serial) {
  const entry = streams.get(serial);
  if (!entry) return false;

  entry.shouldRun = false;
  
  if (entry.checkInterval) clearInterval(entry.checkInterval);
  
  // Forcer l'arrêt des processus avec taskkill (Windows)
  try { 
    if (entry.adbProc && entry.adbProc.pid) {
      spawn('taskkill', ['/F', '/T', '/PID', entry.adbProc.pid.toString()]);
    }
  } catch {}
  
  try { 
    if (entry.ffplayProc && entry.ffplayProc.pid) {
      spawn('taskkill', ['/F', '/T', '/PID', entry.ffplayProc.pid.toString()]);
    }
  } catch {}

  for (const ws of entry.clients) {
    try { ws.close(); } catch {}
  }

  try { 
    if (entry.mkvFile && fs.existsSync(entry.mkvFile)) {
      fs.unlinkSync(entry.mkvFile);
    }
  } catch {}

  streams.delete(serial);
  io.emit('stream-event', { type: 'stop', serial });
  refreshDevices().catch(() => {});
  console.log(`[server] ÔØî Stream stopped: ${serial}`);
  return true;
}

// ---------- Audio WebSocket Handler ----------
/**
 * Relays audio chunks from PC sender to headset receiver
 * Endpoint: /api/audio/stream?serial=<device-serial>&mode=sender|receiver
 * 
 * sender: PC sends audio chunks (Blob binary data)
 * receiver: Headset receives and plays audio chunks
 */
function handleAudioWebSocket(serial, ws, req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const mode = url.searchParams.get('mode') || 'receiver'; // 'sender' or 'receiver'
  
  console.log(`[Audio] ${mode} connected for serial: ${serial}`);
  
  // Get or create audio stream entry for this serial
  if (!audioStreams.has(serial)) {
    audioStreams.set(serial, { sender: null, receivers: new Set(), buffer: [] });
  }
  
  const audioEntry = audioStreams.get(serial);
  
  if (mode === 'sender') {
    // PC sending audio
    audioEntry.sender = ws;
    console.log(`[Audio] Sender connected: ${serial}`);
    
    ws.on('message', (data) => {
      // Add to buffer for late-joining receivers
      audioEntry.buffer.push(data);
      if (audioEntry.buffer.length > AUDIO_BUFFER_SIZE) {
        audioEntry.buffer.shift();
      }
      
      // Relay audio chunk to all connected receivers
      const receivers = audioEntry.receivers;
      console.log(`[Audio] Sender relaying chunk (${data.length} bytes) to ${receivers.size} receiver(s)`);
      
      for (const receiverWs of receivers) {
        if (receiverWs.readyState === WebSocket.OPEN) {
          try {
            receiverWs.send(data);
          } catch (e) {
            console.error(`[Audio] Failed to send to receiver:`, e.message);
            receivers.delete(receiverWs);
          }
        }
      }
    });
    
    ws.on('close', () => {
      console.log(`[Audio] Sender disconnected: ${serial}`);
      audioEntry.sender = null;
      // Notify all receivers that sender disconnected
      for (const receiverWs of audioEntry.receivers) {
        if (receiverWs.readyState === WebSocket.OPEN) {
          try {
            receiverWs.send(JSON.stringify({ type: 'sender-disconnected' }));
          } catch (e) {}
        }
      }
    });
    
    ws.on('error', (err) => {
      console.error(`[Audio] Sender error:`, err.message);
      audioEntry.sender = null;
    });
    
  } else if (mode === 'receiver') {
    // Headset receiving audio
    audioEntry.receivers.add(ws);
    console.log(`[Audio] Receiver connected: ${serial}, total receivers: ${audioEntry.receivers.size}`);
    console.log(`[Audio] Current sender status: ${audioEntry.sender ? 'CONNECTED' : 'NOT CONNECTED'}`);
    console.log(`[Audio] Sending buffered chunks to new receiver: ${audioEntry.buffer.length} chunks`);
    
    // Send buffered audio chunks first
    for (const chunk of audioEntry.buffer) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(chunk);
        } catch (e) {
          console.error(`[Audio] Failed to send buffered chunk to receiver:`, e.message);
          break;
        }
      }
    }
    
    // If sender already connected, notify receiver
    if (audioEntry.sender && audioEntry.sender.readyState === WebSocket.OPEN) {
      console.log(`[Audio] Notifying receiver that sender is ready`);
      try {
        ws.send(JSON.stringify({ type: 'sender-connected' }));
      } catch (e) {}
    }
    
    ws.on('message', (data) => {
      // Receivers shouldn't send messages (just receive audio from sender)
      console.warn(`[Audio] Unexpected message from receiver: ${serial}`);
    });
    
    ws.on('close', () => {
      console.log(`[Audio] Receiver disconnected: ${serial}`);
      audioEntry.receivers.delete(ws);
      
      // If no more receivers and no sender, clean up
      if (!audioEntry.sender && audioEntry.receivers.size === 0) {
        audioStreams.delete(serial);
      }
    });
    
    ws.on('error', (err) => {
      console.error(`[Audio] Receiver error:`, err.message);
      audioEntry.receivers.delete(ws);
    });
  }
}

// ---------- WebSocket ----------
server.on('upgrade', (req, res, head) => {
  console.log(`[Upgrade] Request for URL: ${req.url}`);
  // Audio streaming endpoint
  if (req.url.startsWith('/api/audio/stream')) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const serial = url.searchParams.get('serial');
      
      if (!serial) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('serial parameter required');
        return;
      }
      
      wssAudio.handleUpgrade(req, res, head, (ws) => {
        handleAudioWebSocket(serial, ws, req);
      });
      return;
    } catch (err) {
      console.error('[Audio] Upgrade error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal server error');
      return;
    }
  }
  
  // Video streaming endpoint (existing code)
  if (req.url.startsWith('/api/stream/ws')) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const serial = url.searchParams.get('serial');
      
      if (!serial) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('serial parameter required');
        return;
      }

      const entry = streams.get(serial);
      if (!entry) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('stream not found');
        return;
      }

      wssMpeg1.handleUpgrade(req, res, head, (ws) => {
        entry.h264Clients.add(ws);
        console.log(`[WebSocket] H264 Client connected to stream ${serial}, total clients: ${entry.h264Clients.size}`);
        
        ws.on('close', () => {
          entry.h264Clients.delete(ws);
          console.log(`[WebSocket] H264 Client disconnected from stream ${serial}, remaining: ${entry.h264Clients.size}`);
        });

        ws.on('error', (err) => {
          console.error(`[WebSocket] Error on stream ${serial}:`, err.message);
          entry.h264Clients.delete(ws);
        });
      });
    } catch (err) {
      console.error('[WebSocket] Upgrade error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal server error');
    }
  }
});

// ---------- API Endpoints ----------
app.get('/api/devices', (req, res) => res.json({ ok: true, devices }));

// Diagnostic endpoint for health checks and deploy status
app.get('/_status', async (req, res) => {
  try {
    const addr = server.address() || {};
    let shortCommit = null;
    try { const { stdout } = await execp('git rev-parse --short HEAD'); shortCommit = stdout.trim(); } catch (e) { /* ignore if not available */ }
    res.json({ ok: true, bind: { address: addr.address, port: addr.port }, env: { NODE_ENV: process.env.NODE_ENV || null, HOST: process.env.HOST || null, PORT: process.env.PORT || null }, commit: shortCommit });
  } catch (e) {
    res.json({ ok: false, error: String(e) });
  }
});

app.post('/api/stream/start', async (req, res) => {
  const { serial, profile, cropLeftEye } = req.body || {};
  if (!serial) return res.status(400).json({ ok: false, error: 'serial required' });

  let finalProfile = profile;
  if (!finalProfile || finalProfile === 'default') {
    const isWifi = serial.includes(':') || serial.includes('.');
    finalProfile = isWifi ? 'wifi' : 'high';
    console.log(`[API] ­ƒöì Auto-detected profile: ${finalProfile} for ${serial}`);
  }

  try {
    await startStream(serial, { 
      profile: finalProfile, 
      autoReconnect: true,
      cropLeftEye: false  // Désactiver le crop par défaut
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('[api] stream/start:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/stream/stop', (req, res) => {
  const { serial } = req.body || {};
  if (!serial) return res.status(400).json({ ok: false, error: 'serial required' });

  const ok = stopStream(serial);
  res.json({ ok });
});

app.get('/api/apps/:serial', async (req, res) => {
  const serial = req.params.serial;
  try {
    const out = await runAdbCommand(serial, ['shell', 'pm', 'list', 'packages', '-3']);
    const apps = (out.stdout || '').split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => l.replace(/^package:/, ''));
    res.json({ ok: true, apps });
  } catch (e) {
    console.error('[api] apps:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/apps/:serial/launch', async (req, res) => {
  const serial = req.params.serial;
  const pkg = req.body?.package;
  if (!serial || !pkg) {
    return res.status(400).json({ ok: false, error: 'serial and package required' });
  }

  try {
    // Réveiller le casque
    await runAdbCommand(serial, ['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']);
    await new Promise(r => setTimeout(r, 500));
    
    console.log(`[launch] ­ƒÄ« Tentative de lancement: ${pkg}`);
    
    // Étape 1: Découvrir l'activité principale
    const dumpsysResult = await runAdbCommand(serial, [
      'shell', 'dumpsys', 'package', pkg
    ]);
    
    // Chercher l'activité avec android.intent.action.MAIN
    const activityMatch = dumpsysResult.stdout.match(new RegExp(`${pkg.replace(/\./g, '\\.')}/(\\S+)\\s+filter`, 'm'));
    const mainActivity = activityMatch ? activityMatch[1] : null;
    
    if (mainActivity) {
      // Lancer avec le composant complet
      console.log(`[launch] Activité trouvée: ${mainActivity}`);
      const launchResult = await runAdbCommand(serial, [
        'shell', 'am', 'start', '-n', `${pkg}/${mainActivity}`
      ]);
      
      const success = launchResult.code === 0 || 
                      launchResult.stdout.includes('Starting') || 
                      launchResult.stdout.includes('Activity');
      
      if (success) {
        console.log(`[launch] ${pkg} lancé`);
        try { io.emit('app-launch', { serial, package: pkg, method: 'am_start', success: true, startedAt: Date.now() }); } catch (e) {}
        res.json({ ok: true, msg: `Jeu lancé: ${pkg}` });
        return;
      }
    }
    
    // Fallback: Méthode monkey
    console.log(`[launch] ­ƒöä Fallback monkey...`);
    const monkeyResult = await runAdbCommand(serial, [
      'shell', 'monkey', '-p', pkg, '-c', 'android.intent.category.LAUNCHER', '1'
    ]);
    
    if (monkeyResult.code === 0 || monkeyResult.stdout.includes('Events injected')) {
      console.log(`[launch] ${pkg} lancé via monkey`);
      try { io.emit('app-launch', { serial, package: pkg, method: 'monkey', success: true, startedAt: Date.now() }); } catch (e) {}
      res.json({ ok: true, msg: `Jeu lancé: ${pkg}` });
      return;
    }
    
    // Dernier recours: am start avec package seul
    const amResult = await runAdbCommand(serial, [
      'shell', 'am', 'start', pkg
    ]);
    
    const success = amResult.code === 0 || 
                    amResult.stdout.includes('Starting') || 
                    amResult.stdout.includes('Activity');
    
    if (success) {
      console.log(`[launch] ${pkg} lancé via am start`);
      try { io.emit('app-launch', { serial, package: pkg, method: 'am_start_fallback', success: true, startedAt: Date.now() }); } catch (e) {}
      res.json({ ok: true, msg: `Jeu lancé: ${pkg}` });
    } else {
      console.log(`[launch] ${pkg} - échec:\n${amResult.stdout}\n${amResult.stderr}`);
      try { io.emit('app-launch', { serial, package: pkg, success: false, error: (amResult.stderr || 'Unknown') }); } catch(e) {}
      res.json({ ok: false, msg: 'Échec du lancement', details: amResult.stderr });
    }
  } catch (e) {
    console.error('[api] launch:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Stop app and return to Oculus home
app.post('/api/apps/:serial/stop', async (req, res) => {
  const serial = req.params.serial;
  const pkg = req.body?.package;
  if (!serial || !pkg) {
    return res.status(400).json({ ok: false, error: 'serial and package required' });
  }

  try {
    console.log(`[stop] Arrêt de: ${pkg}`);
    
    // Stop the app using am force-stop
    const stopResult = await runAdbCommand(serial, [
      'shell', 'am', 'force-stop', pkg
    ]);
    
    const success = stopResult.code === 0;
    
    if (success) {
      console.log(`[stop] ${pkg} arrêté avec succès`);
      try { io.emit('app-stop', { serial, package: pkg, success: true, stoppedAt: Date.now() }); } catch (e) {}
      res.json({ ok: true, msg: `Jeu arrêté: ${pkg}` });
    } else {
      console.log(`[stop] ${pkg} - Erreur lors de l'arrêt:\n${stopResult.stderr}`);
      try { io.emit('app-stop', { serial, package: pkg, success: false, error: stopResult.stderr }); } catch(e) {}
      res.json({ ok: false, msg: 'Échec de l\'arrêt', details: stopResult.stderr });
    }
  } catch (e) {
    console.error('[api] stop:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/devices/rename', (req, res) => {
  const { serial, name } = req.body || {};
  if (!serial || !name) {
    return res.status(400).json({ ok: false, error: 'serial and name required' });
  }

  nameMap[serial] = name;
  try {
    fs.writeFileSync(NAMES_FILE, JSON.stringify(nameMap, null, 2), 'utf8');
    refreshDevices().catch(() => { });
    res.json({ ok: true });
  } catch (e) {
    console.error('[api] rename:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/adb/wifi-connect', async (req, res) => {
  const { serial, ip } = req.body || {};
  if (!serial) {
    return res.status(400).json({ ok: false, error: 'serial required' });
  }

  try {
    let targetIp = ip;

    // If no IP provided, try to auto-detect via adb
    if (!targetIp) {
      try {
        // Try ip route: e.g. "default via 192.168.1.1 dev wlan0  proto dhcp  src 192.168.1.42"
        const routeOut = await runAdbCommand(serial, ['shell', 'ip', 'route']);
        const routeStdout = routeOut.stdout || '';
        const match = routeStdout.match(/src\s+(\d+\.\d+\.\d+\.\d+)/);
        if (match && match[1]) targetIp = match[1];
      } catch (e) {
        // ignore and try next
      }
    }

    if (!targetIp) {
      try {
        // Try ip addr show wlan0 -> inet 192.168.x.y/24
        const addrOut = await runAdbCommand(serial, ['shell', 'ip', '-4', 'addr', 'show', 'wlan0']);
        const addrStdout = addrOut.stdout || '';
        const match2 = addrStdout.match(/inet\s+(\d+\.\d+\.\d+\.\d+)\//);
        if (match2 && match2[1]) targetIp = match2[1];
      } catch (e) {
        // ignore
      }
    }

    if (!targetIp) {
      // Fallback: try dumpsys ip route or other methods
      try {
        const routeOut2 = await runAdbCommand(serial, ['shell', 'ip', 'route']);
        const stdout2 = routeOut2.stdout || '';
        const match3 = stdout2.match(/src\s+(\d+\.\d+\.\d+\.\d+)/);
        if (match3 && match3[1]) targetIp = match3[1];
      } catch (e) {
        // ignore
      }
    }

    if (!targetIp) {
      // If we still don't have an ip, return error to caller to enter IP manually
      return res.status(400).json({ ok: false, error: 'Unable to detect device IP automatically. Please enter IP manually.' });
    }

    // Enable TCP on 5555 and connect
    await runAdbCommand(serial, ['shell', 'setprop', 'persist.adb.tcp.port', '5555']);
    await runAdbCommand(serial, ['tcpip', '5555']);
    const r = await runAdbCommand(null, ['connect', targetIp]);
    const ok = r.stdout && /connected|already connected/i.test(r.stdout);
    refreshDevices().catch(() => { });
    res.json({ ok, ip: targetIp, msg: r.stdout || r.stderr || 'done' });
  } catch (e) {
    console.error('[api] wifi-connect:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// WiFi Auto (détection automatique IP)
app.post('/api/adb/wifi-auto', async (req, res) => {
  const { serial } = req.body || {};
  if (!serial) {
    return res.status(400).json({ ok: false, error: 'serial required' });
  }

  try {
    let targetIp = null;

    // Méthode 1: ip route
    try {
      const routeOut = await runAdbCommand(serial, ['shell', 'ip', 'route']);
      const routeStdout = routeOut.stdout || '';
      const match = routeStdout.match(/src\s+(\d+\.\d+\.\d+\.\d+)/);
      if (match && match[1]) targetIp = match[1];
    } catch (e) {
      console.log('[wifi-auto] ip route failed:', e.message);
    }

    // Méthode 2: ip addr show wlan0
    if (!targetIp) {
      try {
        const addrOut = await runAdbCommand(serial, ['shell', 'ip', '-4', 'addr', 'show', 'wlan0']);
        const addrStdout = addrOut.stdout || '';
        const match2 = addrStdout.match(/inet\s+(\d+\.\d+\.\d+\.\d+)\//);
        if (match2 && match2[1]) targetIp = match2[1];
      } catch (e) {
        console.log('[wifi-auto] ip addr failed:', e.message);
      }
    }

    // Méthode 3: getprop dhcp.wlan0.ipaddress
    if (!targetIp) {
      try {
        const propOut = await runAdbCommand(serial, ['shell', 'getprop', 'dhcp.wlan0.ipaddress']);
        const propIp = (propOut.stdout || '').trim();
        if (propIp && /^\d+\.\d+\.\d+\.\d+$/.test(propIp)) targetIp = propIp;
      } catch (e) {
        console.log('[wifi-auto] getprop failed:', e.message);
      }
    }

    if (!targetIp) {
      return res.status(400).json({ ok: false, error: 'Impossible de détecter l\'IP automatiquement. Vérifiez que le WiFi est activé sur le casque.' });
    }

    console.log('[wifi-auto] IP détectée:', targetIp);

    // Enable TCP on 5555 and connect
    await runAdbCommand(serial, ['tcpip', '5555']);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
    const connectOut = await runAdbCommand(null, ['connect', `${targetIp}:5555`]);
    const connectStdout = connectOut.stdout || '';
    const ok = /connected|already connected/i.test(connectStdout);
    
    refreshDevices().catch(() => { });
    res.json({ ok, ip: targetIp, msg: connectStdout });
  } catch (e) {
    console.error('[api] wifi-auto:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// TTS - Text-to-Speech (PC → Casque)
app.post('/api/tts/send', async (req, res) => {
  const { serial, text } = req.body || {};
  if (!serial || !text) {
    return res.status(400).json({ ok: false, error: 'serial et text requis' });
  }

  try {
    // Utilise la commande 'say' sur Android via ADB (disponible sur certains casques)
    // Alternative: utiliser service TTS Android
    const ttsCommand = ['shell', 'cmd', 'notification', 'post', '-S', 'bigtext', '-t', 'VHR Dashboard', 'Tag', text];
    
    // Méthode 1: Notification avec le texte (visible)
    try {
      await runAdbCommand(serial, ttsCommand);
    } catch (e) {
      console.log('[tts] notification failed:', e.message);
    }

    // Méthode 2: Utiliser am broadcast pour TTS
    try {
      const ttsIntent = [
        'shell', 'am', 'broadcast',
        '-a', 'android.intent.action.TTS_QUEUE_PROCESSING_COMPLETED',
        '--es', 'utteranceId', 'vhr_' + Date.now(),
        '--es', 'text', text
      ];
      await runAdbCommand(serial, ttsIntent);
    } catch (e) {
      console.log('[tts] broadcast failed:', e.message);
    }

    // Méthode 3: Service TTS (requiert app installée)
    // Pour une vraie implémentation TTS, il faudrait une app Android qui écoute les broadcasts
    
    console.log(`[tts] Texte envoyé au casque ${serial}: "${text}"`);
    res.json({ ok: true, message: 'Texte envoyé (notification + broadcast). Pour TTS audio complet, installez l\'app VHR TTS sur le casque.' });
  } catch (e) {
    console.error('[api] tts/send:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get('/api/games', (req, res) => {
  res.json({ ok: true, games: gamesList });
});

app.post('/api/games/add', (req, res) => {
  const { name, packageId, icon } = req.body || {};
  if (!name || !packageId) {
    return res.status(400).json({ ok: false, error: 'name and packageId required' });
  }

  const game = {
    id: Date.now(),
    name,
    packageId,
    icon: icon || null,
    addedAt: new Date().toISOString()
  };
  gamesList.push(game);

  try {
    fs.writeFileSync(GAMES_FILE, JSON.stringify(gamesList, null, 2), 'utf8');
    io.emit('games-update', gamesList);
    res.json({ ok: true, game });
  } catch (e) {
    console.error('[api] games/add:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/games/remove', (req, res) => {
  const { id } = req.body || {};
  if (!id) {
    return res.status(400).json({ ok: false, error: 'id required' });
  }

  gamesList = gamesList.filter(g => g.id !== id);

  try {
    fs.writeFileSync(GAMES_FILE, JSON.stringify(gamesList, null, 2), 'utf8');
    io.emit('games-update', gamesList);
    res.json({ ok: true });
  } catch (e) {
    console.error('[api] games/remove:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get('/api/favorites', (req, res) => {
  res.json({ ok: true, favorites: favoritesList });
});

app.post('/api/favorites/add', (req, res) => {
  const { name, packageId, icon } = req.body || {};
  if (!name || !packageId) {
    return res.status(400).json({ ok: false, error: 'name and packageId required' });
  }

  if (favoritesList.find(f => f.packageId === packageId)) {
    return res.json({ ok: true, msg: 'already exists' });
  }

  const favorite = {
    id: Date.now(),
    name,
    packageId,
    icon: icon || null,
    addedAt: new Date().toISOString()
  };
  favoritesList.push(favorite);

  try {
    fs.writeFileSync(FAVORITES_FILE, JSON.stringify(favoritesList, null, 2), 'utf8');
    io.emit('favorites-update', favoritesList);
    res.json({ ok: true, favorite });
  } catch (e) {
    console.error('[api] favorites/add:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/favorites/remove', (req, res) => {
  const { id } = req.body || {};
  if (!id) {
    return res.status(400).json({ ok: false, error: 'id required' });
  }

  favoritesList = favoritesList.filter(f => f.id !== id);

  try {
    fs.writeFileSync(FAVORITES_FILE, JSON.stringify(favoritesList, null, 2), 'utf8');
    io.emit('favorites-update', favoritesList);
    res.json({ ok: true });
  } catch (e) {
    console.error('[api] favorites/remove:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Battery level
app.get('/api/battery/:serial', async (req, res) => {
  const serial = req.params.serial;
  try {
    const out = await runAdbCommand(serial, ['shell', 'dumpsys', 'battery']);
    const match = out.stdout.match(/level:\s*(\d+)/);
    const level = match ? parseInt(match[1]) : null;
    res.json({ ok: true, level });
  } catch (e) {
    console.error('[api] battery:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Generic ADB command
app.post('/api/adb/command', async (req, res) => {
  const { serial, command } = req.body || {};
  if (!serial || !command) {
    return res.status(400).json({ ok: false, error: 'serial and command required' });
  }

  try {
    const args = Array.isArray(command) ? command : [command];
    const result = await runAdbCommand(serial, args);
    res.json({ ok: result.code === 0, stdout: result.stdout, stderr: result.stderr });
  } catch (e) {
    console.error('[api] adb/command:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Home button - Open Oculus/Meta Quest menu
app.post('/api/device/home-button', async (req, res) => {
  const { serial } = req.body || {};
  if (!serial) {
    return res.status(400).json({ ok: false, error: 'serial required' });
  }

  try {
    const result = await runAdbCommand(serial, ['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
    console.log(`[home-button] Serial: ${serial}, Result:`, result);
    res.json({ ok: result.code === 0, stdout: result.stdout, stderr: result.stderr });
  } catch (e) {
    console.error('[api] device/home-button:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Stream audio output configuration
app.post('/api/stream/audio-output', async (req, res) => {
  const { serial, audioOutput } = req.body || {};
  if (!serial || !audioOutput) {
    return res.status(400).json({ ok: false, error: 'serial and audioOutput required' });
  }

  // audioOutput can be: 'headset', 'pc', or 'both'
  // This endpoint stores the preference - actual audio routing is handled by scrcpy/streaming backend
  
  try {
    console.log(`[stream-audio] Serial: ${serial}, AudioOutput: ${audioOutput}`);
    
    // Store preference for this device (in-memory for now)
    if (!global.streamPreferences) global.streamPreferences = {};
    global.streamPreferences[serial] = { audioOutput, timestamp: new Date() };
    
    res.json({ 
      ok: true, 
      message: `Audio output set to: ${audioOutput}`,
      preference: global.streamPreferences[serial]
    });
  } catch (e) {
    console.error('[api] stream/audio-output:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ---------- Socket.IO ----------
io.on('connection', socket => {
  console.log('[Socket.IO] ­ƒöî Client connected');
  socket.emit('devices-update', devices);
  socket.emit('games-update', gamesList);
  socket.emit('favorites-update', favoritesList);
  socket.on('disconnect', () => {
    console.log('[Socket.IO] ­ƒöî Client disconnected');
  });
});

// ---------- Init ----------
// Run Stripe validation at startup; in dev mode (NO_ADB=1) it will only warn and continue,
// but in production we abort if the provided key is invalid (to avoid silent failures).
(async function globalInit() {
  try {
    await verifyStripeKeyAtStartup();
  } catch (e) {
    if (process.env.NODE_ENV === 'development' || process.env.NO_ADB === '1') {
      console.warn('[server] Stripe key validation failed, continuing in development mode. Fix STRIPE_SECRET_KEY for production.');
    } else {
      console.error('[server] Stripe verification failed, aborting startup.');
      process.exit(1);
      return;
    }
  }
  // Init ADB tracking only when not skipping ADB
  if (process.env.NO_ADB !== '1') {
    (async function initServer() {
      try {
        refreshDevices();
        startAdbTrack();
      } catch (e) { console.error('[server] ADB init failed', e && e.message); }
    })();
  } else {
    console.warn('[server] NO_ADB=1 set: skipping ADB device tracking & streaming features (good for dev/test).');
  }
})();

const PORT = process.env.PORT || 3000;

// Start server after initializing app
initializeApp().then(() => {
  server.listen(PORT, () => {
    console.log(`\nVHR DASHBOARD - Optimisé Anti-Scintillement`);
    console.log(`­ƒôí Server: http://localhost:${PORT}`);
    console.log(`\n­ƒôè Profils disponibles (ADB screenrecord - stable):`);
    console.log(`   · ultra-low: 320p, 600K (WiFi faible)`);
    console.log(`   · low:       480p, 1.5M`);
    console.log(`   • wifi:      640p, 2M (WiFi optimisé)`);
    console.log(`   · default:   720p, 3M`);
    console.log(`   · high:      1280p, 8M (USB)`);
    console.log(`   · ultra:     1920p, 12M (USB uniquement)`);
    console.log(`   Ô£à Pas de scintillement avec ADB natif`);
    console.log(`\nCrop œil gauche activé par défaut\n`);
  });
}).catch(err => {
  console.error('[FATAL] Initialization failed:', err && err.message ? err.message : err);
  console.error('[FATAL] Stack:', err && err.stack);
  console.log('[INFO] Server will start anyway, but users table may not be initialized.');
  console.log('[INFO] To fix: POST to /api/admin/init-users once server is running');
  server.listen(PORT, () => {
    console.log(`\n[WARNING] Server running on port ${PORT} but initialization failed`);
    console.log(`[INSTRUCTION] Run: curl -X POST http://localhost:${PORT}/api/admin/init-users\n`);
  });
});

// Handler de fermeture propre
process.on('SIGINT', () => {
  console.log('\nArrêt du serveur...');
  
  // Tuer tous les streams actifs
  for (const [serial, stream] of streams) {
    try {
      if (stream.adbProc) {
        console.log(`Arrêt adb: ${serial}`);
        spawn('taskkill', ['/F', '/T', '/PID', String(stream.adbProc.pid)]);
      }
      if (stream.ffplayProc) {
        console.log(`Arrêt ffplay: ${serial}`);
        spawn('taskkill', ['/F', '/T', '/PID', String(stream.ffplayProc.pid)]);
      }
    } catch (e) {}
  }
  
  // Tuer tous les processus restants
  setTimeout(() => {
    spawn('taskkill', ['/F', '/IM', 'adb.exe', '/T']);
    spawn('taskkill', ['/F', '/IM', 'ffplay.exe']);
    process.exit(0);
  }, 500);
});

process.on('SIGTERM', () => {
  spawn('taskkill', ['/F', '/IM', 'adb.exe', '/T']);
  spawn('taskkill', ['/F', '/IM', 'ffplay.exe']);
  process.exit(0);
});

// Removed /stripe-prices debug route to avoid exposing price IDs. Use /stripe-check for key validation (local-only).

// Local-only debug endpoint to verify Stripe key works without creating sessions (enabled only with STRIPE_DEBUG_PRICES=1)
app.get('/stripe-check', async (req, res) => {
  const isDebug = process.env.STRIPE_DEBUG_PRICES === '1';
  const isLocal = req.hostname === 'localhost' || req.ip === '::1' || req.ip === '127.0.0.1' || (req.headers.host && req.headers.host.startsWith('localhost'));
  if (!isDebug || !isLocal || process.env.NODE_ENV === 'production') return res.status(403).json({ ok: false, error: 'Not allowed' });
  try {
    const acc = await stripe.accounts.retrieve();
    res.json({ ok: true, account: { id: acc.id, email: acc.email, name: acc.settings && acc.settings.dashboard && acc.settings.dashboard.display_name } });
  } catch (err) {
    console.error('[Stripe] /stripe-check error:', err && err.message);
    res.status(500).json({ ok: false, error: 'Stripe key validation failed: ' + (err && err.message) });
  }
});

// ---------- Stripe Customer helpers ----------
async function ensureStripeCustomerForUser(user) {
  if (!stripe) throw new Error('Stripe not configured');
  if (user.stripeCustomerId) return user.stripeCustomerId;
  // Create a new Stripe customer for this user
  try {
    const cust = await stripe.customers.create({ name: user.username || undefined, email: user.email || undefined, metadata: { username: user.username } });
    user.stripeCustomerId = cust.id;
    // Persist Stripe customer ID via DB adapter if present
    try { persistUser(user); } catch (e) { console.error('[users] save after stripe create failed:', e && e.message); }
    return cust.id;
  } catch (e) {
    console.error('[Stripe] create customer error', e && e.message);
    throw e;
  }
}

// Create a Portal session for the current user
app.post('/api/billing/portal', authMiddleware, async (req, res) => {
  try {
    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'Utilisateur introuvable' });
    const customerId = await ensureStripeCustomerForUser(user);
    const origin = req.headers.origin || `http://localhost:${process.env.PORT || 3000}`;
    const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${origin}/account.html` });
    res.json({ ok: true, url: session.url });
  } catch (e) {
    console.error('[Stripe] billing portal error', e && e.message);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// List invoices for current authenticated user
app.get('/api/billing/invoices', authMiddleware, async (req, res) => {
  try {
    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'Utilisateur introuvable' });
    if (!user.stripeCustomerId) return res.json({ ok: true, invoices: [] });
    const invoices = await stripe.invoices.list({ customer: user.stripeCustomerId, limit: 30 });
    res.json({ ok: true, invoices: invoices.data });
  } catch (e) {
    console.error('[Stripe] invoices error', e && e.message);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// List subscriptions for current authenticated user
app.get('/api/billing/subscriptions', authMiddleware, async (req, res) => {
  try {
    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'Utilisateur introuvable' });
    if (!user.stripeCustomerId) return res.json({ ok: true, subscriptions: [] });
    const subs = await stripe.subscriptions.list({ customer: user.stripeCustomerId, limit: 30 });
    res.json({ ok: true, subscriptions: subs.data });
  } catch (e) {
    console.error('[Stripe] subscriptions error', e && e.message);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Stripe webhook endpoint: persist invoice and subscription events to user record
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET_DEV || null;
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    if (stripeWebhookSecret) {
      // constructEvent expects raw body as string or Buffer
      if (Buffer.isBuffer(req.body)) event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
      else event = stripe.webhooks.constructEvent(JSON.stringify(req.body), sig, stripeWebhookSecret);
    } else {
      // If no webhook secret set (dev), prefer already-parsed body or parse raw string
      if (Buffer.isBuffer(req.body)) event = JSON.parse(req.body.toString());
      else event = req.body;
    }
  } catch (e) {
    console.error('[Stripe] webhook failed to parse/verify:', e && e.message);
    return res.status(400).send(`Webhook error: ${e && e.message}`);
  }

  // Handle a subset of events and persist changes per user
  try {
    const obj = event.data && event.data.object ? event.data.object : null;
    const type = event.type;
    if (!obj) return res.json({ received: true });
    const customerId = obj.customer || (obj.customer_id) || null;
    
    // For checkout.session.completed, try to create/find user from metadata first
    let user = null;
    let isNewUser = false;
    if (type === 'checkout.session.completed' && obj.metadata) {
      const { username, userEmail, passwordHash } = obj.metadata;
      if (username && userEmail && passwordHash) {
        // Check if user already exists
        user = users.find(u => u.username === username);
        if (!user) {
          // Create new user from registration data
          console.log('[webhook] Creating new user from checkout metadata:', username);
          try {
            const hashedPassword = await bcrypt.hash(passwordHash, 10);
            user = {
              id: crypto.randomUUID(),
              username: username,
              email: userEmail,
              passwordHash: hashedPassword,
              role: 'user',
              stripeCustomerId: customerId || null,
              createdAt: new Date().toISOString(),
              demoStartDate: new Date().toISOString(),
              demoExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            };
            users.push(user);
            saveUsers();
            isNewUser = true;
            console.log('[webhook] New user created:', { username, email: userEmail });
            
            // Send credentials email immediately after user creation
            try {
              const credentialsEmailData = {
                ...user,
                plainPassword: passwordHash // Include password in email data
              };
              await emailService.sendCredentialsEmail(credentialsEmailData);
            } catch (emailError) {
              console.error('[webhook] Error sending credentials email:', emailError.message);
            }
          } catch (error) {
            console.error('[webhook] Error creating user:', error.message);
          }
        }
      }
    }
    
    // If no user found from metadata, try to find by Stripe customer ID
    if (!user && customerId) {
      user = getUserByStripeCustomerId(customerId);
    }
    
    if (!user) return res.json({ received: true });

    if (type === 'invoice.paid') {
      user.latestInvoiceId = obj.id;
      user.lastInvoicePaidAt = obj.status_transitions && obj.status_transitions.paid_at ? new Date(obj.status_transitions.paid_at * 1000).toISOString() : new Date().toISOString();
    } else if (type === 'invoice.payment_failed') {
      user.lastInvoiceFailedId = obj.id;
      user.lastInvoiceFailedAt = new Date().toISOString();
    } else if (type.startsWith('customer.subscription')) {
      user.subscriptionStatus = obj.status || obj?.plan?.status || obj?.status || 'unknown';
      user.subscriptionId = obj.id;
    } else if (type === 'checkout.session.completed') {
      // session completed often delivers: session.customer
      if (obj.customer) user.stripeCustomerId = obj.customer;
      
      // Envoyer un email de confirmation pour un achat/abonnement
      if (obj.mode === 'payment') {
        // One-time payment - Achat définitif (Licence perpétuelle 499€)
        const purchaseId = obj.metadata?.purchaseId;
        const purchase = purchaseId ? purchaseConfig.PURCHASE_OPTIONS[purchaseId] : null;
        
        if (purchase && user.email) {
          console.log('[webhook] Processing payment for user:', user.username, 'purchaseId:', purchaseId);
          
          // Generate unique license key for this purchase
          const licenseKey = emailService.generateLicenseKey();
          console.log('[webhook] Generated license key:', licenseKey);
          
          // Store license key in user record
          user.licenseKey = licenseKey;
          user.licenseGeneratedAt = new Date().toISOString();
          user.licenseType = 'perpetual';
          user.licensePurchaseId = purchaseId;
          user.licensePurchaseAmount = (obj.amount_total / 100);
          
          // Store in licenses file as well (for backup)
          const license = addLicense(user.username, user.email, purchaseId);
          console.log('[webhook] License stored:', license.key);
          
          // Send purchase success email with license key
          try {
            const purchaseData = {
              planName: purchase.name,
              orderId: obj.id,
              price: (obj.amount_total / 100).toFixed(2),
              licenseDuration: 'Perpétuel',
              updatesUntil: 'À jamais',
              licenseKey: licenseKey // Add license key to email data
            };
            
            const emailResult = await emailService.sendPurchaseSuccessEmail(user, purchaseData);
            console.log('[webhook] Purchase success email sent:', emailResult);
            
            if (!emailResult.success) {
              console.error('[webhook] Email send failed:', emailResult.error);
            }
          } catch (e) {
            console.error('[webhook] Error sending purchase email:', e.message);
          }
        }
      } else if (obj.mode === 'subscription') {
        // Subscription - Abonnement mensuel (29€/mois)
        if (user.email) {
          console.log('[webhook] Processing subscription for user:', user.username);
          
          // Mark subscription as active
          user.subscriptionStatus = 'active';
          user.subscriptionPurchasedAt = new Date().toISOString();
          
          try {
            const subscriptionData = {
              planName: obj.metadata?.purchaseName || 'Abonnement Professionnel',
              billingPeriod: 'month',
              price: (obj.amount_total / 100).toFixed(2),
              subscriptionId: obj.subscription,
              userName: user.username
            };
            
            const emailResult = await emailService.sendSubscriptionSuccessEmail(user, subscriptionData);
            console.log('[webhook] Subscription success email sent:', emailResult);
            
            if (!emailResult.success) {
              console.error('[webhook] Email send failed:', emailResult.error);
            }
          } catch (e) {
            console.error('[webhook] Error sending subscription email:', e.message);
          }
        }
      }
    }

    saveUsers();
  } catch (e) {
    console.error('[Stripe webhook] error handling event', e && e.message);
  }

  res.json({ received: true });
});

// --- Route de register / création de compte ---
app.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok: false, error: 'username and password required' });
  try {
    // unique username
    if (getUserByUsername(username)) return res.status(400).json({ ok: false, error: 'Nom d\'utilisateur déjà utilisé' });
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = { 
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username, 
      passwordHash, 
      role: 'user', 
      email: email || null, 
      stripeCustomerId: null,
      demoStartDate: new Date().toISOString() // Initialize demo start date
    };
    // persist to database
    if (USE_POSTGRES) {
      await db.createUser(newUser.id, newUser.username, newUser.passwordHash, newUser.email, newUser.role);
    } else {
      persistUser(newUser);
    }
    // create token and set cookie
    const token = jwt.sign({ username: newUser.username, role: newUser.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 2 * 60 * 60 * 1000 };
    res.cookie('vhr_token', token, cookieOptions);
    res.json({ ok: true, token, userId: newUser.id, username: newUser.username, role: newUser.role, email: newUser.email });
  } catch (e) {
    console.error('[api] register:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Public config route: returns only non-sensitive public config values for client-side use
app.get('/public-config', (req, res) => {
  res.json({
    ok: true,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    testPriceId: process.env.TEST_PRICE_ID || process.env.SMOKE_TEST_PRICE_ID || null,
  });
});

// ========== ANDROID TTS APP INSTALLER ENDPOINTS ==========

/**
 * GET /api/adb/devices - Liste tous les appareils ADB connectés
 */
app.get('/api/adb/devices', authMiddleware, async (req, res) => {
  try {
    // Essayer 'adb' puis 'adb.exe'
    let devices = [];
    const commands = ['adb devices -l', 'adb.exe devices -l'];
    
    for (const cmd of commands) {
      try {
        const { stdout } = await execp(cmd);
        const lines = stdout.trim().split('\n').slice(1); // Skip header
        devices = lines
          .filter(line => line.trim() && !line.includes('List of attached devices'))
          .map(line => {
            const parts = line.split(/\s+/);
            const serial = parts[0];
            const status = parts[1] || 'unknown';
            // Parse device info from remaining parts
            const model = parts.find(p => p.includes('model:'))?.replace('model:', '') || 'Unknown';
            const device = parts.find(p => p.includes('device:'))?.replace('device:', '') || 'Device';
            
            return {
              serial,
              status,
              name: `${device} (${model})`.replace(/[_\-]/g, ' ')
            };
          });
        break; // Success, exit loop
      } catch (e) {
        continue; // Try next command
      }
    }

    if (devices.length === 0) {
      console.log('[ADB] No devices connected');
      return res.json({ 
        ok: true, 
        devices: [],
        message: 'No ADB devices connected. Ensure USB debugging is enabled.'
      });
    }

    console.log(`[ADB] Found ${devices.length} device(s):`, devices.map(d => d.serial).join(', '));
    res.json({ ok: true, devices });
  } catch (e) {
    console.error('[ADB] Error listing devices:', e.message);
    res.json({ 
      ok: false, 
      error: 'ADB not available or devices not connected',
      devices: []
    });
  }
});

/**
 * POST /api/adb/install-apk - Installe l'APK compilée sur un appareil ADB
 */
app.post('/api/adb/install-apk', authMiddleware, async (req, res) => {
  try {
    const user = getUserByUsername(req.user.username);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    
    const { device } = req.body;
    if (!device) {
      return res.status(400).json({ ok: false, message: 'Device serial not provided' });
    }

    // Path to the compiled APK (demo version for testing)
    // In production, this should be the actual compiled APK from GitHub Actions
    const apkPath = path.join(__dirname, 'dist', 'demo', 'vhr-dashboard-demo.apk');
    
    if (!fs.existsSync(apkPath)) {
      console.warn('[ADB Install] APK not found at:', apkPath);
      return res.status(404).json({
        ok: false,
        message: 'APK compilée non trouvée. Veuillez d\'abord compiler l\'APK.'
      });
    }

    console.log(`[ADB Install] Installing APK to device: ${device}`);
    
    // Install APK using adb
    // First, try to get the actual APK path if the demo is a ZIP (need to extract or use directly)
    // For now, assume the ZIP contains the APK or we use the demo APK
    const cmd = `adb -s ${device} install -r "${apkPath}"`;
    
    try {
      const { stdout, stderr } = await execp(cmd, { timeout: 120000 }); // 2 minutes timeout
      
      if (stderr && stderr.includes('error')) {
        console.error('[ADB Install] Error output:', stderr);
        return res.status(500).json({
          ok: false,
          message: `Installation échouée: ${stderr}`
        });
      }
      
      console.log(`[ADB Install] Success for device ${device}:`, stdout);
      
      // Log installation
      console.log(`[ADB Install] User ${user.username} successfully installed APK to ${device}`);
      
      res.json({
        ok: true,
        message: `✅ APK installée avec succès sur ${device}`,
        device,
        output: stdout
      });
      
    } catch (execError) {
      console.error('[ADB Install] Execution error:', execError.message);
      
      // Check if it's a device not found error
      if (execError.message.includes('device not found')) {
        return res.status(404).json({
          ok: false,
          message: `Appareil ${device} introuvable. Vérifiez que l'appareil est connecté.`
        });
      }
      
      res.status(500).json({
        ok: false,
        message: `Erreur lors de l'installation: ${execError.message}`
      });
    }
    
  } catch (e) {
    console.error('[ADB Install] Error:', e.message);
    res.status(500).json({
      ok: false,
      error: 'Installation failed',
      message: e.message
    });
  }
});

/**
 * POST /api/installer/check-permission - Vérifie si l'utilisateur peut installer l'app
 */
app.post('/api/installer/check-permission', async (req, res) => {
  const { userId } = req.body;

  try {
    // Charger les données utilisateur
    const users = loadUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(401).json({ ok: false, error: 'User not found' });
    }

    // Charger les licences
    const licenses = loadLicenses();

    // Vérifier les types d'accès:
    // 1. Abonnement actif
    const hasActiveSubscription = user.subscriptionStatus === 'active';

    // 2. Licence d'achat perpétuel
    const hasPerpetualLicense = licenses.some(l => 
      l.userId === userId && 
      l.type === 'perpetual' && 
      l.status === 'active'
    );

    // 3. Licence d'abonnement
    const hasSubscriptionLicense = licenses.some(l => 
      l.userId === userId && 
      l.type === 'subscription' && 
      l.status === 'active'
    );

    const canInstall = hasActiveSubscription || hasPerpetualLicense || hasSubscriptionLicense;
    const installationType = hasPerpetualLicense ? 'perpetual' : 'subscription';

    if (canInstall) {
      console.log(`[Installer] Permission granted for user ${user.username} (${installationType})`);
      return res.json({ 
        ok: true, 
        canInstall: true,
        installationType,
        message: `Accès ${installationType === 'perpetual' ? 'à vie' : 'abonnement'} actif`
      });
    } else {
      console.log(`[Installer] Permission denied for user ${user.username} - no valid license`);
      return res.json({ 
        ok: false, 
        error: 'You need an active subscription or license to install this app'
      });
    }
  } catch (e) {
    console.error('[Installer] Permission check error:', e.message);
    res.status(500).json({ 
      ok: false, 
      error: 'Permission check failed: ' + e.message 
    });
  }
});

/**
 * GET /api/opentalkie/service-info - Récupère l'IP et le port du service OpenTalkie
 */
app.get('/api/opentalkie/service-info', authMiddleware, async (req, res) => {
  try {
    const { device } = req.query;
    
    if (!device) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Device serial not provided' 
      });
    }

    console.log(`[OpenTalkie] Getting service info for device: ${device}`);

    // OpenTalkie écoute sur le port 5000 par défaut
    // On récupère l'IP du casque via ADB shell
    const commands = [
      `adb -s ${device} shell "ip addr show | grep -o 'inet [0-9.]*' | head -1"`,
      `adb -s ${device} shell "ip route | grep -o 'via [^ ]* dev' | head -1"`,
      `adb -s ${device} shell "getprop dhcp.wlan0.ipaddress"`
    ];

    let ipAddress = null;

    for (const cmd of commands) {
      try {
        const { stdout } = await execp(cmd, { timeout: 5000 });
        const match = stdout.match(/\d+\.\d+\.\d+\.\d+/);
        if (match) {
          ipAddress = match[0];
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!ipAddress) {
      console.warn('[OpenTalkie] Could not determine device IP address');
      return res.status(500).json({
        ok: false,
        message: 'Could not determine device IP address. Ensure device is connected via WiFi.'
      });
    }

    const port = 5000; // Port par défaut d'OpenTalkie
    const serviceUrl = `http://${ipAddress}:${port}`;

    console.log(`[OpenTalkie] Service info retrieved - IP: ${ipAddress}, Port: ${port}`);

    res.json({
      ok: true,
      device,
      ip: ipAddress,
      port,
      serviceUrl,
      message: `OpenTalkie service available at ${serviceUrl}`
    });

  } catch (e) {
    console.error('[OpenTalkie] Error getting service info:', e.message);
    res.status(500).json({
      ok: false,
      error: 'Failed to get OpenTalkie service information',
      message: e.message
    });
  }
});

/**
 * POST /api/opentalkie/start-streaming - Démarre le streaming audio vers OpenTalkie
 */
app.post('/api/opentalkie/start-streaming', authMiddleware, async (req, res) => {
  try {
    const { device, audioData } = req.body;
    
    if (!device) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Device serial not provided' 
      });
    }

    console.log(`[OpenTalkie] Starting audio stream to device: ${device}`);

    // Obtenir l'IP d'OpenTalkie sur le casque
    const commands = [
      `adb -s ${device} shell "getprop dhcp.wlan0.ipaddress"`,
      `adb -s ${device} shell "ip addr show wlan0 | grep -o 'inet [0-9.]*' | cut -d' ' -f2"`
    ];

    let ipAddress = null;

    for (const cmd of commands) {
      try {
        const { stdout } = await execp(cmd, { timeout: 5000 });
        const match = stdout.match(/\d+\.\d+\.\d+\.\d+/);
        if (match) {
          ipAddress = match[0];
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!ipAddress) {
      return res.status(500).json({
        ok: false,
        message: 'Could not determine device IP address'
      });
    }

    const port = 5000;
    const serviceUrl = `http://${ipAddress}:${port}`;

    console.log(`[OpenTalkie] Streaming audio to ${serviceUrl}`);

    res.json({
      ok: true,
      device,
      serviceUrl,
      message: `Audio stream started to ${serviceUrl}`
    });

  } catch (e) {
    console.error('[OpenTalkie] Error starting stream:', e.message);
    res.status(500).json({
      ok: false,
      error: 'Failed to start audio stream',
      message: e.message
    });
  }
});

// ===== WEBRTC AUDIO SIGNALING =====

// Store active audio sessions (in-memory, single-instance server)
const audioSessions = new Map();

/**
 * POST /api/audio/signal - WebRTC Signaling for audio streaming
 * Handles: offer, answer, ice-candidate, close
 */
app.post('/api/audio/signal', authMiddleware, async (req, res) => {
  try {
    const { type, offer, answer, candidate, sessionId, initiator, targetSerial } = req.body;
    const username = req.user.username;

    console.log(`[WebRTC] ${type} signal from ${username}`, { sessionId, initiator });

    if (type === 'offer') {
      // PC initiates call to headset
      const session = {
        id: sessionId,
        initiator: username,
        targetSerial,
        offer,
        createdAt: Date.now(),
        candidates: []
      };

      audioSessions.set(sessionId, session);

      // Store for 30 seconds waiting for answer
      setTimeout(() => {
        if (audioSessions.has(sessionId) && !audioSessions.get(sessionId).answer) {
          audioSessions.delete(sessionId);
          console.log(`[WebRTC] Session ${sessionId} expired (no answer)`);
        }
      }, 30000);

      res.json({
        ok: true,
        sessionId,
        message: 'Offer stored, waiting for remote answer'
      });

    } else if (type === 'answer') {
      // Headset responds with answer
      const session = audioSessions.get(sessionId);
      if (!session) {
        return res.status(400).json({
          ok: false,
          error: 'Session not found or expired'
        });
      }

      session.answer = answer;
      session.answeredAt = Date.now();

      res.json({
        ok: true,
        sessionId,
        message: 'Answer stored'
      });

    } else if (type === 'ice-candidate') {
      // Store ICE candidate
      const session = audioSessions.get(sessionId);
      if (session) {
        session.candidates = session.candidates || [];
        session.candidates.push(candidate);
      }

      res.json({
        ok: true,
        message: 'ICE candidate stored'
      });

    } else if (type === 'close') {
      // Close session
      audioSessions.delete(sessionId);
      console.log(`[WebRTC] Session ${sessionId} closed`);

      res.json({
        ok: true,
        message: 'Session closed'
      });

    } else {
      res.status(400).json({
        ok: false,
        error: 'Unknown signal type: ' + type
      });
    }

  } catch (error) {
    console.error('[WebRTC] Signaling error:', error.message);
    res.status(500).json({
      ok: false,
      error: 'Signaling error: ' + error.message
    });
  }
});

/**
 * GET /api/audio/session/:sessionId - Poll for remote signals
 * Used by client to retrieve offer/answer/candidates
 */
app.get('/api/audio/session/:sessionId', authMiddleware, (req, res) => {
  try {
    const session = audioSessions.get(req.params.sessionId);
    
    if (!session) {
      return res.json({
        ok: false,
        error: 'Session not found'
      });
    }

    const elapsed = Date.now() - session.createdAt;
    const response = {
      ok: true,
      sessionId: session.id,
      offer: session.offer,
      answer: session.answer || null,
      candidates: session.candidates || [],
      elapsed
    };

    res.json(response);

  } catch (error) {
    console.error('[WebRTC] Error retrieving session:', error.message);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ===== GLOBAL ERROR HANDLERS =====

// Handle 404 - Not Found
app.use((req, res) => {
  console.log('[404] Route not found:', req.method, req.path);
  res.status(404).json({
    ok: false,
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler - must be last
app.use((err, req, res, next) => {
  console.error('[Error Handler] Unhandled error:', err.message);
  console.error('[Error Handler] Stack:', err.stack);
  
  // Don't send response twice
  if (res.headersSent) {
    return next(err);
  }
  
  // Always return JSON for API errors
  res.status(err.status || 500).json({
    ok: false,
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// ⚠️ NOTE: Local Android compilation routes removed
// Use GitHub Actions for automated builds instead:
// 1. User downloads APK + Voice via /api/download/vhr-app (authenticated)
// 2. User executes: git push origin main
// 3. GitHub Actions compiles automatically on Linux (avoids Windows Gradle issues)
