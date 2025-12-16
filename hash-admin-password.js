// Script to hash admin password with bcrypt
const bcrypt = require('bcrypt');

const adminPassword = '04091110RppvlTa2025';
const saltRounds = 10;

bcrypt.hash(adminPassword, saltRounds, (err, hash) => {
  if (err) {
    console.error('❌ Error hashing password:', err);
    process.exit(1);
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           ADMIN PASSWORD HASH GENERATED SUCCESSFULLY             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  console.log('🔐 Admin Password Hash:\n');
  console.log(`   ${hash}\n`);
  
  console.log('📝 Use this in server.js line ~1241:\n');
  console.log(`   passwordHash: '${hash}', // password: ${adminPassword}\n`);
  
  console.log('🌐 For Render Environment Variables, add:\n');
  console.log(`   ADMIN_PASSWORD = ${adminPassword}\n`);
  
  console.log('✅ Original password: ' + adminPassword);
  console.log('✅ Hash length:', hash.length, 'characters\n');
});
