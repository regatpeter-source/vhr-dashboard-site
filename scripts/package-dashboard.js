// Script de packaging du VHR Dashboard pour distribution
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

const DIST_DIR = path.join(__dirname, 'dist-dashboard');
const PACKAGE_NAME = 'VHR-Dashboard-Portable';

console.log('========================================');
console.log('  VHR Dashboard - Package Builder');
console.log('========================================\n');

async function build() {
  try {
    // 1. Nettoyer le dossier dist
    console.log('📁 Nettoyage du dossier dist...');
    await fs.remove(DIST_DIR);
    await fs.ensureDir(DIST_DIR);

    // 2. Copier les fichiers nécessaires
    console.log('📋 Copie des fichiers...');
    
    const filesToCopy = [
      'server.js',
      'launcher.js',
      'package.json',
      '.env.example',
      'README.md',
      'public',
      'data',
      'downloads'
    ];

    for (const file of filesToCopy) {
      const src = path.join(__dirname, file);
      const dest = path.join(DIST_DIR, file);
      
      if (await fs.pathExists(src)) {
        await fs.copy(src, dest, {
          filter: (src) => {
            // Exclure certains fichiers
            return !src.includes('node_modules') && 
                   !src.includes('.git') &&
                   !src.includes('tmp_');
          }
        });
        console.log(`  ✓ ${file}`);
      }
    }

    // 3. Copier le fichier .bat
    console.log('📝 Copie du lanceur...');
    const batPath = path.join(__dirname, '..', 'VHR Dashboard.bat');
    if (await fs.pathExists(batPath)) {
      await fs.copy(batPath, path.join(DIST_DIR, 'VHR Dashboard.bat'));
      console.log('  ✓ VHR Dashboard.bat');
    }

    // 4. Créer un fichier README pour les utilisateurs
    console.log('📄 Création du README utilisateur...');
    const userReadme = `# VHR Dashboard - Gestionnaire de Casques VR

## Installation

1. **Installer Node.js** (si pas déjà installé)
   - Télécharger sur: https://nodejs.org
   - Version recommandée: LTS (Long Term Support)

2. **Installer les dépendances**
   - Double-cliquez sur: \`INSTALLER.bat\`
   - Ou en ligne de commande: \`npm install\`

## Lancement

Double-cliquez sur: **VHR Dashboard.bat**

Le dashboard s'ouvrira automatiquement dans votre navigateur sur:
http://localhost:3000/vhr-dashboard-app.html

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
- Clés Stripe (si nécessaire)

## Support

Pour toute question: [votre email de support]

## Version

Version: 1.0.0
Date: ${new Date().toISOString().split('T')[0]}
`;

    await fs.writeFile(
      path.join(DIST_DIR, 'LISEZMOI.txt'),
      userReadme
    );

    // 5. Créer un script d'installation des dépendances
    console.log('⚙️ Création du script d\'installation...');
    const installerBat = `@echo off
title VHR Dashboard - Installation
echo ========================================
echo   VHR Dashboard - Installation
echo ========================================
echo.
echo Installation des dependances...
echo Cela peut prendre quelques minutes...
echo.

npm install

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Installation terminee avec succes!
    echo.
    echo Vous pouvez maintenant lancer:
    echo   "VHR Dashboard.bat"
    echo ========================================
) else (
    echo.
    echo [ERREUR] L'installation a echoue!
    echo Verifiez que Node.js est bien installe.
)

echo.
pause
`;

    await fs.writeFile(
      path.join(DIST_DIR, 'INSTALLER.bat'),
      installerBat
    );

    // 6. Créer l'archive ZIP
    console.log('📦 Création de l\'archive ZIP...');
    const zipPath = path.join(__dirname, `${PACKAGE_NAME}.zip`);
    await createZip(DIST_DIR, zipPath);

    console.log('\n========================================');
    console.log('✅ Package créé avec succès!');
    console.log(`📦 Fichier: ${PACKAGE_NAME}.zip`);
    console.log(`📁 Taille: ${(await fs.stat(zipPath)).size / 1024 / 1024} MB`);
    console.log('========================================\n');

    // 7. Afficher les instructions
    console.log('Instructions pour distribution:');
    console.log(`1. Partagez le fichier: ${PACKAGE_NAME}.zip`);
    console.log('2. L\'utilisateur doit:');
    console.log('   - Extraire le ZIP');
    console.log('   - Double-cliquer sur INSTALLER.bat');
    console.log('   - Puis lancer "VHR Dashboard.bat"');
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
