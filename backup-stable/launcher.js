const { spawn } = require('child_process');
const path = require('path');
const open = require('open');

console.log('========================================');
console.log('   VHR DASHBOARD - Gestionnaire VR     ');
console.log('========================================\n');
console.log('Démarrage du serveur...\n');

// Démarrer le serveur
const serverPath = path.join(__dirname, 'server.js');
const server = spawn('node', [serverPath], {
  cwd: __dirname,
  stdio: 'inherit'
});

// Attendre 3 secondes puis ouvrir le navigateur
setTimeout(() => {
  console.log('\nOuverture du dashboard dans le navigateur...\n');
  open('http://localhost:3000/vhr-dashboard-app.html');
  console.log('========================================');
  console.log('Dashboard ouvert!');
  console.log('Pour arrêter: fermez cette fenêtre');
  console.log('========================================\n');
}, 3000);

// Gérer l'arrêt propre
process.on('SIGINT', () => {
  console.log('\nArrêt du serveur...');
  server.kill();
  process.exit(0);
});

process.on('exit', () => {
  server.kill();
});
