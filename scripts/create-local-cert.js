#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const devcert = require('devcert');

const ROOT_DIR = path.resolve(__dirname, '..');
const certPath = path.join(ROOT_DIR, 'cert.pem');
const keyPath = path.join(ROOT_DIR, 'key.pem');

const hostsEnv = process.env.LOCAL_CERT_HOSTS;
const hosts = hostsEnv
  ? hostsEnv.split(',').map(h => h.trim()).filter(Boolean)
  : ['localhost'];

const hostDescription = hosts.length === 1 ? hosts[0] : hosts.join(', ');

async function main() {
  console.log('🔐 Demande de certificat local sécurisé pour :', hostDescription);

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    console.log('ℹ️  Des fichiers cert.pem/key.pem existent déjà. Supprimez-les si vous souhaitez les régénérer.');
    process.exit(0);
  }

  try {
    const ssl = await devcert.certificateFor(hosts, { getCaPath: true });
    fs.writeFileSync(certPath, ssl.cert, { encoding: 'utf8' });
    fs.writeFileSync(keyPath, ssl.key, { encoding: 'utf8' });

    console.log('✅ Certificat généré et enregistré :', certPath);
    console.log('✅ Clé privée générée et enregistrée :', keyPath);
    if (ssl.caPath) {
      console.log('ℹ️  Chemin du CA root généré :', ssl.caPath);
    }
    console.log('💡 Chrome/Edge et la plupart des navigateurs ont maintenant un CA local de confiance (sudo/UAC peut avoir été demandé).');
    console.log('📦 Redémarrez le serveur et Chrome pour appliquer la confiance sur https://localhost:3000/vhr-dashboard-pro.html');
  } catch (error) {
    console.error('❌ Impossible de générer le certificat devcert :', error.message || error);
    process.exit(1);
  }
}

main();
