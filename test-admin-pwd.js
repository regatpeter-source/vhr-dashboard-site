const bcrypt = require('bcrypt');

// Test admin password
const adminHash = '$2b$10$Tslyqklg0NCclvgbMm/de.wPgBYzX.IwLnYlBMjyK5wAv.3CUfmr2';
const passwordsToTest = ['password', 'vhr', 'admin', 'vhr123', 'VHR@2025'];

console.log('Testing admin account passwords...\n');

let completed = 0;
passwordsToTest.forEach((pwd) => {
  bcrypt.compare(pwd, adminHash, (err, match) => {
    if (err) console.error(`Error: ${err}`);
    console.log(`Password "${pwd}": ${match ? '✓ MATCH' : '✗ no match'}`);
    completed++;
    if (completed === passwordsToTest.length) process.exit(0);
  });
});
