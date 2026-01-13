/**
 * Configuration de la période de démonstration/trial
 * Contrôle la durée gratuite et les limites de la démo
 */

module.exports = {
  // Durée de la période de démo gratuite en jours
  DEMO_DAYS: 7,

  // Durée en millisecondes
  DEMO_DURATION_MS: 7 * 24 * 60 * 60 * 1000, // 7 jours

  // Type de mode démo (localStorage, cookie, database, none)
  // localStorage: stocke la date de démarrage dans le navigateur
  // database: stocke dans la base de données utilisateur
  // none: pas de limitation (test mode)
  MODE: 'database',

  // Message d'avertissement avant expiration
  WARNING_DAYS_BEFORE: 1, // Avertir 1 jour avant expiration

  // Actions à la fin de la démo
  ACTIONS_ON_EXPIRATION: {
    blockAccess: true,          // Bloquer l'accès à la démo
    showUpgradePrompt: true,    // Afficher l'invite de mise à niveau
    redirectToUpgrade: false,   // Rediriger vers la page d'upgrade
    sendNotificationEmail: true // Envoyer un email
  }
};
