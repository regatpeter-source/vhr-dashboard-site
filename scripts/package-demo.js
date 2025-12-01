#!/usr/bin/env node
const path = require('path');
const fs = require('fs-extra');
const archiver = require('archiver');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist', 'demo');
const PUBLIC = path.join(ROOT, 'public');
const DOWNLOADS = path.join(ROOT, 'downloads');

async function replaceAbsolutePathsInHtml(filePath) {
  let content = await fs.readFile(filePath, 'utf8');
  // Replace absolute root paths like href="/..." or src="/..." to relative href="..."
  content = content.replace(/(href|src)=("|')\/(?!\/)([^"'>]+)("|')/g, (m, attr, q, p, q2) => `${attr}=${q}${p}${q2}`);
  // Replace meta refresh content like content="0; url=/path" (no quotes around /path)
  content = content.replace(/(url=)\/(?!\/)([^"'>\s]+)/g, (m, p1, p2) => `${p1}${p2}`);
  // Replace CSS url("/...") to url("...") and url('/...') and url(/...)
  content = content.replace(/url\(("|')?\/(?!\/)([^"')]+)("|')?\)/g, (m, q1, p, q2) => `url(${q1 || ''}${p}${q2 || ''})`);
  await fs.writeFile(filePath, content, 'utf8');
}

async function copyHtmlFiles(destDir) {
  const rootFiles = ['index.html', 'account.html', 'contact.html', 'features.html', 'pricing.html', 'developer-setup.html', 'mentions.html', 'robots.txt'];
  for (const f of rootFiles) {
    const src = path.join(ROOT, f);
    if (await fs.pathExists(src)) {
      await fs.copy(src, path.join(destDir, f));
      if (f.endsWith('.html')) {
        await replaceAbsolutePathsInHtml(path.join(destDir, f));
      }
    }
  }
  // Copy site-vitrine files (optional additional static pages) into a folder
  const siteDir = path.join(ROOT, 'site-vitrine');
  if (await fs.pathExists(siteDir)) {
    await fs.copy(siteDir, path.join(destDir, 'site-vitrine'));
    // fix html files in site-vitrine
    const htmls = await fs.readdir(path.join(destDir, 'site-vitrine'));
    for (const f of htmls) {
      if (f.endsWith('.html')) await replaceAbsolutePathsInHtml(path.join(destDir, 'site-vitrine', f));
    }
  }
  // Copy demo starter file
  const demoStarter = path.join(ROOT, 'scripts', 'demo-starter.html');
  if (await fs.pathExists(demoStarter)) {
    await fs.copy(demoStarter, path.join(destDir, 'START-HERE.html'));
  }
}

async function copyPublic(destDir) {
  if (await fs.pathExists(PUBLIC)) {
    await fs.copy(PUBLIC, destDir, { overwrite: true });
    // adjust css files for url(/...) patterns
    const cssPath = path.join(destDir, 'style.css');
    if (await fs.pathExists(cssPath)) {
      let css = await fs.readFile(cssPath, 'utf8');
      css = css.replace(/url\(("|')?\/(?!\/)([^"')]+)("|')?\)/g, (m, q1, p, q2) => `url(${q1 || ''}${p}${q2 || ''})`);
      await fs.writeFile(cssPath, css, 'utf8');
    }
  }
}

async function copyDownloads(destDir) {
  // For web demo, we don't include APK anymore — only the web assets and documentation
  const files = ['demo_readme.txt'];
  for (const f of files) {
    const src1 = path.join(DOWNLOADS, f);
    const src2 = path.join(PUBLIC, 'downloads', f);
    if (await fs.pathExists(src1)) {
      await fs.copy(src1, path.join(destDir, f));
    } else if (await fs.pathExists(src2)) {
      await fs.copy(src2, path.join(destDir, f));
    }
  }
}

async function createZip(zipPath, srcDir) {
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  return new Promise((resolve, reject) => {
    output.on('close', () => resolve(archive.pointer()));
    archive.on('warning', err => { if (err.code === 'ENOENT') console.warn(err); else reject(err); });
    archive.on('error', err => reject(err));
    archive.pipe(output);
    archive.directory(srcDir, false);
    archive.finalize();
  });
}

async function main() {
  const args = process.argv.slice(2);
  const makeZip = args.includes('zip') || args.includes('--zip');
  if (await fs.pathExists(DIST)) {
    await fs.remove(DIST);
  }
  await fs.mkdirp(DIST);
  await copyHtmlFiles(DIST);
  await copyPublic(DIST);
  await copyDownloads(DIST);

  // Add a comprehensive README for the interactive web demo
  const readmeText = `VHR DASHBOARD - Interactive Demo
==================================

⚡ DÉMARRAGE RAPIDE:

1. Ouvrez le fichier START-HERE.html dans votre navigateur
2. Suivez les instructions simples (en français)
3. C'est tout ! La démo est prête à explorer.

---

📦 Contenu de la démo:

- START-HERE.html: Guide d'installation interactif (COMMENCEZ ICI!)
- index.html: Homepage avec features overview
- features.html: Detailed features list
- pricing.html: Pricing information
- account.html: User account & login demo (test: vhr / demo123)
- developer-setup.html: Technical integration guide
- Tous les CSS, JavaScript et assets pour une expérience complète

🌍 Compatibilité:

- Chrome, Firefox, Safari, Edge (tous les navigateurs modernes)
- Windows, Mac, Linux
- Aucun serveur nécessaire — tout fonctionne localement

✨ Fonctionnalités:

- Interface complète et interactive
- Navigation fluide
- Formulaires testables
- Design responsive
- Pas d'installation requise

📝 Notes:

- Version de démonstration — certaines fonctionnalités (paiements Stripe, streaming réel) sont mockées
- Toutes les pages sont interactives — explorez et testez !
- Pour la production, visitez le site officiel ou contactez le support

Besoin d'aide? Ouvrez START-HERE.html pour des instructions pas à pas.

Bon test! 🚀
`;
  await fs.writeFile(path.join(DIST, 'README.txt'), readmeText, 'utf8');

  const zipFinalName = path.join(ROOT, 'downloads', 'vhr-dashboard-demo-final.zip');
  const zipName = path.join(ROOT, 'downloads', 'vhr-dashboard-demo.zip');
  if (makeZip) {
    console.log('Creating zip:', zipFinalName);
    await createZip(zipFinalName, DIST);
    console.log('Zip created at', zipFinalName);
    // Create a second zip with canonical name (compatibility)
    if (zipFinalName !== zipName) {
      await fs.copy(zipFinalName, zipName);
    }
    // Copy created zips into public/downloads and root public for convenience
    const pubDownloads = path.join(ROOT, 'public', 'downloads');
    const pubRoot = path.join(ROOT, 'public');
    if (await fs.pathExists(pubDownloads)) {
      await fs.copy(zipFinalName, path.join(pubDownloads, path.basename(zipFinalName)));
      await fs.copy(zipName, path.join(pubDownloads, path.basename(zipName)));
    }
    if (await fs.pathExists(pubRoot)) {
      await fs.copy(zipName, path.join(pubRoot, path.basename(zipName)));
    }
    // Also copy zip to site-vitrine folder so it can be published via GH Pages or similar static hosting
    const siteVitrineDir = path.join(ROOT, 'site-vitrine');
    if (await fs.pathExists(siteVitrineDir)) {
      const svDownloads = path.join(siteVitrineDir, 'downloads');
      await fs.mkdirp(svDownloads);
      await fs.copy(zipName, path.join(svDownloads, path.basename(zipName)));
      await fs.copy(zipName, path.join(siteVitrineDir, path.basename(zipName)));
    }
  } else {
    console.log('Prepared demo files in', DIST);
  }
}

main().catch(err => {
  console.error('Package demo failed', err);
  process.exit(1);
});

