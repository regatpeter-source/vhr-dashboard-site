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

  // Configuration des emails
  EMAIL: {
    FROM: process.env.EMAIL_FROM || 'noreply@vhr-dashboard.com',
    SMTP_HOST: process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    SMTP_PORT: process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || 587,
    SMTP_USER: process.env.BREVO_SMTP_USER || process.env.SMTP_USER || '',
    SMTP_PASS: process.env.BREVO_SMTP_PASS || process.env.SMTP_PASS || '',
    ENABLED: process.env.EMAIL_ENABLED === 'true' || false,
    DOWNLOAD_URL: process.env.DOWNLOAD_URL || 'http://localhost:3000/downloads/vhr-dashboard-demo.zip',
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@vhr-dashboard.com',
    DOCUMENTATION_URL: process.env.DOCUMENTATION_URL || 'https://docs.vhr-dashboard.com'
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
    KEY_FORMAT: 'VHR-XXXX-XXXX-XXXX-XXXX',
    EXPIRATION_REMINDER_DAYS: 30,
    AUTO_RENEWAL_REMINDER_DAYS: 0
  }
};
