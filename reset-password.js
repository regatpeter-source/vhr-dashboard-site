const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const usersFile = path.join(__dirname, 'data', 'users.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  try {
    // Lire les utilisateurs
    if (!fs.existsSync(usersFile)) {
      console.error('❌ Fichier users.json non trouvé');
      process.exit(1);
    }

    let users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));

    console.log('\n🔐 Réinitialisation de mot de passe\n');
    
    // Afficher les utilisateurs disponibles
    console.log('Utilisateurs disponibles:');
    users.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.username} (${u.role})`);
    });

    // Demander quel utilisateur
    const userIndex = await question('\nNuméro de l\'utilisateur à modifier (1-' + users.length + '): ');
    const idx = parseInt(userIndex) - 1;

    if (idx < 0 || idx >= users.length) {
      console.error('❌ Numéro invalide');
      process.exit(1);
    }

    const user = users[idx];
    console.log(`\n✓ Sélectionné: ${user.username}`);

    // Demander le nouveau mot de passe
    const newPassword = await question('Nouveau mot de passe: ');
    const confirmPassword = await question('Confirmer le mot de passe: ');

    if (newPassword !== confirmPassword) {
      console.error('❌ Les mots de passe ne correspondent pas');
      process.exit(1);
    }

    if (newPassword.length < 6) {
      console.error('❌ Le mot de passe doit faire au moins 6 caractères');
      process.exit(1);
    }

    // Hasher le nouveau mot de passe
    console.log('\n⏳ Hachage du mot de passe...');
    const newHash = await bcrypt.hash(newPassword, 10);

    // Mettre à jour l'utilisateur
    user.passwordHash = newHash;

    // Sauvegarder
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

    console.log('\n✅ Mot de passe réinitialisé avec succès!\n');
    console.log(`📝 Identifiants:`);
    console.log(`   Utilisateur: ${user.username}`);
    console.log(`   Nouveau mot de passe: ${newPassword}\n`);

    process.exit(0);
  } catch (e) {
    console.error('❌ Erreur:', e.message);
    process.exit(1);
  }
}

main();
