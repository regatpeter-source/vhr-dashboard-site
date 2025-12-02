const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Créer le répertoire démo simplifié
const demoDir = path.join(__dirname, '..', 'downloads', 'vhr-dashboard-demo-simple');
if (fs.existsSync(demoDir)) {
  fs.rmSync(demoDir, { recursive: true });
}
fs.mkdirSync(demoDir, { recursive: true });

// 1. Créer index.html - page d'accueil simple
const indexHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VHR Dashboard - Démo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      width: 100%;
      background: white;
      border-radius: 10px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    h1 { 
      color: #333;
      margin-bottom: 10px;
      font-size: 2.5em;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 1.1em;
    }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 40px 0;
      text-align: left;
    }
    .feature {
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .feature h3 {
      color: #667eea;
      margin-bottom: 8px;
    }
    .feature p {
      color: #666;
      font-size: 0.9em;
    }
    .buttons {
      display: flex;
      gap: 15px;
      margin-top: 40px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .btn {
      padding: 12px 30px;
      border: none;
      border-radius: 6px;
      font-size: 1em;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-block;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }
    .btn-secondary {
      background: #f0f0f0;
      color: #333;
      border: 2px solid #ddd;
    }
    .btn-secondary:hover {
      background: #e8e8e8;
    }
    .info {
      background: #e3f2fd;
      border: 1px solid #2196F3;
      color: #0d47a1;
      padding: 15px;
      border-radius: 6px;
      margin-top: 30px;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 VHR Dashboard</h1>
    <p class="subtitle">Démo complète - Version 1.0</p>
    
    <div class="features">
      <div class="feature">
        <h3>📊 Dashboard</h3>
        <p>Interface complète avec tableaux de bord personnalisés</p>
      </div>
      <div class="feature">
        <h3>👥 Gestion d'équipe</h3>
        <p>Gérez vos employés et leurs informations</p>
      </div>
      <div class="feature">
        <h3>⏱️ Suivi du temps</h3>
        <p>Enregistrez les heures de travail facilement</p>
      </div>
      <div class="feature">
        <h3>📈 Rapports</h3>
        <p>Générez des rapports détaillés et exportables</p>
      </div>
    </div>

    <div class="buttons">
      <button class="btn btn-primary" onclick="openDashboard()">Ouvrir le Dashboard</button>
      <a href="#" class="btn btn-secondary" onclick="downloadFull(); return false;">Télécharger la version complète</a>
    </div>

    <div class="info">
      <strong>💡 Conseil:</strong> Cette démo fonctionne complètement en local. Vous pouvez explorer toutes les fonctionnalités sans connexion Internet !
    </div>
  </div>

  <script>
    function openDashboard() {
      window.location.href = 'dashboard.html';
    }
    
    function downloadFull() {
      alert('Pour la version complète avec backend, visitez notre site officiel!');
    }
  </script>
</body>
</html>`;

// 2. Créer dashboard.html - interface demo simple
const dashboardHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VHR Dashboard - Interface</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 { font-size: 1.8em; }
    .header a { 
      color: white; 
      text-decoration: none;
      padding: 10px 20px;
      background: rgba(255,255,255,0.2);
      border-radius: 5px;
      transition: all 0.3s;
    }
    .header a:hover { background: rgba(255,255,255,0.3); }
    
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      padding: 25px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .stat-card h3 { color: #667eea; margin-bottom: 10px; }
    .stat-number { 
      font-size: 2.5em;
      font-weight: bold;
      color: #333;
      margin: 10px 0;
    }
    .stat-desc { color: #999; font-size: 0.9em; }
    
    .section {
      background: white;
      padding: 25px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .section h2 { color: #333; margin-bottom: 20px; }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th { 
      background: #f8f9fa;
      color: #333;
      font-weight: 600;
    }
    tr:hover { background: #f8f9fa; }
    
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .badge-active { background: #e8f5e9; color: #2e7d32; }
    .badge-inactive { background: #ffebee; color: #c62828; }
    .badge-pending { background: #fff3e0; color: #e65100; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 VHR Dashboard - Démo</h1>
    <a href="index.html">← Retour à l'accueil</a>
  </div>

  <div class="container">
    <div class="stats">
      <div class="stat-card">
        <h3>👥 Employés</h3>
        <div class="stat-number">24</div>
        <div class="stat-desc">Actifs cette semaine</div>
      </div>
      <div class="stat-card">
        <h3>⏱️ Heures totales</h3>
        <div class="stat-number">576</div>
        <div class="stat-desc">Enregistrées ce mois</div>
      </div>
      <div class="stat-card">
        <h3>📈 Productivité</h3>
        <div class="stat-number">94%</div>
        <div class="stat-desc">Par rapport au mois dernier</div>
      </div>
      <div class="stat-card">
        <h3>💰 Budget</h3>
        <div class="stat-number">€45.2k</div>
        <div class="stat-desc">Dépensé ce mois</div>
      </div>
    </div>

    <div class="section">
      <h2>📋 Gestion des employés</h2>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Poste</th>
            <th>Département</th>
            <th>Statut</th>
            <th>Heures (cette semaine)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Jean Dupont</td>
            <td>Développeur</td>
            <td>IT</td>
            <td><span class="badge badge-active">Actif</span></td>
            <td>40h</td>
          </tr>
          <tr>
            <td>Marie Martin</td>
            <td>Chef de projet</td>
            <td>Management</td>
            <td><span class="badge badge-active">Actif</span></td>
            <td>38h</td>
          </tr>
          <tr>
            <td>Pierre Bernard</td>
            <td>Designer UX</td>
            <td>Design</td>
            <td><span class="badge badge-pending">En congés</span></td>
            <td>0h</td>
          </tr>
          <tr>
            <td>Sophie Laurent</td>
            <td>Comptable</td>
            <td>Finance</td>
            <td><span class="badge badge-active">Actif</span></td>
            <td>39h</td>
          </tr>
          <tr>
            <td>Thomas Moreau</td>
            <td>Responsable RH</td>
            <td>RH</td>
            <td><span class="badge badge-active">Actif</span></td>
            <td>37h</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>📊 Activité récente</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Événement</th>
            <th>Utilisateur</th>
            <th>Détails</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>02/12/2025 14:30</td>
            <td>Login</td>
            <td>Jean Dupont</td>
            <td>Connexion au système</td>
          </tr>
          <tr>
            <td>02/12/2025 14:15</td>
            <td>Rapport généré</td>
            <td>Marie Martin</td>
            <td>Rapport mensuel exporté en PDF</td>
          </tr>
          <tr>
            <td>02/12/2025 13:45</td>
            <td>Congés approuvés</td>
            <td>Thomas Moreau</td>
            <td>Congés de Pierre Bernard approuvés</td>
          </tr>
          <tr>
            <td>02/12/2025 11:20</td>
            <td>Utilisateur ajouté</td>
            <td>Sophie Laurent</td>
            <td>Nouvel employé enregistré dans le système</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

// 3. Créer un simple serveur Node.js pour lancer localement
const serverJs = `#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;
const DIR = __dirname;

const server = http.createServer((req, res) => {
  const pathname = url.parse(req.url).pathname;
  let filePath = path.join(DIR, pathname === '/' ? 'index.html' : pathname);
  
  // Sécurité: éviter les traversées de répertoires
  if (!filePath.startsWith(DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    
    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    };
    
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(\`\n✅ VHR Dashboard Démo - Serveur lancé\`);
  console.log(\`\n📱 Ouvrez votre navigateur: http://localhost:\${PORT}\`);
  console.log(\`\n💡 Appuyez sur Ctrl+C pour arrêter le serveur\\n\`);
});
`;

// 4. Créer README.txt pour les instructions
const readmeTxt = `╔═══════════════════════════════════════════════════════╗
║         VHR DASHBOARD - DÉMO LOCALE (v1.0)           ║
╚═══════════════════════════════════════════════════════╝

🎯 DÉMARRAGE RAPIDE
═══════════════════

Option 1: Avec Node.js (recommandé)
────────────────────────────────────
1. Ouvrez un terminal dans ce dossier
2. Exécutez: node server.js
3. Ouvrez http://localhost:8080 dans votre navigateur
4. Appuyez sur Ctrl+C pour arrêter


Option 2: Sans serveur (fichiers locaux)
─────────────────────────────────────────
1. Double-cliquez sur index.html
2. Le navigateur ouvrira la démo


✨ FONCTIONNALITÉS
═════════════════

✓ Interface complète avec tableaux de bord
✓ Gestion des employés
✓ Suivi des heures de travail
✓ Rapports et statistiques
✓ Fonctionne 100% en local (pas Internet requis)


📂 STRUCTURE DES FICHIERS
═════════════════════════

vhr-dashboard-demo-simple/
├── index.html           (Page d'accueil)
├── dashboard.html       (Interface de gestion)
├── server.js           (Serveur local optionnel)
└── README.txt          (Ce fichier)


❓ QUESTIONS?
═════════════

Pour la version complète avec backend:
→ Visitez: https://vhr-dashboard.com
→ Email: support@vhr-dashboard.com


🚀 Version: 1.0
📅 Date: 02/12/2025
`;

// 5. Écrire tous les fichiers
console.log('Création de la démo simplifiée...');
fs.writeFileSync(path.join(demoDir, 'index.html'), indexHtml);
fs.writeFileSync(path.join(demoDir, 'dashboard.html'), dashboardHtml);
fs.writeFileSync(path.join(demoDir, 'server.js'), serverJs);
fs.writeFileSync(path.join(demoDir, 'README.txt'), readmeTxt);

// Rendre server.js exécutable
fs.chmodSync(path.join(demoDir, 'server.js'), 0o755);

console.log('✅ Démo créée:', demoDir);

// 6. Créer le ZIP
const downloadDir = path.join(__dirname, '..', 'downloads');
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

const output = fs.createWriteStream(path.join(downloadDir, 'vhr-dashboard-demo.zip'));
const archive = archiver('zip', { zlib: { level: 6 } });

output.on('close', () => {
  console.log('✅ ZIP créé:', path.join(downloadDir, 'vhr-dashboard-demo.zip'));
  console.log('📦 Taille:', (archive.pointer() / 1024).toFixed(2), 'KB');
});

archive.on('error', (err) => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});

archive.pipe(output);
archive.directory(demoDir + '/', 'vhr-dashboard-demo-simple');
archive.finalize();
