# Système de Gestion des Abonnements Mensuels

## Overview

Un système complet de gestion des abonnements mensuels avec trois niveaux de service, intégration Stripe et facturation récurrente.

---

## Plans disponibles

### 1. **Plan Starter** - 9,99€/mois
- Accès à la plateforme
- Jusqu'à 5 utilisateurs
- Support par email
- Rapports mensuels
- Mise à jour quotidienne des données
- 5 GB de stockage
- 1,000 appels API/jour

### 2. **Plan Professional** - 29,99€/mois
- Tout du plan Starter +
- Jusqu'à 50 utilisateurs
- Support prioritaire 24h
- Rapports hebdomadaires et mensuels
- Mise à jour en temps réel
- API personnalisée
- Intégrations Zapier
- 50 GB de stockage
- 10,000 appels API/jour

### 3. **Plan Enterprise** - 99,99€/mois
- Tout du plan Professional +
- Utilisateurs illimités
- Support 24/7 téléphone
- Rapports en temps réel
- API illimitée
- SSO (Single Sign-On)
- Serveur dédié optionnel
- Support technique personnel
- SLA 99.9% garanti
- Stockage illimité
- Appels API illimités

---

## Configuration

### Fichier: `/config/subscription.config.js`

```javascript
PLANS: {
  STARTER: {
    price: 9.99,
    stripePriceId: 'price_1QeNjN...',  // À configurer avec Stripe
    features: [...],
    limits: { maxUsers: 5, ... }
  },
  // ... autres plans
}
```

### Variables d'environnement (.env)

```bash
# Stripe Price IDs (créez-les dans votre tableau de bord Stripe)
STRIPE_PRICE_ID_STARTER=price_1QeNjN...
STRIPE_PRICE_ID_PROFESSIONAL=price_1QeNjO...
STRIPE_PRICE_ID_ENTERPRISE=price_1QeNjP...

# Webhook Stripe
STRIPE_WEBHOOK_SECRET=whsec_...

# Configuration de facturation
TAX_RATE=0.20  # 20% TVA
```

---

## API Endpoints

### 1. Récupérer les plans disponibles

**Endpoint:** `GET /api/subscriptions/plans`

**Authentification:** Non requise

**Réponse:**

```json
{
  "ok": true,
  "plans": [
    {
      "id": "plan_starter",
      "name": "Starter",
      "description": "Plan de base pour débuter",
      "price": 9.99,
      "currency": "EUR",
      "billingPeriod": "month",
      "features": [...],
      "limits": { "maxUsers": 5, ... }
    },
    // ... autres plans
  ],
  "billingOptions": {
    "monthly": { "discountPercent": 0, "trialDays": 7 },
    "annual": { "discountPercent": 20, "trialDays": 14 }
  }
}
```

### 2. Récupérer l'abonnement actif de l'utilisateur

**Endpoint:** `GET /api/subscriptions/my-subscription`

**Authentification:** Requise (token JWT)

**Réponse:**

```json
{
  "ok": true,
  "subscription": {
    "isActive": true,
    "status": "active",
    "currentPlan": {
      "id": "STARTER",
      "name": "Starter",
      "price": 9.99,
      "features": [...]
    },
    "subscriptionId": "sub_1234567890",
    "startDate": "2025-12-01T00:00:00Z",
    "endDate": "2026-01-01T00:00:00Z",
    "nextBillingDate": "2026-01-01T00:00:00Z",
    "daysUntilRenewal": 31
  }
}
```

### 3. Récupérer l'historique des abonnements

**Endpoint:** `GET /api/subscriptions/history`

**Authentification:** Requise

**Réponse:**

```json
{
  "ok": true,
  "history": [
    {
      "id": 1,
      "planName": "Starter",
      "status": "active",
      "startDate": "2025-12-01T00:00:00Z",
      "endDate": "2026-01-01T00:00:00Z",
      "totalPaid": 9.99
    },
    // ... autres abonnements
  ]
}
```

### 4. Annuler l'abonnement

**Endpoint:** `POST /api/subscriptions/cancel`

**Authentification:** Requise

**Réponse:**

```json
{
  "ok": true,
  "message": "Subscription cancelled successfully",
  "subscription": {
    "id": 1,
    "status": "cancelled",
    "cancelledAt": "2025-12-01T12:00:00Z"
  }
}
```

---

## Flux d'abonnement

### 1. **Utilisateur s'inscrit**
   - Crée un compte (7 jours de démo gratuits)
   - Accès limité au plan gratuit

### 2. **Utilisateur choisit un plan payant**
   - Clique sur "Upgrade"
   - Redirection vers Stripe Checkout
   - Paie la première facture

### 3. **Abonnement créé**
   - Webhook Stripe déclenche `charge.succeeded`
   - Abonnement sauvegardé dans la DB
   - Accès aux fonctionnalités du plan

### 4. **Renouvellement automatique**
   - Chaque mois: Stripe facture automatiquement
   - Webhook met à jour `endDate`
   - Accès continue si paiement réussi

### 5. **Annulation**
   - Utilisateur clique "Annuler"
   - Accès maintenu jusqu'à `endDate`
   - Après expiration: retour au plan gratuit (démo)

---

## Intégration Stripe

### Configuration dans Stripe

1. **Créer les produits:**
   - VHR Dashboard - Starter (9.99€/mois)
   - VHR Dashboard - Professional (29.99€/mois)
   - VHR Dashboard - Enterprise (99.99€/mois)

2. **Créer les price IDs:**
   - Copier les IDs des prix Stripe
   - Ajouter dans `.env`:
     ```
     STRIPE_PRICE_ID_STARTER=price_...
     STRIPE_PRICE_ID_PROFESSIONAL=price_...
     STRIPE_PRICE_ID_ENTERPRISE=price_...
     ```

3. **Configurer le webhook:**
   - URL: `https://votresiteweb.com/webhook`
   - Événements: `charge.succeeded`, `charge.failed`, `customer.subscription.updated`
   - Copier le secret webhook
   - Ajouter dans `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

### Exemple côté client

```javascript
// Récupérer les plans
const res = await fetch('/api/subscriptions/plans');
const { plans } = await res.json();

// Afficher les plans
plans.forEach(plan => {
  console.log(`${plan.name}: ${plan.price}€/mois`);
});

// Créer une session de checkout
const response = await fetch('/create-checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    priceId: plan.stripePriceId,
    mode: 'subscription'  // Important: mode subscription (pas payment)
  })
});

const { sessionId } = await response.json();

// Rediriger vers Stripe Checkout
const stripe = Stripe('YOUR_PUBLISHABLE_KEY');
await stripe.redirectToCheckout({ sessionId });

// Récupérer l'abonnement actif
const mySubRes = await fetch('/api/subscriptions/my-subscription', {
  credentials: 'include'
});
const { subscription } = await mySubRes.json();
console.log(`Abonnement: ${subscription.currentPlan.name}`);
console.log(`Renouvellement: ${subscription.daysUntilRenewal} jours`);

// Annuler l'abonnement
const cancelRes = await fetch('/api/subscriptions/cancel', {
  method: 'POST',
  credentials: 'include'
});
```

---

## Statuts d'abonnement

| Statut | Description | Accès | Action possible |
|--------|-------------|-------|-----------------|
| `trial` | Période d'essai 7 jours | Complet | Upgrade ou fin d'essai |
| `active` | Abonnement payant actif | Complet | Annuler |
| `past_due` | Paiement en retard | Limité | Réessayer paiement |
| `cancelled` | Annulé par l'utilisateur | Limité jusqu'à endDate | Réactiver |
| `expired` | Abonnement expiré | Accès démo | Renouveler |

---

## Limites et quotas par plan

### Starter
```
Utilisateurs: 5
Points de données: 1,000
Stockage: 5 GB
Appels API/jour: 1,000
```

### Professional
```
Utilisateurs: 50
Points de données: 50,000
Stockage: 50 GB
Appels API/jour: 10,000
```

### Enterprise
```
Utilisateurs: Illimité
Points de données: Illimité
Stockage: Illimité
Appels API/jour: Illimité
```

---

## Middleware de vérification d'abonnement

À ajouter pour vérifier les limites:

```javascript
// Middleware pour vérifier l'accès selon le plan
function checkSubscriptionAccess(req, res, next) {
  const user = req.user;
  const subscription = subscriptions.find(s => s.username === user.username && s.status === 'active');
  
  if (!subscription) {
    return res.status(403).json({ 
      ok: false, 
      error: 'Active subscription required',
      upgradeUrl: '/pricing.html'
    });
  }
  
  req.subscription = subscription;
  next();
}

// Utilisation
app.get('/api/protected-feature', authMiddleware, checkSubscriptionAccess, (req, res) => {
  // Accessible seulement aux utilisateurs avec abonnement actif
});
```

---

## Historique des changements

- ✅ Configuration des plans créée (`/config/subscription.config.js`)
- ✅ Routes API d'abonnement implémentées
- ✅ Intégration Stripe prête
- ⏳ À faire: Middleware de vérification de limites
- ⏳ À faire: Emails de renouvellement/expiration
- ⏳ À faire: Portal client Stripe (gérer abonnement)
- ⏳ À faire: Factures PDF

---

## Notes importantes

1. **Stripe test mode:** Utilisez les clés test Stripe pendant le développement
2. **Webhook:** Doit être configuré et testé avec `stripe listen`
3. **Essai gratuit:** Les 7 premiers jours de démo sont automatiques
4. **Taxes:** À configurer selon votre juridiction (TVA 20% par défaut)
5. **Facturation:** Les factures sont gérées par Stripe automatiquement
