#!/usr/bin/env node
/**
 * Test Email sur Webhook Stripe
 * Simule un paiement Stripe et teste l'envoi d'email
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const emailService = require('./services/emailService');

async function testEmailOnPayment() {
  console.log('\n========================================');
  console.log('🧪 TEST EMAIL SUR PAIEMENT STRIPE');
  console.log('========================================\n');

  try {
    // Initialiser le service email
    console.log('[1/4] Initialisation du service email...');
    emailService.initEmailTransporter();
    console.log('✅ Service email initialisé\n');

    // Créer une session de checkout test
    console.log('[2/4] Création d\'une session de paiement test...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID_PERPETUAL_PRO,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://vhr-dashboard-site.onrender.com/account.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://vhr-dashboard-site.onrender.com/pricing.html',
      customer_email: 'test@example.com',
      metadata: {
        test: 'true',
      },
    });
    console.log(`✅ Session créée: ${session.id}\n`);

    // Tester l'envoi d'email manuel
    console.log('[3/4] Test d\'envoi d\'email manuel...');
    const testUser = {
      email: process.env.TEST_EMAIL || 'test@example.com',
      username: 'TestUser'
    };

    const purchaseData = {
      planName: 'Perpetual Pro',
      orderId: session.id,
      price: '499.00',
      licenseDuration: 'Perpétuel',
      updatesUntil: '2026-12-05'
    };

    const emailResult = await emailService.sendPurchaseSuccessEmail(testUser, purchaseData);
    
    if (emailResult.success) {
      console.log('✅ Email envoyé avec succès!');
      console.log(`   Message ID: ${emailResult.messageId}`);
      console.log(`   Clé de licence: ${emailResult.licenseKey}\n`);
    } else {
      console.warn('⚠️  Email non envoyé (service désactivé ou erreur)');
      console.log(`   Raison: ${emailResult.error}\n`);
    }

    // Résumé
    console.log('[4/4] Résumé du test...\n');
    console.log('========================================');
    console.log('📊 RÉSULTATS');
    console.log('========================================\n');

    console.log('Configuration email:');
    console.log(`  ENABLED: ${process.env.EMAIL_ENABLED || 'false'}`);
    console.log(`  SMTP_HOST: ${process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com'}`);
    console.log(`  BREVO_SMTP_USER: ${process.env.BREVO_SMTP_USER ? '✓ Configuré' : '✗ Non configuré'}`);
    console.log(`  BREVO_SMTP_PASS: ${process.env.BREVO_SMTP_PASS ? '✓ Configuré' : '✗ Non configuré'}\n`);

    console.log('Paiement Stripe test:');
    console.log(`  Session ID: ${session.id}`);
    console.log(`  Mode: ${session.mode}`);
    console.log(`  Status: ${session.payment_status}`);
    console.log(`  Email client: ${testUser.email}\n`);

    console.log('Email transactionnel:');
    console.log(`  Status: ${emailResult.success ? '✅ Envoyé' : '⚠️ Pas envoyé'}`);
    console.log(`  Type: PURCHASE_SUCCESS`);
    console.log(`  Destinataire: ${testUser.email}\n`);

    console.log('========================================');
    console.log('✅ TEST COMPLET');
    console.log('========================================\n');

    if (!process.env.EMAIL_ENABLED) {
      console.log('💡 Pour activer les emails en production:');
      console.log('   1. Va sur Render Dashboard');
      console.log('   2. Settings → Environment Variables');
      console.log('   3. Ajoute:');
      console.log('      - BREVO_SMTP_USER');
      console.log('      - BREVO_SMTP_PASS');
      console.log('      - EMAIL_ENABLED=true\n');
    }

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    process.exit(1);
  }
}

// Lancer le test
testEmailOnPayment();
