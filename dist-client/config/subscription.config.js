/**
 * Abonnements TTC mensuel et annuel.
 */

const { OFFERS } = require('./pricing');

module.exports = {
  PLANS: {
    // Plan Standard - Accès unique pour tous
    STANDARD: {
      id: 'plan_standard',
      name: 'Abonnement Mensuel',
      description: 'Accès complet VHR Dashboard - 19,90 € TTC/mois',
      price: OFFERS.monthly.price,
      currency: 'EUR',
      billingPeriod: 'month',
      stripePriceId: OFFERS.monthly.stripePriceId,
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
    },
    ANNUAL: {
      id: 'plan_annual',
      name: 'Abonnement Annuel',
      description: 'Accès complet VHR Dashboard - 199 € TTC/an',
      price: OFFERS.annual.price,
      currency: 'EUR',
      billingPeriod: 'year',
      stripePriceId: OFFERS.annual.stripePriceId,
      features: ['Accès complet à VHR Dashboard', 'Gestion de casques VR', 'Streaming vidéo (Scrcpy)', 'WiFi automatique', 'Voix PC → Casque (TTS)', 'Gestion des apps', 'Support utilisateur', 'Mises à jour incluses'],
      limits: { maxUsers: -1, maxDataPoints: -1, storageGB: -1, apiCallsPerDay: -1 }
    }
  },

  // Options de facturation
  BILLING_OPTIONS: {
    MONTHLY: {
      id: 'monthly',
      name: 'Mensuel',
      discountPercent: 0,
      trialDays: 7 // 7 jours d'essai gratuit avant charge
    },
    ANNUAL: { id: 'annual', name: 'Annuel', trialDays: 7 }
  }
};
