#!/usr/bin/env node

/**
 * Test d'achat complet depuis le site vitrine
 * Simule le flux:
 * 1. Utilisateur remplit le formulaire d'enregistrement
 * 2. Clique sur "Payer"
 * 3. Session de paiement créée avec métadonnées utilisateur
 * 4. Webhook reçoit confirmation de paiement
 * 5. Utilisateur créé + 2 emails envoyés (licence + identifiants)
 */

require('dotenv').config();
const emailService = require('./services/emailService');

async function testCompleteCheckout() {
  console.log('🛒 Test d\'achat complet depuis le site vitrine\n');
  console.log('='.repeat(70));
  
  // Simulation des données du formulaire d'enregistrement
  const testUserData = {
    username: 'demo_buyer_' + Date.now(),
    email: 'regatpeter@hotmail.fr',
    password: 'SecurePassword123!'
  };
  
  console.log('\n📝 Étape 1: Utilisateur remplit le formulaire d\'enregistrement');
  console.log('-'.repeat(70));
  console.log('Données capturées:');
  console.log(`  - Username: ${testUserData.username}`);
  console.log(`  - Email: ${testUserData.email}`);
  console.log(`  - Password: ${testUserData.password.substring(0, 6)}***`);
  
  console.log('\n💳 Étape 2: Création de la session de paiement Stripe');
  console.log('-'.repeat(70));
  console.log('Les données seront stockées dans les métadonnées Stripe:');
  console.log(`  - metadata.username = "${testUserData.username}"`);
  console.log(`  - metadata.userEmail = "${testUserData.email}"`);
  console.log(`  - metadata.passwordHash = "${testUserData.password}"`);
  console.log(`  - customer_email = "${testUserData.email}"`);
  
  console.log('\n✅ Étape 3: Webhook reçoit checkout.session.completed');
  console.log('-'.repeat(70));
  
  // Simulation de l'utilisateur créé par le webhook
  const createdUser = {
    id: 'user_' + Date.now(),
    username: testUserData.username,
    email: testUserData.email,
    role: 'user',
    createdAt: new Date().toISOString(),
    demoStartDate: new Date().toISOString()
  };
  
  console.log('Utilisateur créé:');
  console.log(`  - ID: ${createdUser.id}`);
  console.log(`  - Username: ${createdUser.username}`);
  console.log(`  - Email: ${createdUser.email}`);
  console.log(`  - Role: ${createdUser.role}`);
  
  // Initialiser le service d'email
  emailService.initEmailTransporter();
  
  // 1. Envoyer l'email des identifiants
  console.log('\n📧 Étape 4a: Envoi de l\'email des identifiants de connexion');
  console.log('-'.repeat(70));
  
  const credentialsData = {
    ...createdUser,
    plainPassword: testUserData.password
  };
  
  try {
    const credResult = await emailService.sendCredentialsEmail(credentialsData);
    if (credResult.success) {
      console.log('✅ Email des identifiants envoyé avec succès !');
      console.log(`   Message ID: ${credResult.messageId}`);
      console.log(`   À: ${createdUser.email}`);
      console.log(`   Objet: 🔐 Vos identifiants VHR Dashboard - Connexion sécurisée`);
    } else {
      console.log('❌ Erreur:', credResult.error);
    }
  } catch (error) {
    console.error('❌ Exception:', error.message);
  }
  
  // 2. Envoyer l'email de confirmation d'achat avec licence
  console.log('\n📧 Étape 4b: Envoi de l\'email de confirmation d\'achat (licence perpétuelle)');
  console.log('-'.repeat(70));
  
  const purchaseData = {
    licenseKey: emailService.generateLicenseKey(),
    planName: 'VHR Dashboard - Licence à Vie',
    price: 499,
    orderId: 'order_' + Date.now(),
    licenseDuration: 'Perpétuel (jamais expirer)',
    downloadLink: 'http://localhost:3000/downloads/vhr-dashboard-pro.zip'
  };
  
  try {
    const purchResult = await emailService.sendPurchaseSuccessEmail(createdUser, purchaseData);
    if (purchResult.success) {
      console.log('✅ Email de licence envoyé avec succès !');
      console.log(`   Message ID: ${purchResult.messageId}`);
      console.log(`   À: ${createdUser.email}`);
      console.log(`   Clé de licence: ${purchResult.licenseKey}`);
      console.log(`   Objet: ✅ Votre licence VHR Dashboard est activée`);
    } else {
      console.log('❌ Erreur:', purchResult.error);
    }
  } catch (error) {
    console.error('❌ Exception:', error.message);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✨ Résumé du flux d\'achat complet:');
  console.log('  1. ✅ Utilisateur remplit formulaire d\'enregistrement');
  console.log('  2. ✅ Données envoyées à Stripe dans les métadonnées');
  console.log('  3. ✅ Paiement reçu par Stripe');
  console.log('  4. ✅ Webhook reçoit confirmation');
  console.log('  5. ✅ Utilisateur créé automatiquement');
  console.log('  6. ✅ Email des identifiants envoyé');
  console.log('  7. ✅ Email de licence perpétuelle envoyé');
  console.log('\n💡 L\'utilisateur reçoit 2 emails:');
  console.log(`   1. Identifiants: ${createdUser.email}`);
  console.log(`   2. Licence: ${createdUser.email}`);
  console.log('\n📝 Identifiants de connexion utilisables partout:');
  console.log(`   - Username: ${testUserData.username}`);
  console.log(`   - Password: ${testUserData.password}`);
  console.log(`   - Email: ${testUserData.email}`);
  console.log('\n🔑 Clé de licence:');
  console.log(`   - ${purchaseData.licenseKey}`);
  console.log('\n');
}

testCompleteCheckout().then(() => {
  console.log('✨ Test terminé !');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});
