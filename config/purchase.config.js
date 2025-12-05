/**
 * Configuration des achats définitifs (paiement unique)
 * Définit les options d'achat permanent sans abonnement
 */

module.exports = {
  // Options d'achat définitif (paiement unique)
  PURCHASE_OPTIONS: {
    // Accès perpétuel - Version Pro
    PERPETUAL_PRO: {
      id: 'purchase_perpetual_pro',
      name: 'VHR Dashboard - Accès Pro Perpétuel',
      description: 'Accès perpétuel à VHR Dashboard version Professional',
      price: 299.99, // EUR
      currency: 'EUR',
      billingPeriod: 'once',
      stripePriceId: process.env.STRIPE_PRICE_ID_PERPETUAL_PRO || 'price_1QeNjQJq3YJ6xXXXXXXXXXXX',
      features: [
        'Accès perpétuel (jamais expirer)',
        'Version Professional',
        'Jusqu\'à 50 utilisateurs',
        'Mises à jour incluses pendant 1 an',
        'Support par email pendant 1 an',
        'API personnalisée',
        'Intégrations Zapier',
        'Rapports personnalisés'
      ],
      limits: {
        maxUsers: 50,
        maxDataPoints: 50000,
        storageGB: 50,
        apiCallsPerDay: 10000
      },
      license: {
        duration: 'perpetual',
        updatesCoveredMonths: 12,
        supportCoveredMonths: 12
      }
    },

    // Accès perpétuel - Version Enterprise
    PERPETUAL_ENTERPRISE: {
      id: 'purchase_perpetual_enterprise',
      name: 'VHR Dashboard - Accès Enterprise Perpétuel',
      description: 'Accès perpétuel à VHR Dashboard version Enterprise',
      price: 999.99, // EUR
      currency: 'EUR',
      billingPeriod: 'once',
      stripePriceId: process.env.STRIPE_PRICE_ID_PERPETUAL_ENTERPRISE || 'price_1QeNjRJq3YJ6xXXXXXXXXXXX',
      features: [
        'Accès perpétuel (jamais expirer)',
        'Version Enterprise complète',
        'Utilisateurs illimités',
        'Mises à jour incluses à vie',
        'Support prioritaire pendant 2 ans',
        'SSO (Single Sign-On)',
        'API illimitée',
        'Support technique personnel',
        'SLA garanti 99.9%',
        'Serveur dédié optionnel'
      ],
      limits: {
        maxUsers: -1, // Illimité
        maxDataPoints: -1,
        storageGB: -1,
        apiCallsPerDay: -1
      },
      license: {
        duration: 'perpetual',
        updatesCoveredMonths: -1, // Illimité
        supportCoveredMonths: 24
      }
    },

    // Pack 1 an - Toutes mises à jour
    ANNUAL_PRO: {
      id: 'purchase_annual_pro',
      name: 'VHR Dashboard - Pack Annuel Pro',
      description: 'Accès 1 an à VHR Dashboard Professional avec toutes les mises à jour',
      price: 99.99, // EUR
      currency: 'EUR',
      billingPeriod: 'annual',
      stripePriceId: process.env.STRIPE_PRICE_ID_ANNUAL_PRO || 'price_1QeNjSJq3YJ6xXXXXXXXXXXX',
      features: [
        'Accès 1 an',
        'Version Professional',
        'Jusqu\'à 50 utilisateurs',
        'Toutes les mises à jour pendant 1 an',
        'Support par email',
        'API personnalisée'
      ],
      limits: {
        maxUsers: 50,
        maxDataPoints: 50000,
        storageGB: 50,
        apiCallsPerDay: 10000
      },
      license: {
        duration: 'annual',
        updatesCoveredMonths: 12,
        supportCoveredMonths: 12,
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    }
  },

  // Configuration des emails
  EMAIL: {
    FROM: process.env.EMAIL_FROM || 'noreply@vhr-dashboard.com',
    // Support pour Brevo (Sendinblue) et autres providers SMTP
    SMTP_HOST: process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    SMTP_PORT: process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || 587,
    SMTP_USER: process.env.BREVO_SMTP_USER || process.env.SMTP_USER || '',
    SMTP_PASS: process.env.BREVO_SMTP_PASS || process.env.SMTP_PASS || '',
    
    // Activer/désactiver l'envoi d'emails
    ENABLED: process.env.EMAIL_ENABLED === 'true' || false,
    
    // URLs
    DOWNLOAD_URL: process.env.DOWNLOAD_URL || 'http://localhost:3000/downloads/vhr-dashboard-demo.zip',
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@vhr-dashboard.com',
    DOCUMENTATION_URL: process.env.DOCUMENTATION_URL || 'https://docs.vhr-dashboard.com'
  },

  // Messages d'email
  EMAIL_TEMPLATES: {
    PURCHASE_SUCCESS: {
      subject: '🎉 Accès VHR Dashboard débloqué - Téléchargez maintenant',
      title: 'Merci pour votre achat!',
      greeting: 'Bonjour {username},',
      content: `
Votre achat a été confirmé avec succès! Votre accès VHR Dashboard est maintenant activé.

**Plan acheté:** {planName}
**Numéro de commande:** {orderId}
**Prix:** {price}€

### Télécharger VHR Dashboard

Cliquez sur le lien ci-dessous pour télécharger votre dashboard:
{downloadLink}

### Informations d'accès

**Utilisateur:** {username}
**Clé de licence:** {licenseKey}
**Durée:** {licenseDuration}
**Mises à jour incluses:** {updatesUntil}

### Prochaines étapes

1. Téléchargez le fichier ZIP
2. Extrayez-le sur votre serveur
3. Consultez la documentation d'installation: {documentationUrl}
4. Contactez le support si vous avez besoin d'aide: {supportEmail}

Bienvenue dans VHR Dashboard!
      `
    },

    SUBSCRIPTION_SUCCESS: {
      subject: '✅ Votre abonnement VHR Dashboard est actif',
      title: 'Abonnement confirmé!',
      greeting: 'Bonjour {username},',
      content: `
Votre abonnement VHR Dashboard a été configuré avec succès!

**Plan:** {planName}
**Période de facturation:** {billingPeriod}
**Prix:** {price}€/{billingPeriod}
**Numéro d'abonnement:** {subscriptionId}

### Accès instantané

Votre accès est activé immédiatement. Vous pouvez accéder à votre dashboard ici:
{dashboardUrl}

### Gérer votre abonnement

- **Voir vos factures:** {invoicesUrl}
- **Mettre à jour le paiement:** {updatePaymentUrl}
- **Annuler l'abonnement:** {cancelUrl}

### Support

Pour toute question, contactez: {supportEmail}

Merci d'avoir choisi VHR Dashboard!
      `
    },

    RENEWAL_REMINDER: {
      subject: '📅 Rappel: Renouvellement de votre abonnement dans 7 jours',
      title: 'Rappel de renouvellement',
      greeting: 'Bonjour {username},',
      content: `
Votre abonnement VHR Dashboard expirera dans 7 jours.

**Plan actuel:** {planName}
**Date d'expiration:** {expirationDate}
**Prochain renouvellement automatique:** {renewalDate}

Votre abonnement se renouvellera automatiquement sauf si vous l'annulez.

Pour gérer votre abonnement: {manageUrl}

Questions? Contactez le support: {supportEmail}
      `
    },

    LICENSE_EXPIRING: {
      subject: '⏰ Votre licence VHR Dashboard expire bientôt',
      title: 'Licence en cours d\'expiration',
      greeting: 'Bonjour {username},',
      content: `
Votre licence VHR Dashboard expirera dans {daysRemaining} jours.

**Licence:** {licenseKey}
**Date d'expiration:** {expirationDate}
**Mises à jour supportées jusqu'au:** {supportUntilDate}

Après l'expiration, vous aurez accès à la version que vous avez achetée, mais pas aux mises à jour futures.

**Renouveller votre licence:**
{renewalLink}

Pour toute question: {supportEmail}
      `
    }
  },

  // Configuration des licences
  LICENSE: {
    KEY_LENGTH: 32,
    KEY_FORMAT: 'XXXX-XXXX-XXXX-XXXX-XXXX-XXXX', // Format d'affichage
    EXPIRATION_REMINDER_DAYS: 30, // Rappeler 30 jours avant expiration
    AUTO_RENEWAL_REMINDER_DAYS: 7 // Rappeler 7 jours avant renouvellement
  }
};
