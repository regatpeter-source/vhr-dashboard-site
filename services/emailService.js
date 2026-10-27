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

const sanitizeBaseUrl = (url) => {
  if (!url) return '';
  return url.replace(/\/$/, '');
};

function resolvePublicBaseUrl() {
  const candidate = sanitizeBaseUrl(
    process.env.PUBLIC_BASE_URL ||
    process.env.FRONTEND_URL ||
    process.env.LAN_BASE_URL ||
    (purchaseConfig.EMAIL && purchaseConfig.EMAIL.PUBLIC_BASE_URL)
  );

  if (candidate) return candidate;

  // Filet de sécurité : domaine public par défaut pour éviter les IP LAN
  return 'https://www.vhr-dashboard-site.com';
}

const BASE_URL = resolvePublicBaseUrl();
const DASHBOARD_PRO_URL = `${BASE_URL}/vhr-dashboard-pro.html`;
const ACCOUNT_URL = `${BASE_URL}/account.html`;

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
 * Envoyer un email de confirmation de paiement avec licence perpétuelle
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
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e0e0e0; }
    .steps-list { list-style: decimal; margin-left: 20px; padding: 0; }
    .steps-list li { padding: 8px 0; color: #333; }
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
      
      <h2 style="color: #2ecc71; margin-top: 30px;">👤 Vos Identifiants</h2>
      
      <div class="license-box" style="border-left-color: #3498db;">
        <p style="margin-top: 0; color: #666;">Utilisez ces identifiants pour accéder à VHR Dashboard partout:</p>
        <div style="background: #f0f0f0; padding: 12px; border-radius: 4px; margin-bottom: 10px;">
          <p style="margin: 5px 0;"><strong>Nom d'utilisateur:</strong> <code style="background: #fff; padding: 3px 6px; border-radius: 3px; font-family: monospace;">${user.username}</code></p>
          <p style="margin: 5px 0;"><strong>Email:</strong> <code style="background: #fff; padding: 3px 6px; border-radius: 3px; font-family: monospace;">${user.email}</code></p>
        </div>
        <p style="margin-bottom: 0; color: #666; font-size: 12px;"><em>💡 Vous recevrez votre mot de passe dans un email séparé pour des raisons de sécurité.</em></p>
      </div>
      
      <h2 style="color: #2ecc71; margin-top: 30px;">🔑 Votre Clé de Licence</h2>
      
      <div class="license-box">
        <p style="margin-top: 0; color: #666;">Conservez cette clé précieusement. Elle vous permettra d'accéder à VHR Dashboard en permanence.</p>
        <div class="license-key">${licenseKey}</div>
        <p style="margin-bottom: 0; color: #666; font-size: 12px; text-align: center; margin-top: 10px;">Durée: ${purchaseData.licenseDuration}</p>
      </div>

      <h2 style="color: #2ecc71; margin-top: 30px;">📦 Installer VHR Dashboard</h2>
      <p>Utilisez l'installateur Windows <strong>VHR.Dashboard.Setup.1.0.4.exe</strong> pour lancer la plateforme sur votre poste.</p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${downloadLink}" class="button">Télécharger l'installateur VHR.Dashboard.Setup.1.0.4.exe</a>
      </div>
      <ul style="padding-left: 18px; color: #333; line-height: 1.6;">
        <li>Téléchargez le fichier, lancez-le et validez les avertissements SmartScreen (Informations complémentaires → Exécuter quand même).</li>
        <li>Suivez l’assistant (Next → Install → Finish) : un raccourci « VHR Dashboard Pro » est créé sur le bureau et dans le menu Démarrer.</li>
        <li>Ouvrez ce raccourci ou rendez-vous sur <code>http://localhost:3000</code> pour vous connecter avec vos identifiants ci-dessus.</li>
      </ul>
      
      <h2 style="color: #2ecc71; margin-top: 30px;">📋 Prochaines Étapes</h2>
      <ol class="steps-list">
        <li>Ouvrez <a href="${DASHBOARD_PRO_URL}" style="color: #3498db;">votre Dashboard</a></li>
        <li>Cliquez sur le bouton <strong>"🚀 Débloquer"</strong></li>
        <li>Sélectionnez <strong>"🔑 Vous avez déjà une licence"</strong></li>
        <li>Collez votre clé de licence</li>
        <li>Profitez de toutes les fonctionnalités sans limitation ! 🎉</li>
      </ol>
      
      <h2 style="color: #2ecc71; margin-top: 30px;">✨ Ce qui est inclus</h2>
      <ul style="color: #666;">
        <li>✅ Accès perpétuel (jamais expirer)</li>
        <li>✅ Gestion de casques VR illimitée</li>
        <li>✅ Streaming vidéo illimitée</li>
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
      from: purchaseConfig.EMAIL.FROM_CONTACT || purchaseConfig.EMAIL.FROM,
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
    const amount = Number(subscriptionData.price);
    const count = subscriptionData.intervalCount || 1;
    if (!Number.isFinite(amount) || amount < 0 || !['month', 'year'].includes(subscriptionData.billingPeriod)
      || !Number.isInteger(count) || count < 1) {
      throw new Error('Montant ou période de facturation invalide pour la confirmation');
    }
    const amountLabel = amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const yearly = subscriptionData.billingPeriod === 'year';
    const periodLabel = count === 1 ? (yearly ? 'an' : 'mois') : `${count} ${yearly ? 'ans' : 'mois'}`;
    const billingLabel = count === 1 ? (yearly ? 'Annuelle' : 'Mensuelle') : `Tous les ${periodLabel}`;
    const template = (purchaseConfig.EMAIL_TEMPLATES && purchaseConfig.EMAIL_TEMPLATES.SUBSCRIPTION_SUCCESS) || 
                     (purchaseConfig.EMAIL_TEMPLATES && purchaseConfig.EMAIL_TEMPLATES.SUBSCRIPTION_CONFIRMATION) || 
                     { title: 'Abonnement Confirmé', subject: '✅ Votre abonnement VHR Dashboard est actif' };
    
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
    .features-list li:before { content: "✓ "; color: #3498db; font-weight: bold; margin-right: 10px; }
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
          <div class="info-value">${amountLabel} € TTC / ${periodLabel}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Facturation</div>
          <div class="info-value">${billingLabel}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Statut</div>
          <div class="info-value" style="color: #27ae60;">✓ Actif</div>
        </div>
      </div>
      
      <h2 style="color: #3498db; margin-top: 30px;">👤 Vos Identifiants</h2>
      
      <div style="background: #f8f9fa; border-left: 4px solid #3498db; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin-top: 0; color: #666;">Utilisez ces identifiants pour vous connecter:</p>
        <div style="background: #f0f0f0; padding: 12px; border-radius: 4px;">
          <p style="margin: 5px 0;"><strong>Nom d'utilisateur:</strong> <code style="background: #fff; padding: 3px 6px; border-radius: 3px; font-family: monospace;">${user.username}</code></p>
          <p style="margin: 5px 0;"><strong>Email:</strong> <code style="background: #fff; padding: 3px 6px; border-radius: 3px; font-family: monospace;">${user.email}</code></p>
        </div>
      </div>
      
      <h2 style="color: #3498db; margin-top: 30px;">🚀 Accès Instantané</h2>
      <p>Votre accès est activé. Voici comment lancer le Dashboard Pro (installateur Windows 64 bits) :</p>
      <ol style="padding-left: 18px; color: #333; line-height: 1.5;">
        <li>Téléchargez l’installateur <strong>VHR.Dashboard.Setup.1.0.4.exe</strong> depuis votre espace client (ou le lien direct fourni après achat).</li>
        <li>Lancez le fichier <code>VHR.Dashboard.Setup.1.0.4.exe</code> puis suivez l’assistant (Next → Install → Finish). Un raccourci “VHR Dashboard” est créé sur le Bureau/Start.</li>
        <li>Ouvrez “VHR Dashboard Pro”. Le serveur embarqué démarre et ouvre automatiquement le Dashboard (http://localhost:3000). Si ce n’est pas le cas, ouvrez manuellement cette URL.</li>
        <li>Connectez-vous avec vos identifiants ci-dessus.</li>
      </ol>
      
      <h2 style="color: #3498db; margin-top: 30px;">✨ Avantages de votre abonnement</h2>
      <ul class="features-list">
        <li>Accès complet à toutes les fonctionnalités</li>
        <li>Gestion de casques VR illimitée</li>
        <li>Streaming vidéo illimitée</li>
        <li>Mises à jour automatiques incluses</li>
        <li>Support utilisateur prioritaire</li>
        <li>Synchronisation cloud sécurisée</li>
      </ul>
      
      <h2 style="color: #3498db; margin-top: 30px;">⚙️ Gérer votre Abonnement</h2>
      <p>Vous pouvez gérer votre abonnement à tout moment :</p>
      <ul style="color: #666;">
        <li><a href="${ACCOUNT_URL}" style="color: #3498db;">Voir vos factures</a></li>
        <li><a href="${ACCOUNT_URL}" style="color: #3498db;">Mettre à jour le paiement</a></li>
        <li><a href="${ACCOUNT_URL}" style="color: #3498db;">Annuler l'abonnement (à tout moment)</a></li>
      </ul>
      
      <div class="alert">
        <strong>💡 Renouvellement Automatique</strong>
        <p style="margin: 8px 0 0 0;">Votre abonnement se renouvelle automatiquement au tarif de ${amountLabel} € TTC / ${periodLabel}. Vous pouvez le résilier à tout moment pour la fin de la période en cours.</p>
      </div>
      
      <h2 style="color: #3498db; margin-top: 30px;">❓ Questions ?</h2>
      <p>Besoin d'aide ? Notre équipe support est prête à vous aider :</p>
      <p style="text-align: center;">
        <a href="mailto:${purchaseConfig.EMAIL.SUPPORT_EMAIL}" style="color: #3498db; font-weight: bold;">${purchaseConfig.EMAIL.SUPPORT_EMAIL}</a>
      </p>
    </div>
    
    <div class="footer">
      <p>Merci d'avoir choisi VHR Dashboard !</p>
      <p><a href="${ACCOUNT_URL}" style="color: #3498db;">Mon Compte</a> | <a href="${purchaseConfig.EMAIL.DOCUMENTATION_URL}" style="color: #3498db;">Documentation</a></p>
      <p>&copy; 2025 VHR Dashboard. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: purchaseConfig.EMAIL.FROM_CONTACT || purchaseConfig.EMAIL.FROM,
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

/**
 * Envoyer un email avec les identifiants de connexion
 */
async function sendCredentialsEmail(user) {
  if (!transporter && purchaseConfig.EMAIL.ENABLED) {
    initEmailTransporter();
  }

  if (!transporter) {
    console.warn('[email] Cannot send email: transporter not available');
    return { success: false, error: 'Email service not configured' };
  }

  try {
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
    .credentials-box { background: #f8f9fa; border-left: 4px solid #3498db; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .credential-item { background: white; padding: 15px; border-radius: 4px; margin-bottom: 10px; border: 1px solid #e0e0e0; }
    .credential-label { color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; display: block; }
    .credential-value { background: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 14px; word-break: break-all; }
    .copy-hint { font-size: 11px; color: #999; margin-top: 5px; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e0e0e0; }
    .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Vos Identifiants VHR Dashboard</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Pour une sécurité maximale, vos identifiants sont envoyés séparément</p>
    </div>
    
    <div class="content">
      <p>Bonjour <strong>${user.username}</strong>,</p>
      
      <p>Voici vos identifiants de connexion pour accéder à VHR Dashboard. Ces informations vous permettront de vous connecter depuis n'importe où.</p>
      
      <div class="credentials-box">
        <div class="credential-item">
          <span class="credential-label">👤 Nom d'utilisateur</span>
          <div class="credential-value">${user.username}</div>
          <div class="copy-hint">Ce nom d'utilisateur sera utilisé partout</div>
        </div>
        
        <div class="credential-item">
          <span class="credential-label">📧 Email</span>
          <div class="credential-value">${user.email}</div>
          <div class="copy-hint">Utilisé pour les notifications et la récupération de compte</div>
        </div>
        
        <div class="credential-item">
          <span class="credential-label">🔑 Mot de passe</span>
          <div class="credential-value">${user.plainPassword || 'Utilisez le mot de passe que vous avez défini'}</div>
          <div class="copy-hint">Conservez-le en lieu sûr</div>
        </div>
      </div>
      
      <h2 style="color: #3498db; margin-top: 30px;">🚀 Accéder à VHR Dashboard</h2>
      <p>Vous pouvez maintenant vous connecter en visitant :</p>
      <p style="text-align: center;">
        <a href="${DASHBOARD_PRO_URL}" style="color: #3498db; font-weight: bold;">${DASHBOARD_PRO_URL}</a>
      </p>
      
      <div class="alert">
        <strong>⚠️ Sécurité</strong>
        <p style="margin: 8px 0 0 0;">Ne partagez jamais vos identifiants. VHR Dashboard ne vous les demandera jamais par email.</p>
      </div>
      
      <h2 style="color: #3498db; margin-top: 30px;">❓ Besoin d'aide ?</h2>
      <p>Si vous avez oublié vos identifiants, contactez le support :</p>
      <p style="text-align: center;">
        <a href="mailto:${purchaseConfig.EMAIL.SUPPORT_EMAIL}" style="color: #3498db; font-weight: bold;">${purchaseConfig.EMAIL.SUPPORT_EMAIL}</a>
      </p>
    </div>
    
    <div class="footer">
      <p>Bienvenue dans VHR Dashboard !</p>
      <p><a href="${ACCOUNT_URL}" style="color: #3498db;">Mon Compte</a> | <a href="${purchaseConfig.EMAIL.DOCUMENTATION_URL}" style="color: #3498db;">Documentation</a></p>
      <p>&copy; 2025 VHR Dashboard. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: purchaseConfig.EMAIL.FROM,
      to: user.email,
      subject: '🔐 Vos identifiants VHR Dashboard - Connexion sécurisée',
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[email] Credentials email sent:', { to: user.email, messageId: info.messageId });
    
    return { success: true, messageId: info.messageId };
  } catch (e) {
    console.error('[email] Failed to send credentials email:', e);
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
  sendCredentialsEmail,
  generateLicenseKey
};
