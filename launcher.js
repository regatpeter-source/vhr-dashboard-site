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
  stdio: 'pipe'  // Capture la sortie
});

let serverReady = false;
let dashboardOpened = false;

// Écouter la sortie du serveur pour détecter quand il est prêt
server.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  
  // Chercher le message indiquant que le serveur est prêt
  if (output.includes('Server: http://localhost:3000') && !serverReady) {
    serverReady = true;
    console.log('\n✓ Serveur prêt! Ouverture du dashboard...\n');
    
    // Ouvrir le navigateur après que le serveur soit ready
    if (!dashboardOpened) {
      dashboardOpened = true;
      setTimeout(() => {
        open('http://localhost:3000/vhr-dashboard-app.html');
        console.log('========================================');
        console.log('Dashboard ouvert!');
        console.log('Pour arrêter: fermez cette fenêtre');
        console.log('========================================\n');
      }, 1000);
    }
  }
});

// Afficher aussi les erreurs
server.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Fallback: ouvrir après 12 secondes si le serveur n'affiche pas le message
setTimeout(() => {
  if (!dashboardOpened) {
    dashboardOpened = true;
    console.log('\n⏱️ Timeout - ouverture du dashboard...\n');
    open('http://localhost:3000/vhr-dashboard-app.html');
    console.log('========================================');
    console.log('Dashboard ouvert!');
    console.log('Pour arrêter: fermez cette fenêtre');
    console.log('========================================\n');
  }
}, 12000);


// Gérer l'arrêt propre
process.on('SIGINT', () => {
  console.log('\nArrêt du serveur...');
  server.kill();
  process.exit(0);
});

process.on('exit', () => {
  server.kill();
});
