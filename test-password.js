const bcrypt = require('bcrypt');

const hash = '$2b$10$IrOXRLCQRyXr51KeqFO94uu8XIbHvGkejRZAioysdm0EEmy8l3pYi';
const password = 'VhrDashboard@2025';

bcrypt.compare(password, hash, (err, match) => {
  if (err) {
    console.error('Erreur:', err);
    process.exit(1);
  }
  console.log(match ? '✓ Mot de passe valide' : '✗ Mot de passe invalide');
  process.exit(0);
});
