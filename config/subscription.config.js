/**
 * Configuration des plans d'abonnement mensuels
 * Définit les différents niveaux de services et leurs tarifs
 */

module.exports = {
  // Plans d'abonnement disponibles
  PLANS: {
    // Plan Starter - Accès basique
    STARTER: {
      id: 'plan_starter',
      name: 'Starter',
      description: 'Plan de base pour débuter',
      price: 9.99, // EUR par mois
      currency: 'EUR',
      billingPeriod: 'month',
      stripePriceId: process.env.STRIPE_PRICE_ID_STARTER || 'price_1QeNjNJq3YJ6xXXXXXXXXXXX', // À remplacer par votre ID réel
      features: [
        'Accès à la plateforme',
        'Jusqu\'à 5 utilisateurs',
        'Support par email',
        'Rapports mensuels',
        'Mise à jour des données quotidiennes'
      ],
      limits: {
        maxUsers: 5,
        maxDataPoints: 1000,
        storageGB: 5,
        apiCallsPerDay: 1000
      }
    },

    // Plan Professional - Accès intermédiaire
    PROFESSIONAL: {
      id: 'plan_professional',
      name: 'Professional',
      description: 'Plan professionnel pour les équipes',
      price: 29.99, // EUR par mois
      currency: 'EUR',
      billingPeriod: 'month',
      stripePriceId: process.env.STRIPE_PRICE_ID_PROFESSIONAL || 'price_1QeNjOJq3YJ6xXXXXXXXXXXX', // À remplacer
      features: [
        'Tout du plan Starter',
        'Jusqu\'à 50 utilisateurs',
        'Support prioritaire (24h)',
        'Rapports hebdomadaires et mensuels',
        'Mise à jour des données en temps réel',
        'API personnalisée',
        'Intégrations Zapier'
      ],
      limits: {
        maxUsers: 50,
        maxDataPoints: 50000,
        storageGB: 50,
        apiCallsPerDay: 10000
      }
    },

    // Plan Enterprise - Accès complet
    ENTERPRISE: {
      id: 'plan_enterprise',
      name: 'Enterprise',
      description: 'Plan complet avec support personnalisé',
      price: 99.99, // EUR par mois (ou sur devis)
      currency: 'EUR',
      billingPeriod: 'month',
      stripePriceId: process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_1QeNjPJq3YJ6xXXXXXXXXXXX', // À remplacer
      features: [
        'Tout du plan Professional',
        'Utilisateurs illimités',
        'Support 24/7 téléphone et email',
        'Rapports en temps réel',
        'Mise à jour des données temps réel',
        'API illimitée',
        'SSO (Single Sign-On)',
        'Serveur dédié optionnel',
        'Support technique personnel',
        'SLA garanti 99.9%'
      ],
      limits: {
        maxUsers: -1, // Illimité
        maxDataPoints: -1, // Illimité
        storageGB: -1, // Illimité
        apiCallsPerDay: -1 // Illimité
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
    },
    ANNUAL: {
      id: 'annual',
      name: 'Annuel',
      discountPercent: 20, // 20% de réduction pour l'annuel
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
