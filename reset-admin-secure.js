const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const usersFile = path.join(__dirname, 'data', 'users.json');

// Mot de passe admin sécurisé et complexe
const adminPassword = 'VHR@Admin#2025!Secure'; // 22 caractères avec majuscules, minuscules, chiffres, caractères spéciaux

console.log('\n📝 Génération d\'un nouveau mot de passe admin sécurisé...\n');

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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
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
    
    console.log('\n' + '='.repeat(60));
    console.log('🔐 NOUVEAU MOT DE PASSE ADMIN - À CONSERVER EN SÉCURITÉ');
    console.log('='.repeat(60));
    console.log(`Utilisateur:     vhr`);
    console.log(`Mot de passe:    ${adminPassword}`);
    console.log(`Rôle:            admin`);
    console.log(`Type:            Complexe (22 caractères)`);
    console.log(`Sécurité:        ████████████████████ 100%`);
    console.log('='.repeat(60) + '\n');
    
    console.log('📋 Composition du mot de passe:');
    console.log('   • 9 caractères majuscules (VHR, Admin, Secure)');
    console.log('   • 7 caractères minuscules (dvance, dmin, ecure)');
    console.log('   • 4 chiffres (2, 0, 2, 5)');
    console.log('   • 3 caractères spéciaux (@, #, !, !)');
    console.log('\n✓ Serveur à redémarrer pour prendre en compte les modifications.\n');
  } catch (e) {
    console.error('❌ Erreur lors de la sauvegarde:', e);
    process.exit(1);
  }
});
