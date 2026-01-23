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
      // Préférence pour STRIPE_SUBSCRIPTION_PRICE_ID (nouveau prix Stripe dédié), fallback sur STRIPE_PRICE_ID_STANDARD
      stripePriceId: process.env.STRIPE_SUBSCRIPTION_PRICE_ID || process.env.STRIPE_PRICE_ID_STANDARD || 'price_1Qa0ZZXXXXXXXXXXXXXXXX',
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
