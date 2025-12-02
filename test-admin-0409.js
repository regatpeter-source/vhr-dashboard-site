const bcrypt = require('bcrypt');

const hash = '$2b$10$FxWTQQfdHoQTjAfU7u7Q9.mjPsQeiOjnsnjS73lisxT9DI3nJnL0.';
const password = '0409';

bcrypt.compare(password, hash, (err, match) => {
  if (err) {
    console.error('Erreur:', err);
    process.exit(1);
  }
  console.log(match ? '✓ 0409 est valide pour admin' : '✗ 0409 ne fonctionne pas');
  process.exit(0);
});
