/**
 * Configuration des achats définitifs (paiement unique)
 * Licence perpétuelle unique: 499€ TTC pour tous
 */

module.exports = {
  // Option d'achat définitif unique
  PURCHASE_OPTIONS: {
    // Licence perpétuelle - Accès à vie
    PERPETUAL: {
      id: 'perpetual_pro',
      name: 'VHR Dashboard - Licence à Vie',
      description: 'Accès perpétuel à VHR Dashboard - 499€ TTC unique',
      price: 499.00, // EUR TTC (paiement unique)
      currency: 'EUR',
      billingPeriod: 'once',
      stripePriceId: process.env.STRIPE_PRICE_ID_PERPETUAL || 'price_1Qa0ZBXXXXXXXXXXXXXXXX', // À remplacer par votre ID réel Stripe
      features: [
        'Accès perpétuel (jamais expirer)',
        'Accès complet VHR Dashboard',
        'Gestion de casques VR illimitée',
        'Streaming vidéo (Scrcpy)',
        'WiFi automatique',
        'Voix PC → Casque (TTS)',
        'Gestion des apps',
        'Mises à jour incluses à vie',
        'Support utilisateur prioritaire'
      ],
      limits: {
        maxUsers: -1, // Illimité
        maxDataPoints: -1, // Illimité
        storageGB: -1, // Illimité
        apiCallsPerDay: -1 // Illimité
      },
      license: {
        duration: 'perpetual',
        updatesCoveredMonths: -1, // Illimité
        supportCoveredMonths: -1 // Illimité
      }
    }
  },

  // Templates d'email pour les notifications
  EMAIL_TEMPLATES: {
    PURCHASE_CONFIRMATION: {
      subject: '✅ Votre licence VHR Dashboard est activée',
      title: 'Achat confirmé',
      greeting: 'Bonjour {username},',
      content: `
Merci pour votre achat ! Votre licence VHR Dashboard à vie est maintenant activée.

**Détails de votre achat:**
- **Licence:** VHR Dashboard - Licence à Vie
- **Prix:** 499€ TTC
- **Date d'achat:** {purchaseDate}
- **Clé de licence:** {licenseKey}
- **Accès:** Perpétuel (à vie)

**Accéder au dashboard:**
{dashboardUrl}

Votre licence est immédiatement opérationnelle. Vous pouvez commencer à utiliser VHR Dashboard maintenant.

Questions? Contactez le support: {supportEmail}
      `
    },

    PURCHASE_RECEIPT: {
      subject: '🧾 Reçu de votre achat VHR Dashboard',
      title: 'Reçu d\'achat',
      greeting: 'Bonjour {username},',
      content: `
Voici votre reçu d'achat:

**Produit:** VHR Dashboard - Licence à Vie
**Montant:** 499,00€ TTC
**Date:** {purchaseDate}
**Transaction ID:** {transactionId}
**Clé de licence:** {licenseKey}

Conservez ce reçu pour vos dossiers. Votre licence n'expire jamais.

Pour gérer votre compte: {accountUrl}

Merci d'avoir choisi VHR Dashboard!
      `
    }
  },

  // Configuration des licences
  LICENSE: {
    KEY_LENGTH: 32,
    KEY_FORMAT: 'VHR-XXXX-XXXX-XXXX-XXXX', // Format d'affichage
    EXPIRATION_REMINDER_DAYS: 30, // N/A pour perpétuel
    AUTO_RENEWAL_REMINDER_DAYS: 0 // N/A pour perpétuel
  }
};
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
