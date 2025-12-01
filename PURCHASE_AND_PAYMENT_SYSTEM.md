# Système de Paiement: Achat Définitif + Abonnement Mensuel

## Overview

Un système complet de paiement permettant:
- ✅ **Achats définitifs** (paiement unique, accès perpétuel)
- ✅ **Abonnements mensuels** (facturation récurrente)
- ✅ **Envoi automatique** du lien de téléchargement par email
- ✅ **Génération de clés de licence** uniques
- ✅ **Webhooks Stripe** pour mettre à jour l'accès automatiquement

---

## Options d'achat

### 📦 Achats Définitifs (Paiement Unique)

#### 1. **Accès Pro Perpétuel - 299,99€**
- Accès perpétuel (jamais expirer)
- Version Professional
- Jusqu'à 50 utilisateurs
- 50 GB de stockage
- 10,000 appels API/jour
- Mises à jour incluses 1 an
- Support 1 an

#### 2. **Accès Enterprise Perpétuel - 999,99€**
- Accès perpétuel
- Version Enterprise complète
- Utilisateurs illimités
- Stockage illimité
- API illimitée
- Mises à jour à vie
- Support 2 ans

#### 3. **Pack Annuel Pro - 99,99€**
- Accès 1 an
- Version Professional
- Toutes les mises à jour
- Support 1 an

### 📅 Abonnements Mensuels (Récurrents)

#### 1. **Starter - 9,99€/mois**
#### 2. **Professional - 29,99€/mois**
#### 3. **Enterprise - 99,99€/mois**

---

## Flux d'achat & Email

### Scénario 1: Achat Définitif (Paiement Unique)

```
1. Utilisateur clique "Acheter VHR Pro Perpétuel"
   ↓
2. Redirection Stripe Checkout
   ↓
3. Paiement confirmé
   ↓
4. Webhook Stripe: checkout.session.completed (mode: payment)
   ↓
5. Serveur génère clé de licence unique
   ↓
6. EMAIL ENVOYÉ AUTOMATIQUEMENT ✉️
   - Sujet: "🎉 Accès VHR Dashboard débloqué"
   - Contient: Lien de téléchargement + clé de licence
   - Lien: Directement vers /downloads/vhr-dashboard-demo.zip?license=XXX
   ↓
7. Utilisateur reçoit email dans 2 secondes
   ↓
8. Clique "Télécharger VHR Dashboard"
   ↓
9. Téléchargement automatique du ZIP
```

### Scénario 2: Abonnement Mensuel

```
1. Utilisateur clique "S'abonner à Professional"
   ↓
2. Redirection Stripe Checkout (mode: subscription)
   ↓
3. Paiement du premier mois
   ↓
4. Webhook Stripe: checkout.session.completed (mode: subscription)
   ↓
5. EMAIL DE CONFIRMATION ENVOYÉ ✉️
   - Sujet: "✅ Votre abonnement VHR Dashboard est actif"
   - Contient: Lien accès dashboard + gestion abonnement
   ↓
6. Accès immédiat au dashboard
   ↓
7. Renouvellement automatique chaque mois
```

---

## Configuration

### Variables d'environnement (.env)

```bash
# === EMAIL ===
EMAIL_ENABLED=true
EMAIL_FROM=support@vhr-dashboard.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-passe-app

# Support et documentation
SUPPORT_EMAIL=support@vhr-dashboard.com
DOCUMENTATION_URL=https://docs.vhr-dashboard.com
DOWNLOAD_URL=http://localhost:3000/downloads/vhr-dashboard-demo.zip

# === STRIPE ===
# Prix pour achats définitifs
STRIPE_PRICE_ID_PERPETUAL_PRO=price_1QeNjQ...
STRIPE_PRICE_ID_PERPETUAL_ENTERPRISE=price_1QeNjR...
STRIPE_PRICE_ID_ANNUAL_PRO=price_1QeNjS...

# Prix pour abonnements
STRIPE_PRICE_ID_STARTER=price_1QeNjN...
STRIPE_PRICE_ID_PROFESSIONAL=price_1QeNjO...
STRIPE_PRICE_ID_ENTERPRISE=price_1QeNjP...

# Secrets
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Gmail SMTP (configuration rapide)

1. Activer l'authentification 2FA sur Gmail
2. Générer un mot de passe d'application: https://myaccount.google.com/apppasswords
3. Ajouter dans `.env`:
```bash
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-passe-app-16-caracteres
```

---

## API Endpoints

### 1. Récupérer les options d'achat

**Endpoint:** `GET /api/purchases/options`

**Authentification:** Non requise

**Réponse:**

```json
{
  "ok": true,
  "options": [
    {
      "id": "PERPETUAL_PRO",
      "name": "VHR Dashboard - Accès Pro Perpétuel",
      "description": "Accès perpétuel à VHR Dashboard version Professional",
      "price": 299.99,
      "currency": "EUR",
      "billingPeriod": "once",
      "features": [...],
      "limits": { "maxUsers": 50, ... },
      "license": { "duration": "perpetual", ... }
    }
  ]
}
```

### 2. Créer une session de paiement unique

**Endpoint:** `POST /api/purchases/create-checkout`

**Authentification:** Requise

**Body:**

```json
{
  "purchaseId": "PERPETUAL_PRO"  // ou PERPETUAL_ENTERPRISE, ANNUAL_PRO
}
```

**Réponse:**

```json
{
  "ok": true,
  "sessionId": "cs_live_...",
  "url": "https://checkout.stripe.com/pay/cs_live_..."
}
```

### 3. Récupérer l'historique des achats

**Endpoint:** `GET /api/purchases/history`

**Authentification:** Requise

**Réponse:**

```json
{
  "ok": true,
  "purchases": [
    {
      "id": 1,
      "name": "VHR Dashboard - Accès Pro Perpétuel",
      "purchaseDate": "2025-12-01T12:00:00Z",
      "price": 299.99,
      "licenseKey": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX",
      "license": {
        "duration": "perpetual",
        "updatesCoveredMonths": -1
      }
    }
  ]
}
```

---

## Email Automatique

### Contenu de l'email d'achat définitif

```
TO: utilisateur@example.com
SUBJECT: 🎉 Accès VHR Dashboard débloqué - Téléchargez maintenant

---

Bonjour USERNAME,

Votre achat a été confirmé avec succès! 
Votre accès VHR Dashboard est maintenant activé.

Plan acheté: VHR Dashboard - Accès Pro Perpétuel
Numéro de commande: ch_1234567890
Prix: 299.99€

📥 TÉLÉCHARGER VHR DASHBOARD
[BOUTON] Télécharger VHR Dashboard
Lien direct: http://localhost:3000/downloads/vhr-dashboard-demo.zip?license=ABCD-EFGH-IJKL-MNOP

🔑 INFORMATIONS D'ACCÈS
Utilisateur: USERNAME
Clé de licence: ABCD-EFGH-IJKL-MNOP-QRST-UVWX
Durée: Perpétuel
Mises à jour incluses jusqu'au: À jamais

📋 PROCHAINES ÉTAPES
1. Téléchargez le fichier ZIP
2. Extrayez-le sur votre serveur
3. Consultez la documentation: https://docs.vhr-dashboard.com
4. Contactez le support: support@vhr-dashboard.com

Bienvenue dans VHR Dashboard!

---
```

### Contenu de l'email d'abonnement

```
TO: utilisateur@example.com
SUBJECT: ✅ Votre abonnement VHR Dashboard est actif

---

Bonjour USERNAME,

Votre abonnement VHR Dashboard a été configuré avec succès!

Plan: Professional
Période de facturation: Mois
Prix: 29.99€/mois
Numéro d'abonnement: sub_1234567890

🚀 ACCÈS INSTANTANÉ
Votre accès est activé maintenant: http://localhost:3000

⚙️ GÉRER VOTRE ABONNEMENT
• Voir vos factures
• Mettre à jour le paiement
• Annuler l'abonnement

Support: support@vhr-dashboard.com

Merci d'avoir choisi VHR Dashboard!

---
```

---

## Intégration côté client

### HTML - Boutons d'achat

```html
<!-- Achat définitif -->
<button onclick="purchaseDefinitive('PERPETUAL_PRO')">
  Acheter VHR Pro Perpétuel - 299,99€
</button>

<!-- Abonnement mensuel -->
<button onclick="subscribeMonthly('PROFESSIONAL')">
  S'abonner à Professional - 29,99€/mois
</button>
```

### JavaScript

```javascript
// Achat définitif
async function purchaseDefinitive(purchaseId) {
  const res = await fetch('/api/purchases/create-checkout', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purchaseId })
  });
  
  const data = await res.json();
  if (data.ok) {
    // Rediriger vers Stripe
    window.location.href = data.url;
  } else {
    alert('Erreur: ' + data.error);
  }
}

// Abonnement mensuel
async function subscribeMonthly(planId) {
  const res = await fetch('/create-checkout-session', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      priceId: getPriceId(planId),
      mode: 'subscription'
    })
  });
  
  const data = await res.json();
  const stripe = Stripe('YOUR_PUBLISHABLE_KEY');
  await stripe.redirectToCheckout({ sessionId: data.sessionId });
}

// Afficher l'historique des achats
async function showPurchases() {
  const res = await fetch('/api/purchases/history', {
    credentials: 'include'
  });
  
  const { purchases } = await res.json();
  console.log('Mes achats:', purchases);
  
  purchases.forEach(p => {
    console.log(`${p.name} - ${p.price}€`);
    console.log(`Clé de licence: ${p.licenseKey}`);
  });
}
```

---

## Webhook Stripe

### Configuration

1. **Dans Stripe Dashboard:**
   - Aller à: Developers → Webhooks
   - Ajouter endpoint: `https://votresite.com/webhook`
   - Événements à écouter:
     - `checkout.session.completed`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `customer.subscription.*`

2. **Copier le secret webhook:**
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_test_xxx
   ```

3. **Tester localement avec stripe-cli:**
   ```bash
   stripe listen --forward-to localhost:3000/webhook
   # Copier le webhook secret affiché
   ```

### Flux du webhook

```
Événement Stripe
    ↓
POST /webhook reçu
    ↓
Vérification signature
    ↓
Mode payment? → Envoyer email "Achat successful"
    ↓
Mode subscription? → Envoyer email "Abonnement actif"
    ↓
Mettre à jour user.subscriptionStatus
    ↓
Répondre 200 OK
```

---

## Clés de licence

### Format

```
XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
32 caractères alphanumériques + 6 tirets
```

### Génération

```javascript
const key = generateLicenseKey();
// Exemple: "ABCD-EFGH-IJKL-MNOP-QRST-UVWX"
```

### Stockage

- Base de données: Dans la table `subscriptions` → colonne `licenseKey`
- Email: Envoyé en clair au client
- Lien de téléchargement: `?license=ABCD-EFGH-...`

### Validation (à implémenter)

```javascript
app.get('/downloads/vhr-dashboard-demo.zip', (req, res) => {
  const { license } = req.query;
  
  if (!license) {
    // Pas de licence = accès demo limité
    return sendDemoFile(res);
  }
  
  // Vérifier la licence
  const purchase = subscriptions.find(s => s.licenseKey === license);
  if (!purchase) {
    return res.status(401).json({ error: 'Invalid license key' });
  }
  
  // Envoyer le fichier avec accès complet
  return sendFullFile(res);
});
```

---

## Résumé des fichiers modifiés

- ✅ `/config/purchase.config.js` - Configuration des achats
- ✅ `/services/emailService.js` - Service d'envoi d'emails
- ✅ `/server.js` - Routes et webhook améliorés

## Commandes utiles

```bash
# Tester l'envoi d'email
npm install nodemailer

# Tester Stripe localement
npm install -g stripe
stripe listen --forward-to localhost:3000/webhook

# Vérifier les logs
tail -f server.log | grep email
tail -f server.log | grep webhook
```

---

## Notes de sécurité

⚠️ **Important:**
- Ne jamais exposer les clés Stripe secrètes en frontend
- Vérifier la signature des webhooks toujours
- Utiliser HTTPS en production
- Valider les licences côté serveur, pas client
- Chiffrer les données sensibles en base

---

## Prochaines étapes optionnelles

- [ ] Portail client Stripe (gérer abonnement)
- [ ] Factures PDF automatiques
- [ ] Rappels de renouvellement par email
- [ ] Dashboard d'administration des achats
- [ ] Système de refund automatique
- [ ] Support de multiples devises
- [ ] Coupons de réduction
