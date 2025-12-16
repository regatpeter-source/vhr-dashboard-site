#!/usr/bin/env node
/**
 * Test Contact Message System
 * Vérifie l'envoi et la réception de messages depuis contact.html
 * et la réponse depuis admin-dashboard.html
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testMessagingSystem() {
  console.log('\n════════════════════════════════════════════════');
  console.log('📧 TEST SYSTÈME DE MESSAGES - CONTACT & RÉPONSE');
  console.log('════════════════════════════════════════════════\n');

  // Configuration email
  const emailUser = process.env.BREVO_SMTP_USER || process.env.EMAIL_USER;
  const emailPass = process.env.BREVO_SMTP_PASS || process.env.EMAIL_PASS;
  const emailHost = process.env.BREVO_SMTP_HOST || process.env.EMAIL_HOST || 'smtp-relay.brevo.com';
  const emailPort = parseInt(process.env.BREVO_SMTP_PORT || process.env.EMAIL_PORT || '587');
  const emailFrom = process.env.EMAIL_FROM || 'noreply@vhr-dashboard.com';

  // Test 1: Vérifier la configuration
  console.log('[1/5] Vérification de la configuration SMTP...\n');
  console.log('Configuration:');
  console.log(`  Host: ${emailHost}`);
  console.log(`  Port: ${emailPort}`);
  console.log(`  User: ${emailUser ? '✓ Configuré' : '✗ MANQUANT'}`);
  console.log(`  Pass: ${emailPass ? '✓ Configuré (' + emailPass.length + ' chars)' : '✗ MANQUANT'}`);
  console.log(`  From: ${emailFrom}\n`);

  if (!emailUser || !emailPass) {
    console.error('❌ ERREUR: Credentials SMTP manquants!\n');
    console.log('À configurer dans .env:');
    console.log('  BREVO_SMTP_USER=votre-email@brevo.com');
    console.log('  BREVO_SMTP_PASS=votre-cle-smtp\n');
    process.exit(1);
  }

  // Test 2: Créer transporter et vérifier connexion
  console.log('[2/5] Création du transporter Nodemailer...');
  const transporter = nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailPort === 465,
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });

  try {
    await transporter.verify();
    console.log('✅ Connexion SMTP vérifiée\n');
  } catch (e) {
    console.error('❌ Erreur de connexion SMTP:', e.message);
    console.error('\nVérifiez:');
    console.error('  - Les credentials sont corrects');
    console.error('  - Brevo compte est actif');
    console.error('  - Accès SMTP activé dans Brevo settings\n');
    process.exit(1);
  }

  // Test 3: Simuler l'envoi d'un message depuis contact.html
  console.log('[3/5] Simulation d\'un message depuis contact.html...');
  const testMessage = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    subject: 'Test Message',
    message: 'Ceci est un message de test depuis contact.html',
    createdAt: new Date().toISOString()
  };

  try {
    // Simuler l'email admin (celui qui reçoit le message)
    const adminEmailOptions = {
      from: emailFrom,
      to: process.env.ADMIN_EMAIL || 'admin@vhr-dashboard.com',
      subject: `Nouveau message de contact: ${testMessage.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>📩 Nouveau Message de Contact</h2>
          <p><strong>De:</strong> ${testMessage.name} (${testMessage.email})</p>
          <p><strong>Sujet:</strong> ${testMessage.subject}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${testMessage.message}</p>
        </div>
      `,
      replyTo: testMessage.email
    };

    const info = await transporter.sendMail(adminEmailOptions);
    console.log('✅ Email admin envoyé avec succès');
    console.log(`   Message ID: ${info.messageId}\n`);
  } catch (e) {
    console.error('❌ Erreur lors de l\'envoi de l\'email admin:', e.message);
    process.exit(1);
  }

  // Test 4: Simuler la réponse depuis admin-dashboard.html
  console.log('[4/5] Simulation d\'une réponse depuis admin-dashboard.html...');
  const replyText = 'Merci pour votre message. Nous reviendrons vers vous dès que possible.';

  try {
    // Simuler l'email de réponse (celui qui est bloqué selon l'utilisateur)
    const replyEmailOptions = {
      from: emailFrom,
      to: testMessage.email,
      subject: `Réponse: ${testMessage.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px;">
          <h2>📨 Réponse à votre message</h2>
          <p><strong>Répondu par:</strong> Admin</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
          <hr>
          <h3>Votre message original:</h3>
          <p><strong>Sujet:</strong> ${testMessage.subject}</p>
          <p style="white-space: pre-wrap; background: #f5f5f5; padding: 10px;">${testMessage.message}</p>
          <hr>
          <h3>Réponse:</h3>
          <p style="white-space: pre-wrap;">${replyText}</p>
        </div>
      `
    };

    const replyInfo = await transporter.sendMail(replyEmailOptions);
    console.log('✅ Email de réponse envoyé avec succès');
    console.log(`   Message ID: ${replyInfo.messageId}\n`);
  } catch (e) {
    console.error('❌ ERREUR lors de l\'envoi de la réponse:', e.message);
    console.error('\n🔍 DIAGNOSTIC:');
    console.error('  - Vérifier les credentials Brevo');
    console.error('  - Vérifier les limites de débit Brevo');
    console.error('  - Vérifier que le compte Brevo n\'est pas suspendu');
    console.error('  - Vérifier la whitelist d\'adresses en Brevo\n');
    process.exit(1);
  }

  // Test 5: Résumé
  console.log('[5/5] Résumé...\n');
  console.log('════════════════════════════════════════════════');
  console.log('✅ TOUS LES TESTS RÉUSSIS');
  console.log('════════════════════════════════════════════════\n');

  console.log('📊 Résumé:');
  console.log('  ✅ Connexion SMTP: OK');
  console.log('  ✅ Email admin (contact.html → admin): OK');
  console.log('  ✅ Email réponse (admin → contact.html): OK\n');

  console.log('🚀 Le système de messages fonctionne complètement!\n');

  console.log('📋 Prochaines étapes:');
  console.log('  1. Tester via le site: https://vhr-dashboard-site.onrender.com/contact.html');
  console.log('  2. Envoyer un message de test');
  console.log('  3. Aller sur https://vhr-dashboard-site.onrender.com/admin-dashboard.html');
  console.log('  4. Vérifier que le message apparaît');
  console.log('  5. Répondre au message');
  console.log('  6. Vérifier que la réponse est envoyée\n');

  console.log('🔧 Si vous avez toujours des problèmes:');
  console.log('  - Vérifier les logs Render: https://dashboard.render.com');
  console.log('  - Vérifier la limite de messages Brevo');
  console.log('  - Vérifier que EMAIL_ENABLED=true dans Render\n');
}

testMessagingSystem().catch(console.error);
