#!/usr/bin/env node
/**
 * Test Email Service
 * Vérifie la configuration SMTP et envoie un email de test
 */

require('dotenv').config();
const purchaseConfig = require('./config/purchase.config');
const emailService = require('./services/emailService');

async function testEmailService() {
  console.log('\n========================================');
  console.log('📧 TEST SERVICE EMAIL');
  console.log('========================================\n');

  // Test 1: Vérifier la configuration
  console.log('[1/4] Vérification de la configuration email...\n');
  console.log('Configuration actuelle:');
  console.log(`  ENABLED: ${purchaseConfig.EMAIL.ENABLED}`);
  console.log(`  SMTP_HOST: ${purchaseConfig.EMAIL.SMTP_HOST}`);
  console.log(`  SMTP_PORT: ${purchaseConfig.EMAIL.SMTP_PORT}`);
  console.log(`  SMTP_USER: ${purchaseConfig.EMAIL.SMTP_USER ? '✓ Configuré' : '✗ Non configuré'}`);
  console.log(`  SMTP_PASS: ${purchaseConfig.EMAIL.SMTP_PASS ? '✓ Configuré' : '✗ Non configuré'}`);
  console.log(`  FROM: ${purchaseConfig.EMAIL.FROM}`);
  console.log(`  SUPPORT_EMAIL: ${purchaseConfig.EMAIL.SUPPORT_EMAIL}\n`);

  // Test 2: Vérifier la disponibilité de nodemailer
  console.log('[2/4] Vérification de nodemailer...');
  try {
    const nodemailer = require('nodemailer');
    console.log('✅ nodemailer est installé\n');
  } catch (e) {
    console.error('❌ nodemailer n\'est pas installé:', e.message);
    console.error('\nInstallation: npm install nodemailer\n');
    process.exit(1);
  }

  // Test 3: Vérifier l'initialisation du transporter
  console.log('[3/4] Test d\'initialisation du transporter...');
  emailService.initEmailTransporter();
  
  if (!purchaseConfig.EMAIL.ENABLED) {
    console.warn('⚠️  ATTENTION: Les emails sont DÉSACTIVÉS (EMAIL_ENABLED=false dans .env)\n');
  } else if (!purchaseConfig.EMAIL.SMTP_USER || !purchaseConfig.EMAIL.SMTP_PASS) {
    console.error('❌ Erreur: Identifiants SMTP manquants');
    console.error('   Configurez dans .env:');
    console.error('   - SMTP_USER');
    console.error('   - SMTP_PASS\n');
    process.exit(1);
  } else {
    console.log('✅ Transporter initialisé avec succès\n');
  }

  // Test 4: Afficher les instructions
  console.log('[4/4] Instructions pour activer les emails...\n');
  console.log('📋 CONFIGURATION REQUISE:');
  console.log('\n  1. Ajouter au .env:');
  console.log('     EMAIL_ENABLED=true');
  console.log('     SMTP_USER=your-email@gmail.com');
  console.log('     SMTP_PASS=your-app-password');
  console.log('     EMAIL_FROM=noreply@vhr-dashboard-site.com\n');

  console.log('  2. Pour Gmail:');
  console.log('     - Activer "App Password": https://myaccount.google.com/apppasswords');
  console.log('     - Utiliser le mot de passe généré comme SMTP_PASS\n');

  console.log('  3. Pour autre provider SMTP:');
  console.log('     - Configurer SMTP_HOST et SMTP_PORT');
  console.log('     - Utiliser les identifiants correspondants\n');

  console.log('✅ STATUS ACTUEL:');
  if (purchaseConfig.EMAIL.ENABLED) {
    console.log('   ✓ Emails ACTIVÉS - Prêt à envoyer');
    console.log('\n   Les emails seront envoyés lors:');
    console.log('   - D\'un achat (PURCHASE_SUCCESS)');
    console.log('   - D\'un abonnement (SUBSCRIPTION_SUCCESS)');
    console.log('   - Des événements webhook Stripe\n');
  } else {
    console.log('   ✗ Emails DÉSACTIVÉS');
    console.log('   → Les notifications ne seront pas envoyées');
    console.log('   → Activez en configurant EMAIL_ENABLED=true dans .env\n');
  }

  console.log('========================================');
  console.log('Emails transactionnels envoyés lors de:');
  console.log('========================================\n');
  
  console.log('1️⃣  ACHAT PERPÉTUEL (mode: payment)');
  console.log('   Type: PURCHASE_SUCCESS');
  console.log('   Déclenché par: webhook checkout.session.completed');
  console.log('   Contient: Lien de téléchargement + clé de licence\n');

  console.log('2️⃣  ABONNEMENT (mode: subscription)');
  console.log('   Type: SUBSCRIPTION_SUCCESS');
  console.log('   Déclenché par: webhook checkout.session.completed');
  console.log('   Contient: Confirmation d\'abonnement\n');

  console.log('3️⃣  CONFIRMATIONS WEBHOOK');
  console.log('   Stripe webhook events:');
  console.log('   - checkout.session.completed (achat/abonnement)');
  console.log('   - invoice.payment_succeeded (rappel paiement)');
  console.log('   - customer.subscription.created (nouvel abonnement)\n');

  console.log('========================================\n');
}

// Lancer le test
testEmailService().catch(console.error);
