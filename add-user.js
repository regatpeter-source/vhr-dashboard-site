const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const username = 'VhrDashboard';
const password = 'VhrDashboard@2025'; // Mot de passe initial

// Chemins
const usersFile = path.join(__dirname, 'data', 'users.json');

// Hasher le mot de passe
bcrypt.hash(password, 10, (err, hash) => {
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

  // Chercher et mettre à jour ou créer l'utilisateur
  const existingIdx = users.findIndex(u => u.username === username);
  
  const newUser = {
    username: username,
    passwordHash: hash,
    role: 'user', // ou 'admin' si désiré
    email: `${username.toLowerCase()}@example.local`,
    stripeCustomerId: null,
    latestInvoiceId: null,
    lastInvoicePaidAt: null,
    subscriptionStatus: null,
    subscriptionId: null,
    createdAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...newUser };
    console.log(`✓ Utilisateur "${username}" mis à jour`);
  } else {
    users.push(newUser);
    console.log(`✓ Utilisateur "${username}" créé`);
  }

  // Sauvegarder
  try {
    // Créer le dossier data s'il n'existe pas
    if (!fs.existsSync(path.join(__dirname, 'data'))) {
      fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    }
    
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    console.log(`✓ Fichier sauvegardé: ${usersFile}`);
    console.log(`\n📝 Identifiants:`);
    console.log(`   Utilisateur: ${username}`);
    console.log(`   Mot de passe: ${password}`);
    console.log(`   Rôle: ${newUser.role}`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Erreur lors de la sauvegarde:', e);
    process.exit(1);
  }
});
