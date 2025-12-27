// Script de packaging du VHR Dashboard pour distribution
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const crypto = require('crypto');
const https = require('https');

const PROJECT_ROOT = path.join(__dirname, '..');
const STAGE_DIR = path.join(PROJECT_ROOT, 'dist', 'portable-stage');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'dist', 'portable');
const PACKAGE_NAME = 'VHR-Dashboard-Portable';
const OUTPUT_ZIP = path.join(PROJECT_ROOT, `${PACKAGE_NAME}.zip`);

const NODE_PORTABLE_VERSION = process.env.PORTABLE_NODE_VERSION || 'v20.11.1';
const NODE_PORTABLE_URL = `https://nodejs.org/dist/${NODE_PORTABLE_VERSION}/node-${NODE_PORTABLE_VERSION}-win-x64.zip`;
const NODE_PORTABLE_DIR = path.join(STAGE_DIR, 'node-portable');

console.log('========================================');
console.log('  VHR Dashboard - Package Builder');
console.log('========================================\n');

async function downloadFile(url, dest) {
  await fs.ensureDir(path.dirname(dest));
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode} for ${url}`));
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest).catch(() => {});
      reject(err);
    });
  });
}

async function ensureNodePortable() {
  if (await fs.pathExists(path.join(NODE_PORTABLE_DIR, 'node.exe'))) {
    console.log('  ✓ Node portable déjà présent');
    return;
  }

  console.log('  → Téléchargement de Node portable:', NODE_PORTABLE_URL);
  const tmpZip = path.join(__dirname, `node-${NODE_PORTABLE_VERSION}.zip`);
  await downloadFile(NODE_PORTABLE_URL, tmpZip);
  const extractDest = path.join(__dirname, 'node-extract');
  await fs.remove(extractDest);
  await fs.ensureDir(extractDest);
  await fs.ensureDir(NODE_PORTABLE_DIR);
  await fs.createReadStream(tmpZip)
    .pipe(require('unzipper').Extract({ path: extractDest }))
    .promise();

  const extracted = path.join(extractDest, `node-${NODE_PORTABLE_VERSION}-win-x64`);
  await fs.copy(extracted, NODE_PORTABLE_DIR);
  await fs.remove(tmpZip);
  await fs.remove(extractDest);
  console.log('  ✓ Node portable prêt');
}

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}

async function build() {
  try {
    // 1. Nettoyer le stage et l'output
    console.log('📁 Nettoyage du stage...');
    await fs.remove(STAGE_DIR);
    await fs.ensureDir(STAGE_DIR);
    await fs.ensureDir(OUTPUT_DIR);

    // 2. Copier les fichiers nécessaires (whitelist)
    console.log('📋 Copie des fichiers...');
    const filesToCopy = [
      'server.js',
      'launcher.js',
      'start-server-auto-restart.ps1',
      'package.json',
      'package-lock.json',
      '.env.example',
      'README.md',
      'launch-dashboard.html',
      'scripts',
      'public',
      'site-vitrine',
      'LICENSE'
    ];

    for (const file of filesToCopy) {
      const src = path.join(PROJECT_ROOT, file);
      const dest = path.join(STAGE_DIR, file);
      if (await fs.pathExists(src)) {
        await fs.copy(src, dest, {
          filter: (p) => {
            const parts = p.split(path.sep);
            const bannedDirs = ['.git', '.vscode', 'backups', 'dist', 'OpenSSL-Win64', 'data', 'node-extract', 'node-portable'];
            const bannedFiles = ['.env', 'server-output.log', 'server-errors.log', 'server-start.log'];
            if (bannedFiles.some((f) => p.endsWith(f))) return false;
            if (parts.some((seg) => bannedDirs.includes(seg))) return false;
            return true;
          }
        });
        console.log(`  ✓ ${file}`);
      }
    }

    // 3. Copier node_modules (si présent) pour éviter npm install coté user
    if (await fs.pathExists(path.join(PROJECT_ROOT, 'node_modules'))) {
      console.log('📦 Copie de node_modules (runtime)...');
      await fs.copy(path.join(PROJECT_ROOT, 'node_modules'), path.join(STAGE_DIR, 'node_modules'));
    }

    // 4. Télécharger Node portable dans le stage
    console.log('🟢 Préparation de Node portable...');
    await ensureNodePortable();

    // 5. Créer un README utilisateur
    console.log('📄 Création du README utilisateur...');
    const userReadme = `# VHR Dashboard - Gestionnaire de Casques VR

## Installation

1. **Aucune installation requise**
  - Node portable et les dépendances sont inclus

2. **Lancer le dashboard**
  - Double-cliquez sur: \`scripts/launch-dashboard.bat\`
  - Ou sur Windows: \`VHR Dashboard Launcher.url\` (si présent)

Le dashboard s'ouvrira automatiquement sur:
http://localhost:3000/vhr-dashboard-pro.html

## Connexion

**Utilisateur admin:**
- Username: \`vhr\`
- Password: \`0409\`

**Utilisateur demo:**
- Username: \`VhrDashboard\`
- Password: \`VhrDashboard@2025\`

## Configuration

Renommez \`.env.example\` en \`.env\` et configurez:
- PORT (par défaut: 3000)
- JWT_SECRET
- SMTP (BREVO_SMTP_* ou SMTP_*) si besoin d'emails

## Support

Pour toute question: contact@vhr-dashboard-site.com

## Version

Date du package: ${new Date().toISOString().split('T')[0]}
`;

    await fs.writeFile(
      path.join(STAGE_DIR, 'LISEZMOI.txt'),
      userReadme
    );

    // 6. Créer l'archive ZIP (racine)
    console.log('📦 Création de l\'archive ZIP...');
    await createZip(STAGE_DIR, OUTPUT_ZIP);

    // Copier aussi dans dist/portable/
    const outCopy = path.join(OUTPUT_DIR, `${PACKAGE_NAME}.zip`);
    await fs.ensureDir(OUTPUT_DIR);
    await fs.copy(OUTPUT_ZIP, outCopy, { overwrite: true });

    const sizeMb = (await fs.stat(OUTPUT_ZIP)).size / 1024 / 1024;
    const hash = sha256(OUTPUT_ZIP);

    console.log('\n========================================');
    console.log('✅ Package créé avec succès!');
    console.log(`📦 Fichier: ${OUTPUT_ZIP}`);
    console.log(`📁 Taille: ${sizeMb.toFixed(2)} MB`);
    console.log(`🔐 SHA256: ${hash}`);
    console.log('========================================\n');

    console.log('Instructions pour distribution:');
    console.log(`1. Publiez ${OUTPUT_ZIP} (ou ${outCopy}) sur votre serveur (ex: https://vhr-dashboard-site.onrender.com/VHR-Dashboard-Portable.zip)`);
    console.log('2. Le launcher .bat téléchargera ce zip et l\'extraira automatiquement.');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur lors du packaging:', error);
    process.exit(1);
  }
}

function createZip(sourceDir, outPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

build();
