/**
 * Service d'envoi d'emails
 * Gère l'envoi des emails de confirmation de paiement et notifications
 */

const nodemailer = require('nodemailer');
const purchaseConfig = require('../config/purchase.config');

// Créer le transporteur de mail
let transporter = null;

function initEmailTransporter() {
  if (!purchaseConfig.EMAIL.ENABLED) {
    console.log('[email] Email service disabled (EMAIL_ENABLED=false)');
    return null;
  }

  if (!purchaseConfig.EMAIL.SMTP_USER || !purchaseConfig.EMAIL.SMTP_PASS) {
    console.warn('[email] Email service disabled: SMTP credentials not configured');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: purchaseConfig.EMAIL.SMTP_HOST,
    port: purchaseConfig.EMAIL.SMTP_PORT,
    secure: purchaseConfig.EMAIL.SMTP_PORT === 465,
    auth: {
      user: purchaseConfig.EMAIL.SMTP_USER,
      pass: purchaseConfig.EMAIL.SMTP_PASS
    }
  });

  console.log('[email] Email transporter initialized');
  return transporter;
}

/**
 * Envoyer un email de confirmation de paiement avec lien de téléchargement
 */
async function sendPurchaseSuccessEmail(user, purchaseData) {
  if (!transporter && purchaseConfig.EMAIL.ENABLED) {
    initEmailTransporter();
  }

  if (!transporter) {
    console.warn('[email] Cannot send email: transporter not available');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const template = purchaseConfig.EMAIL_TEMPLATES.PURCHASE_SUCCESS;
    
    const licenseKey = generateLicenseKey();
    const downloadLink = `${purchaseConfig.EMAIL.DOWNLOAD_URL}?license=${licenseKey}&user=${encodeURIComponent(user.username)}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px; }
    .content { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    .footer { color: #666; font-size: 12px; text-align: center; margin-top: 20px; }
    .info-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 ${template.title}</h1>
    </div>
    
    <div class="content">
      <p>${template.greeting}</p>
      
      <p>Votre achat a été confirmé avec succès! Votre accès VHR Dashboard est maintenant activé.</p>
      
      <div class="info-box">
        <strong>Plan acheté:</strong> ${purchaseData.planName}<br>
        <strong>Numéro de commande:</strong> ${purchaseData.orderId}<br>
        <strong>Prix:</strong> ${purchaseData.price}€
      </div>

      <h2>📥 Télécharger VHR Dashboard</h2>
      <p>Cliquez sur le bouton ci-dessous pour télécharger votre dashboard:</p>
      <a href="${downloadLink}" class="button">Télécharger VHR Dashboard</a>

      <h2>🔑 Informations d'accès</h2>
      <div class="info-box">
        <strong>Utilisateur:</strong> ${user.username}<br>
        <strong>Clé de licence:</strong> <code>${licenseKey}</code><br>
        <strong>Durée:</strong> ${purchaseData.licenseDuration}<br>
        <strong>Mises à jour incluses jusqu'au:</strong> ${purchaseData.updatesUntil}
      </div>

      <h2>📋 Prochaines étapes</h2>
      <ol>
        <li>Téléchargez le fichier ZIP</li>
        <li>Extrayez-le sur votre serveur</li>
        <li>Consultez la documentation d'installation: <a href="${purchaseConfig.EMAIL.DOCUMENTATION_URL}">${purchaseConfig.EMAIL.DOCUMENTATION_URL}</a></li>
        <li>Contactez le support si vous avez besoin d'aide</li>
      </ol>

      <p>Bienvenue dans VHR Dashboard!</p>
    </div>

    <div class="footer">
      <p>Questions? Contactez-nous: <a href="mailto:${purchaseConfig.EMAIL.SUPPORT_EMAIL}">${purchaseConfig.EMAIL.SUPPORT_EMAIL}</a></p>
      <p>&copy; 2025 VHR Dashboard. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: purchaseConfig.EMAIL.FROM,
      to: user.email,
      subject: template.subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[email] Purchase success email sent:', { to: user.email, messageId: info.messageId });
    
    return { 
      success: true, 
      messageId: info.messageId,
      licenseKey: licenseKey
    };
  } catch (e) {
    console.error('[email] Failed to send purchase success email:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Envoyer un email de confirmation d'abonnement
 */
async function sendSubscriptionSuccessEmail(user, subscriptionData) {
  if (!transporter && purchaseConfig.EMAIL.ENABLED) {
    initEmailTransporter();
  }

  if (!transporter) {
    console.warn('[email] Cannot send email: transporter not available');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const template = purchaseConfig.EMAIL_TEMPLATES.SUBSCRIPTION_SUCCESS;
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px; }
    .content { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    .footer { color: #666; font-size: 12px; text-align: center; margin-top: 20px; }
    .info-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ ${template.title}</h1>
    </div>
    
    <div class="content">
      <p>${template.greeting}</p>
      
      <p>Votre abonnement VHR Dashboard a été configuré avec succès!</p>
      
      <div class="info-box">
        <strong>Plan:</strong> ${subscriptionData.planName}<br>
        <strong>Période de facturation:</strong> ${subscriptionData.billingPeriod}<br>
        <strong>Prix:</strong> ${subscriptionData.price}€/${subscriptionData.billingPeriod}<br>
        <strong>Numéro d'abonnement:</strong> ${subscriptionData.subscriptionId}
      </div>

      <h2>🚀 Accès instantané</h2>
      <p>Votre accès est activé immédiatement. Accédez à votre dashboard:</p>
      <a href="http://localhost:3000" class="button">Accéder à mon Dashboard</a>

      <h2>⚙️ Gérer votre abonnement</h2>
      <p>
        • <a href="http://localhost:3000/account.html">Voir vos factures</a><br>
        • <a href="http://localhost:3000/account.html">Mettre à jour le paiement</a><br>
        • <a href="http://localhost:3000/account.html">Annuler l'abonnement</a>
      </p>

      <p>Merci d'avoir choisi VHR Dashboard!</p>
    </div>

    <div class="footer">
      <p>Support: <a href="mailto:${purchaseConfig.EMAIL.SUPPORT_EMAIL}">${purchaseConfig.EMAIL.SUPPORT_EMAIL}</a></p>
      <p>&copy; 2025 VHR Dashboard. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: purchaseConfig.EMAIL.FROM,
      to: user.email,
      subject: template.subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[email] Subscription success email sent:', { to: user.email, messageId: info.messageId });
    
    return { success: true, messageId: info.messageId };
  } catch (e) {
    console.error('[email] Failed to send subscription success email:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Générer une clé de licence unique
 */
function generateLicenseKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Formater comme XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
  return key.substring(0, 4) + '-' + 
         key.substring(4, 8) + '-' + 
         key.substring(8, 12) + '-' + 
         key.substring(12, 16) + '-' + 
         key.substring(16, 20) + '-' + 
         key.substring(20, 24);
}

module.exports = {
  initEmailTransporter,
  sendPurchaseSuccessEmail,
  sendSubscriptionSuccessEmail,
  generateLicenseKey
};
