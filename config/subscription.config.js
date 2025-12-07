/**
 * Configuration des plans d'abonnement mensuels
 * Plan unique: 29€ TTC/mois pour tous (pro et particulier)
 */

module.exports = {
  // Plan d'abonnement unique
  PLANS: {
    // Plan Standard - Accès unique pour tous
    STANDARD: {
      id: 'plan_standard',
      name: 'Abonnement Mensuel',
      description: 'Accès complet VHR Dashboard - 29€ TTC/mois',
      price: 29.00, // EUR TTC par mois
      currency: 'EUR',
      billingPeriod: 'month',
      stripePriceId: process.env.STRIPE_PRICE_ID_STANDARD || 'price_1Qa0ZZXXXXXXXXXXXXXXXX', // À remplacer par votre ID réel Stripe
      features: [
        'Accès complet à VHR Dashboard',
        'Gestion de casques VR',
        'Streaming vidéo (Scrcpy)',
        'WiFi automatique',
        'Voix PC → Casque (TTS)',
        'Gestion des apps',
        'Support utilisateur',
        'Mises à jour incluses'
      ],
      limits: {
        maxUsers: -1, // Illimité
        maxDataPoints: -1,
        storageGB: -1,
        apiCallsPerDay: -1
      }
    }
  },

  // Options de facturation
  BILLING_OPTIONS: {
    MONTHLY: {
      id: 'monthly',
      name: 'Mensuel',
      discountPercent: 0,
      trialDays: 7 // 7 jours d'essai gratuit avant charge
    }
  }
};
      trialDays: 14 // 14 jours d'essai gratuit
    }
  },

  // Configuration de facturation
  BILLING: {
    CURRENCY: 'EUR',
    TAX_RATE: 0.20, // 20% de TVA (à adapter selon votre juridiction)
    INVOICE_REMINDER_DAYS: 7, // Rappel avant fin de période
    RENEWAL_CHECK_DAYS: 3 // Vérifier le renouvellement 3 jours avant expiration
  },

  // Événements de subscription
  SUBSCRIPTION_EVENTS: {
    CREATED: 'subscription.created',
    UPDATED: 'subscription.updated',
    RENEWED: 'subscription.renewed',
    EXPIRED: 'subscription.expired',
    CANCELLED: 'subscription.cancelled',
    PAYMENT_FAILED: 'subscription.payment_failed',
    PAYMENT_SUCCEEDED: 'subscription.payment_succeeded'
  }
};
