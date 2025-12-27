#!/usr/bin/env node
/**
 * Test Email Brevo (Sendinblue)
 * Vérifie la configuration et envoie un email de test
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testBrevoEmail() {
  console.log('\n========================================');
  console.log('📧 TEST EMAIL BREVO');
  console.log('========================================\n');

  // Configuration SMTP (supporte BREVO_* puis fallback SMTP_*)
  const host = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = parseInt(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || '587', 10);
  const user = process.env.BREVO_SMTP_USER || process.env.SMTP_USER || '';
  const pass = process.env.BREVO_SMTP_PASS || process.env.SMTP_PASS || '';

  const brevoConfigPrimary = {
    host,
    port,
    secure: port === 465, // si on force 465 on passe en SSL
    auth: { user, pass }
  };

  // Fallback 465/SSL
  const brevoConfigSsl465 = {
    host,
    port: 465,
    secure: true,
    auth: { user, pass }
  };

  console.log('[1/5] Vérification de la configuration Brevo...\n');
  console.log('Configuration:');
  console.log(`  SMTP_HOST: ${brevoConfigPrimary.host}`);
  console.log(`  SMTP_PORT: ${brevoConfigPrimary.port}`);
  console.log(`  SMTP_USER: ${brevoConfigPrimary.auth.user ? '✓ Configuré' : '✗ Non configuré'}`);
  console.log(`  SMTP_PASS: ${brevoConfigPrimary.auth.pass ? '✓ Configuré' : '✗ Non configuré'}\n`);

  if (!brevoConfigPrimary.auth.user || !brevoConfigPrimary.auth.pass) {
    console.error('❌ ERREUR: Variables Brevo manquantes\n');
    console.log('📋 À configurer dans Render (Environment Variables):');
    console.log('   - BREVO_SMTP_USER: Votre login Brevo SMTP');
    console.log('   - BREVO_SMTP_PASS: Votre clé SMTP Brevo\n');
    console.log('🔗 Pour obtenir vos credentials:');
    console.log('   1. Va sur https://app.brevo.com');
    console.log('   2. Aller à: Settings → SMTP & API');
    console.log('   3. Copier les credentials SMTP\n');
    process.exit(1);
  }

  console.log('[2/5] Création du transporter Nodemailer...');
  let transporter;
  try {
    transporter = nodemailer.createTransport(brevoConfigPrimary);
    console.log(`✅ Transporter créé (port ${brevoConfigPrimary.port}, secure=${brevoConfigPrimary.secure})\n`);
  } catch (e) {
    console.error('❌ Erreur création transporter:', e.message);
    process.exit(1);
  }

  console.log('[3/5] Vérification de la connexion SMTP...');
  let verified = false;
  try {
    await transporter.verify();
    verified = true;
    console.log('✅ Connexion SMTP vérifiée avec succès (config primaire)\n');
  } catch (e) {
    console.error('⚠️ Connexion SMTP échouée sur config primaire:', e.message);
    if (brevoConfigPrimary.port !== 465) {
      console.log('➡️ Tentative fallback 465/SSL...');
      try {
        transporter = nodemailer.createTransport(brevoConfigSsl465);
        await transporter.verify();
        verified = true;
        console.log('✅ Connexion SMTP vérifiée avec succès (fallback 465/SSL)\n');
      } catch (e2) {
        console.error('❌ Erreur de connexion SMTP sur fallback 465:', e2.message);
      }
    }
    if (!verified) {
      console.error('\nVérifiez:');
      console.error('  - Les credentials sont corrects');
      console.error('  - Votre compte Brevo est actif');
      console.error('  - Accès SMTP est activé dans Brevo');
      console.error('  - Essayez de régénérer une clé SMTP');
      process.exit(1);
    }
  }

  console.log('[4/5] Envoi d\'un email de test...');
  try {
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@vhr-dashboard-site.com',
      to: testEmail,
      subject: '🧪 Test Email Brevo - VHR Dashboard',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px; }
    .content { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .info-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 10px 0; }
    .footer { color: #666; font-size: 12px; text-align: center; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧪 Email de Test Brevo</h1>
    </div>
    
    <div class="content">
      <p>Bonjour,</p>
      
      <p>Cet email confirme que votre configuration Brevo fonctionne correctement!</p>
      
      <div class="info-box">
        <strong>✅ Configuration validée</strong><br>
        Le service email Brevo est prêt à envoyer des notifications.
      </div>

      <h2>🎯 Prochaines étapes</h2>
      <ol>
        <li>Activer EMAIL_ENABLED=true dans les variables Render</li>
        <li>Redéployer l'application</li>
        <li>Les emails transactionnels seront envoyés automatiquement</li>
      </ol>

      <div class="info-box">
        <strong>📬 Emails automatiques:</strong><br>
        - Confirmation d'achat<br>
        - Confirmation d'abonnement<br>
        - Notifications de paiement
      </div>
    </div>

    <div class="footer">
      <p>&copy; 2025 VHR Dashboard. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email envoyé avec succès\n');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   À: ${testEmail}\n`);
  } catch (e) {
    console.error('❌ Erreur lors de l\'envoi:', e.message);
    process.exit(1);
  }

  console.log('[5/5] Configuration pour production...\n');

  console.log('========================================');
  console.log('✅ CONFIGURATION BREVO VALIDÉE');
  console.log('========================================\n');

  console.log('📋 À faire dans Render:\n');
  console.log('1. Ajouter Environment Variables:');
  console.log('   - BREVO_SMTP_USER: (login Brevo)');
  console.log('   - BREVO_SMTP_PASS: (clé SMTP Brevo)');
  console.log('   - EMAIL_ENABLED: true');
  console.log('   - EMAIL_FROM: noreply@vhr-dashboard-site.com');
  console.log('   - TEST_EMAIL: votre-email@gmail.com\n');

  console.log('2. Vos credentials Brevo:');
  console.log('   https://app.brevo.com → Settings → SMTP & API\n');

  console.log('3. Redéployer l\'application');
  console.log('   Les emails transactionnels se feront automatiquement\n');

  console.log('========================================\n');
}

// Lancer le test
testBrevoEmail().catch(console.error);
