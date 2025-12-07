/**
 * Service d'envoi d'emails
 * Gère l'envoi des emails de confirmation de paiement et notifications
 */

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.warn('[email] nodemailer not installed: email service disabled');
  nodemailer = null;
}

const purchaseConfig = require('../config/purchase.config');

// Créer le transporteur de mail
let transporter = null;

function initEmailTransporter() {
  if (!nodemailer) {
    console.warn('[email] Email service disabled: nodemailer not installed');
    return null;
  }

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
    const template = purchaseConfig.EMAIL_TEMPLATES.PURCHASE_SUCCESS || purchaseConfig.EMAIL_TEMPLATES.PURCHASE_CONFIRMATION;
    
    const licenseKey = purchaseData.licenseKey || generateLicenseKey();
    const downloadLink = purchaseData.downloadLink || `${purchaseConfig.EMAIL.DOWNLOAD_URL}?license=${licenseKey}&user=${encodeURIComponent(user.username)}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; padding: 0; background: #fff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px 20px; }
    .license-box { background: #f8f9fa; border-left: 4px solid #2ecc71; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .license-key { background: #000; color: #2ecc71; font-family: monospace; font-size: 18px; letter-spacing: 2px; padding: 15px; border-radius: 4px; text-align: center; word-break: break-all; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .info-item { background: #f8f9fa; padding: 15px; border-radius: 6px; }
    .info-label { color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
    .info-value { font-weight: bold; font-size: 16px; color: #2ecc71; }
    .button { display: inline-block; background: #2ecc71; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; font-weight: bold; }
    .button-secondary { background: #3498db; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e0e0e0; }
    .steps-list { list-style: none; padding: 0; margin: 20px 0; }
    .steps-list li { padding: 12px 0; border-bottom: 1px solid #e0e0e0; }
    .steps-list li:before { content: "✓ "; color: #2ecc71; font-weight: bold; margin-right: 10px; }
    .steps-list li:last-child { border-bottom: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 ${template.title || 'Achat Confirmé'}</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Votre licence VHR Dashboard est prête</p>
    </div>
    
    <div class="content">
      <p>Bonjour <strong>${user.username || user.email}</strong>,</p>
      
      <p>Merci pour votre achat ! Votre licence VHR Dashboard a été activée avec succès et est prête à l'emploi immédiatement.</p>
      
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Produit</div>
          <div class="info-value">${purchaseData.planName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Montant</div>
          <div class="info-value">${purchaseData.price}€ TTC</div>
        </div>
        <div class="info-item">
          <div class="info-label">Numéro de commande</div>
          <div class="info-value" style="font-size: 12px;">${purchaseData.orderId}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Accès</div>
          <div class="info-value">${purchaseData.licenseDuration}</div>
        </div>
      </div>
      
      <h2 style="color: #2ecc71; margin-top: 30px;">🔑 Votre Clé de Licence</h2>
      
      <div class="license-box">
        <p style="margin-top: 0; color: #666;">Conservez cette clé précieusement. Elle vous permettra d'accéder à VHR Dashboard sans limite.</p>
        <div class="license-key">${licenseKey}</div>
        <p style="margin-bottom: 0; color: #666; font-size: 12px; text-align: center; margin-top: 10px;">Durée: ${purchaseData.licenseDuration}</p>
      </div>
      
      <h2 style="color: #2ecc71; margin-top: 30px;">📋 Prochaines Étapes</h2>
      <ol class="steps-list" style="list-style: decimal; margin-left: 20px;">
        <li>Ouvrez <a href="http://localhost:3000/vhr-dashboard-pro.html" style="color: #3498db;">votre Dashboard</a></li>
        <li>Cliquez sur le bouton <strong>"🚀 Débloquer"</strong></li>
        <li>Sélectionnez <strong>"🔑 Vous avez déjà une licence"</strong></li>
        <li>Collez votre clé de licence</li>
        <li>Profitez de toutes les fonctionnalités sans limitation ! 🎉</li>
      </ol>
      
      <h2 style="color: #2ecc71; margin-top: 30px;">✨ Ce qui est inclus</h2>
      <ul style="color: #666;">
        <li>✅ Accès perpétuel (jamais expirer)</li>
        <li>✅ Gestion de casques VR illimitée</li>
        <li>✅ Streaming vidéo sans limite</li>
        <li>✅ Mises à jour incluses à vie</li>
        <li>✅ Support utilisateur prioritaire</li>
      </ul>
      
      <div style="background: #e8f8f5; border-left: 4px solid #2ecc71; padding: 15px; border-radius: 4px; margin-top: 20px;">
        <p style="margin: 0; color: #27ae60;"><strong>💡 Conseil:</strong> Téléchargez et conservez cette email pour référence future. Votre clé de licence ne vous sera pas demandée dans les prochains emails.</p>
      </div>
    </div>
    
    <div class="footer">
      <p>Questions ou problème d'accès ?</p>
      <p><a href="mailto:${purchaseConfig.EMAIL.SUPPORT_EMAIL}" style="color: #3498db;">Contactez le support</a> | <a href="${purchaseConfig.EMAIL.DOCUMENTATION_URL}" style="color: #3498db;">Documentation</a></p>
      <p>&copy; 2025 VHR Dashboard. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: purchaseConfig.EMAIL.FROM,
      to: user.email,
      subject: template.subject || '✅ Votre licence VHR Dashboard est activée',
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
    const template = purchaseConfig.EMAIL_TEMPLATES.SUBSCRIPTION_SUCCESS || purchaseConfig.EMAIL_TEMPLATES.SUBSCRIPTION_CONFIRMATION;
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; padding: 0; background: #fff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .info-item { background: #f8f9fa; padding: 15px; border-radius: 6px; }
    .info-label { color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
    .info-value { font-weight: bold; font-size: 16px; color: #3498db; }
    .button { display: inline-block; background: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; font-weight: bold; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e0e0e0; }
    .features-list { list-style: none; padding: 0; margin: 20px 0; }
    .features-list li { padding: 12px 0; border-bottom: 1px solid #e0e0e0; }
    .features-list li:before { content: "✓ "; color: #3498db; font-weight: bold; margin-right: 10px; }
    .features-list li:last-child { border-bottom: none; }
    .alert { background: #e8f4f8; border-left: 4px solid #3498db; padding: 15px; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ ${template.title || 'Abonnement Confirmé'}</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Bienvenue dans VHR Dashboard Premium</p>
    </div>
    
    <div class="content">
      <p>Bonjour <strong>${subscriptionData.userName || user.username || user.email}</strong>,</p>
      
      <p>Merci pour votre confiance ! Votre abonnement VHR Dashboard a été configuré avec succès. Vous avez maintenant accès à toutes les fonctionnalités premium.</p>
      
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Plan</div>
          <div class="info-value">${subscriptionData.planName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Tarif</div>
          <div class="info-value">${subscriptionData.price}€/${subscriptionData.billingPeriod}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Facturation</div>
          <div class="info-value">Mensuelle</div>
        </div>
        <div class="info-item">
          <div class="info-label">Statut</div>
          <div class="info-value" style="color: #27ae60;">✓ Actif</div>
        </div>
      </div>
      
      <h2 style="color: #3498db; margin-top: 30px;">🚀 Accès Instantané</h2>
      <p>Votre accès est activé immédiatement. Vous pouvez commencer à utiliser VHR Dashboard maintenant :</p>
      <a href="http://localhost:3000/vhr-dashboard-pro.html" class="button">Ouvrir mon Dashboard</a>
      
      <h2 style="color: #3498db; margin-top: 30px;">✨ Avantages de votre abonnement</h2>
      <ul class="features-list">
        <li>Accès complet à toutes les fonctionnalités</li>
        <li>Gestion de casques VR illimitée</li>
        <li>Streaming vidéo sans limite</li>
        <li>Mises à jour automatiques incluses</li>
        <li>Support utilisateur prioritaire</li>
        <li>Synchronisation cloud sécurisée</li>
      </ul>
      
      <h2 style="color: #3498db; margin-top: 30px;">⚙️ Gérer votre Abonnement</h2>
      <p>Vous pouvez gérer votre abonnement à tout moment :</p>
      <ul style="color: #666;">
        <li><a href="http://localhost:3000/account.html" style="color: #3498db;">Voir vos factures</a></li>
        <li><a href="http://localhost:3000/account.html" style="color: #3498db;">Mettre à jour le paiement</a></li>
        <li><a href="http://localhost:3000/account.html" style="color: #3498db;">Annuler l'abonnement (à tout moment)</a></li>
      </ul>
      
      <div class="alert">
        <strong>💡 Renouvellement Automatique</strong>
        <p style="margin: 8px 0 0 0;">Votre abonnement se renouvelle automatiquement le même jour chaque mois pour 29€ TTC. Vous pouvez l'annuler à tout moment.</p>
      </div>
      
      <h2 style="color: #3498db; margin-top: 30px;">❓ Questions ?</h2>
      <p>Besoin d'aide ? Notre équipe support est prête à vous aider :</p>
      <p style="text-align: center;">
        <a href="mailto:${purchaseConfig.EMAIL.SUPPORT_EMAIL}" style="color: #3498db; font-weight: bold;">${purchaseConfig.EMAIL.SUPPORT_EMAIL}</a>
      </p>
    </div>
    
    <div class="footer">
      <p>Merci d'avoir choisi VHR Dashboard !</p>
      <p><a href="http://localhost:3000/account.html" style="color: #3498db;">Mon Compte</a> | <a href="${purchaseConfig.EMAIL.DOCUMENTATION_URL}" style="color: #3498db;">Documentation</a></p>
      <p>&copy; 2025 VHR Dashboard. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: purchaseConfig.EMAIL.FROM,
      to: user.email,
      subject: template.subject || '✅ Votre abonnement VHR Dashboard est actif',
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
