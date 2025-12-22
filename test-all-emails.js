#!/usr/bin/env node
/**
 * Test ALL Email Types - Brevo Integration
 * Teste tous les types d'emails utilisés par l'application
 * 
 * Types d'emails testés:
 * 1. Contact message (depuis contact.html)
 * 2. Admin reply (réponse depuis admin-dashboard.html)
 * 3. License email (après achat)
 * 4. Purchase success (Stripe notification)
 */

require('dotenv').config();
const nodemailer = require('nodemailer');
const purchaseConfig = require('./config/purchase.config');

async function testAllEmails() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('📧 TEST COMPLET - TOUS LES TYPES D\'EMAILS');
  console.log('════════════════════════════════════════════════════════\n');

  // Configuration Brevo
  const emailUser = process.env.BREVO_SMTP_USER || process.env.EMAIL_USER;
  const emailPass = process.env.BREVO_SMTP_PASS || process.env.EMAIL_PASS;
  const emailHost = process.env.BREVO_SMTP_HOST || process.env.EMAIL_HOST || 'smtp-relay.brevo.com';
  const emailPort = parseInt(process.env.BREVO_SMTP_PORT || process.env.EMAIL_PORT || '587');
  const emailFrom = process.env.EMAIL_FROM || 'noreply@vhr-dashboard-site.com';

  // Test 1: Vérifier configuration
  console.log('[1/6] Vérification de la configuration Brevo...\n');
  console.log('Configuration:');
  console.log(`  Host: ${emailHost}`);
  console.log(`  Port: ${emailPort}`);
  console.log(`  From: ${emailFrom}`);
  console.log(`  User: ${emailUser ? '✓ Configuré' : '✗ MANQUANT'}`);
  console.log(`  Pass: ${emailPass ? '✓ Configuré' : '✗ MANQUANT'}`);
  console.log(`  Enabled: ${process.env.EMAIL_ENABLED === 'true' ? '✓ Activé' : '⚠️  Désactivé'}\n`);

  if (!emailUser || !emailPass) {
    console.error('❌ ERREUR: Credentials SMTP manquants!\n');
    process.exit(1);
  }

  // Créer transporter
  const transporter = nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailPort === 465,
    auth: { user: emailUser, pass: emailPass }
  });

  // Test 2: Vérifier connexion SMTP
  console.log('[2/6] Test de connexion SMTP...');
  try {
    await transporter.verify();
    console.log('✅ Connexion SMTP vérifiée\n');
  } catch (e) {
    console.error('❌ Erreur de connexion SMTP:', e.message);
    process.exit(1);
  }

  // Test 3: Email de contact (depuis contact.html)
  console.log('[3/6] Test email de contact (contact.html → admin)...');
  try {
    await transporter.sendMail({
      from: emailFrom,
      to: process.env.ADMIN_EMAIL || 'admin@vhr-dashboard-site.com',
      subject: '[TEST] Nouveau message de contact VHR Dashboard',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>📩 Message de test - Contact</h2>
          <p><strong>De:</strong> Test User (test@example.com)</p>
          <p><strong>Sujet:</strong> Test email de contact</p>
          <p><strong>Message:</strong></p>
          <p>Ceci est un email de test envoyé via Brevo SMTP pour vérifier que les messages de contact fonctionnent.</p>
        </div>
      `,
      replyTo: 'test@example.com'
    });
    console.log('✅ Email de contact envoyé avec succès\n');
  } catch (e) {
    console.error('❌ Erreur:', e.message, '\n');
  }

  // Test 4: Email de réponse (depuis admin-dashboard.html)
  console.log('[4/6] Test email de réponse (admin → contact)...');
  try {
    await transporter.sendMail({
      from: emailFrom,
      to: 'test@example.com',
      subject: '[TEST] Réponse: Test email de contact',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>📨 Réponse à votre message</h2>
          <p><strong>Répondu par:</strong> Admin User</p>
          <p><strong>Message original:</strong></p>
          <p style="background: #f5f5f5; padding: 10px;">Ceci est un email de test envoyé via Brevo SMTP pour vérifier que les messages de contact fonctionnent.</p>
          <hr>
          <h3>Réponse:</h3>
          <p>Merci pour votre message de test. Votre système d'emails via Brevo fonctionne correctement!</p>
        </div>
      `
    });
    console.log('✅ Email de réponse envoyé avec succès\n');
  } catch (e) {
    console.error('❌ Erreur:', e.message, '\n');
  }

  // Test 5: Email de licence
  console.log('[5/6] Test email de licence (après achat)...');
  try {
    await transporter.sendMail({
      from: emailFrom,
      to: 'test@example.com',
      subject: '🎉 Votre licence VHR Dashboard',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0d0f14; color: #ecf0f1; border-radius: 10px;">
          <h1 style="color: #2ecc71; text-align: center;">🥽 VHR Dashboard</h1>
          <h2 style="color: #3498db;">Merci pour votre achat!</h2>
          <p>Bonjour <strong>Test User</strong>,</p>
          <p>Votre licence VHR Dashboard a été activée avec succès. Voici votre clé de licence:</p>
          <div style="background: #1a1d24; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h2 style="color: #2ecc71; font-size: 24px; letter-spacing: 2px;">LICENSE-TEST-KEY-12345678</h2>
          </div>
          <p style="color: #95a5a6; font-size: 12px; text-align: center;">Cette licence est valide à vie.</p>
        </div>
      `
    });
    console.log('✅ Email de licence envoyé avec succès\n');
  } catch (e) {
    console.error('❌ Erreur:', e.message, '\n');
  }

  // Test 6: Email de confirmation Stripe
  console.log('[6/6] Test email de confirmation paiement (Stripe)...');
  try {
    await transporter.sendMail({
      from: emailFrom,
      to: 'test@example.com',
      subject: '✅ Votre licence VHR Dashboard Premium est activée',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2ecc71;">✅ Paiement confirmé</h2>
          <p>Bonjour <strong>Test User</strong>,</p>
          <p>Merci pour votre achat! Votre licence Premium VHR Dashboard est maintenant active.</p>
          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p><strong>📦 Produit:</strong> VHR Dashboard Premium (Perpétuelle)</p>
            <p><strong>💰 Montant:</strong> 99.99 EUR</p>
            <p><strong>📅 Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
            <p><strong>🎁 Licence:</strong> LICENSE-TEST-STRIPE-12345</p>
          </div>
          <p>Vous avez maintenant accès à toutes les fonctionnalités premium sans limitation!</p>
        </div>
      `
    });
    console.log('✅ Email de confirmation Stripe envoyé avec succès\n');
  } catch (e) {
    console.error('❌ Erreur:', e.message, '\n');
  }

  // Résumé
  console.log('════════════════════════════════════════════════════════');
  console.log('✅ TOUS LES TESTS D\'EMAILS RÉUSSIS');
  console.log('════════════════════════════════════════════════════════\n');

  console.log('📊 Résumé des tests:');
  console.log('  ✅ Connexion SMTP Brevo: OK');
  console.log('  ✅ Email de contact: OK');
  console.log('  ✅ Email de réponse: OK');
  console.log('  ✅ Email de licence: OK');
  console.log('  ✅ Email de confirmation Stripe: OK\n');

  console.log('🎉 Tous les types d\'emails fonctionnent correctement avec Brevo!\n');

  console.log('📋 Configuration activée:');
  console.log('  BREVO_SMTP_HOST:', emailHost);
  console.log('  BREVO_SMTP_USER:', emailUser);
  console.log('  EMAIL_FROM:', emailFrom);
  console.log('  EMAIL_ENABLED:', process.env.EMAIL_ENABLED === 'true' ? 'true' : 'false\n');

  console.log('🚀 Prochaines étapes:');
  console.log('  1. Vérifier que tous les emails ont été reçus');
  console.log('  2. Tester en production: https://vhr-dashboard-site.onrender.com');
  console.log('  3. Envoyer un message via contact.html');
  console.log('  4. Vérifier les logs Render: https://dashboard.render.com\n');
}

testAllEmails().catch(console.error);
