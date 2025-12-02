const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const usersFile = path.join(__dirname, 'data', 'users.json');

// Hasher le mot de passe admin
const adminPassword = 'vhr123'; // Mot de passe admin simple
bcrypt.hash(adminPassword, 10, (err, hash) => {
  if (err) {
    console.error('❌ Erreur lors du hachage:', err);
    process.exit(1);
  }

  // Lire les utilisateurs existants
  let users = [];
  if (fs.existsSync(usersFile)) {
    try {
      users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    } catch (e) {
      console.error('❌ Erreur lors de la lecture de users.json:', e);
      process.exit(1);
    }
  }

  // Trouver et mettre à jour le compte admin
  const adminIdx = users.findIndex(u => u.username === 'vhr');
  
  const adminUser = {
    username: 'vhr',
    passwordHash: hash,
    role: 'admin',
    email: 'admin@example.local',
    stripeCustomerId: null,
    latestInvoiceId: null,
    lastInvoicePaidAt: null,
    subscriptionStatus: null,
    subscriptionId: null,
    createdAt: new Date().toISOString()
  };

  if (adminIdx >= 0) {
    users[adminIdx] = { ...users[adminIdx], ...adminUser };
    console.log(`✓ Compte admin "vhr" mis à jour`);
  } else {
    users.push(adminUser);
    console.log(`✓ Compte admin "vhr" créé`);
  }

  // Sauvegarder
  try {
    if (!fs.existsSync(path.join(__dirname, 'data'))) {
      fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    }
    
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    console.log(`✓ Fichier sauvegardé: ${usersFile}`);
    
    console.log('\n📝 Identifiants admin:');
    console.log(`   Utilisateur: vhr`);
    console.log(`   Mot de passe: ${adminPassword}`);
    console.log(`   Rôle: admin`);
  } catch (e) {
    console.error('❌ Erreur lors de la sauvegarde:', e);
    process.exit(1);
  }
});
