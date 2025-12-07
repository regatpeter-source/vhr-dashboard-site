#!/usr/bin/env node

/**
 * Test de réception d'emails
 * Teste l'envoi d'emails de confirmation de paiement
 */

require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmailSending() {
  console.log('📧 Test d\'envoi d\'emails\n');
  console.log('='.repeat(60));
  
  // 1. Test email de confirmation d'achat (licence perpétuelle)
  console.log('\n📝 Test 1: Email de confirmation d\'achat (licence perpétuelle 499€)');
  console.log('-'.repeat(60));
  
  const testUserPerpetual = {
    username: 'TestUser_Perpetual',
    email: 'regatpeter@hotmail.fr'
  };
  
  const perpetualPurchaseData = {
    licenseKey: 'VHR-ABCD-EFGH-IJKL-MNOP-QRST',
    planName: 'VHR Dashboard - Licence à Vie',
    price: 499,
    orderId: 'order_' + Date.now(),
    licenseDuration: 'Perpétuel (jamais expirer)',
    downloadLink: 'http://localhost:3000/downloads/vhr-dashboard-pro.zip'
  };
  
  try {
    console.log(`Envoi vers: ${testUserPerpetual.email}`);
    console.log('Données:', {
      username: testUserPerpetual.username,
      license: perpetualPurchaseData.licenseKey,
      price: perpetualPurchaseData.price + '€'
    });
    
    const result1 = await emailService.sendPurchaseSuccessEmail(testUserPerpetual, perpetualPurchaseData);
    
    if (result1.success) {
      console.log('✅ Email envoyé avec succès !');
      console.log(`   Message ID: ${result1.messageId}`);
      console.log(`   Clé de licence: ${result1.licenseKey}`);
    } else {
      console.log('❌ Erreur lors de l\'envoi:', result1.error);
    }
  } catch (error) {
    console.error('❌ Exception:', error.message);
  }
  
  // 2. Test email de confirmation d'abonnement
  console.log('\n📝 Test 2: Email de confirmation d\'abonnement (29€/mois)');
  console.log('-'.repeat(60));
  
  const testUserSubscription = {
    username: 'TestUser_Subscription',
    email: 'regatpeter@hotmail.fr'
  };
  
  const subscriptionData = {
    planName: 'STANDARD',
    price: 29,
    billingPeriod: 'mois',
    userName: testUserSubscription.username
  };
  
  try {
    console.log(`Envoi vers: ${testUserSubscription.email}`);
    console.log('Données:', {
      username: testUserSubscription.username,
      plan: subscriptionData.planName,
      price: subscriptionData.price + '€/' + subscriptionData.billingPeriod
    });
    
    const result2 = await emailService.sendSubscriptionSuccessEmail(testUserSubscription, subscriptionData);
    
    if (result2.success) {
      console.log('✅ Email envoyé avec succès !');
      console.log(`   Message ID: ${result2.messageId}`);
    } else {
      console.log('❌ Erreur lors de l\'envoi:', result2.error);
    }
  } catch (error) {
    console.error('❌ Exception:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Instructions:');
  console.log('  1. Vérifiez votre email: regatpeter@hotmail.fr');
  console.log('  2. Consultez les dossiers "Reçus" et "Spam"');
  console.log('  3. Les emails devraient arriver dans les 30 secondes');
  console.log('  4. Cherchez les sujets:');
  console.log('     - ✅ Votre licence VHR Dashboard est activée');
  console.log('     - ✅ Votre abonnement VHR Dashboard est actif');
  console.log('\n');
}

// Initialiser le service et lancer les tests
console.log('🔧 Initialisation du service d\'email...\n');
emailService.initEmailTransporter();

testEmailSending().then(() => {
  console.log('✨ Tests terminés !');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});
