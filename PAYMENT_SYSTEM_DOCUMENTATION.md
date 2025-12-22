# 🎯 Système de Paiement & Livraison de Licence - DOCUMENTATION

## Vue d'ensemble

Le système complet permet à un utilisateur d'acheter directement depuis le site vitrine ou le dashboard, de recevoir automatiquement ses identifiants et sa licence par email, et d'accéder immédiatement au service avec les mêmes identifiants partout.

## 🔄 Flux d'achat complet

### 1. **Sur le site vitrine (pricing.html)**

```
Utilisateur visite /pricing.html
           ↓
Clique sur "Payer l'abonnement" (29€/mois) ou "Acheter la licence" (499€)
           ↓
Modal d'enregistrement s'affiche
           ↓
Remplit: Username + Email + Password
           ↓
Clique "Continuer vers le paiement"
           ↓
Stripe Checkout ouvert avec:
  - Données utilisateur dans les métadonnées
  - Email pré-rempli dans le formulaire Stripe
```

### 2. **Paiement Stripe**

```
Modal disparaît
           ↓
Utilisateur arrive sur Stripe Checkout
           ↓
Paiement effectué
           ↓
Stripe envoie webhook: checkout.session.completed
```

### 3. **Création de l'utilisateur (automatique via webhook)**

```
Webhook reçu par /webhook endpoint
           ↓
Extraction des données de checkout.session:
  - username (depuis metadata)
  - email (depuis metadata)
  - passwordHash (depuis metadata)
  - customer_email (Stripe field)
  
           ↓
Vérification si utilisateur existe
           ↓
Si n'existe pas → Créer l'utilisateur avec:
  ✓ Username = identifiant partout
  ✓ Email = notifications + récupération compte
  ✓ Password = hashé en sécurité (bcrypt)
  ✓ Role = 'user'
  ✓ Demo 7 jours = automatiquement activé
           ↓
Utilisateur sauvegardé dans users.json
```

### 4. **Envoi des emails (automatique)**

```
Email 1: CREDENTIALS EMAIL (🔐 Vos identifiants)
├─ À: {user.email}
├─ Objet: "🔐 Vos identifiants VHR Dashboard - Connexion sécurisée"
├─ Contenu:
│  ├─ Username: {username}
│  ├─ Email: {email}
│  └─ Password: {plainPassword}
└─ Envoyé immédiatement après création utilisateur

           ↓

Email 2: PURCHASE/SUBSCRIPTION EMAIL (✅ Votre licence)
├─ À: {user.email}
├─ Objet: "✅ Votre licence VHR Dashboard est activée" (ou abonnement)
├─ Contenu:
│  ├─ Clé de licence unique (VHR-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX)
│  ├─ Détails du paiement (montant, commande)
│  ├─ Instructions d'utilisation
│  └─ Lien de téléchargement
└─ Envoyé après traitement du paiement
```

## 📊 Données stockées

### Utilisateur créé dans `data/users.json`:
```json
{
  "id": "uuid-xxx",
  "username": "mon_username",
  "email": "user@example.com",
  "passwordHash": "bcrypt_hashed_password",
  "role": "user",
  "stripeCustomerId": "cus_xxx",
  "createdAt": "2025-12-07T...",
  "demoStartDate": "2025-12-07T...",
  "demoExpiresAt": "2025-12-14T...",
  "licenseKey": "VHR-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX",
  "licenseGeneratedAt": "2025-12-07T...",
  "licenseType": "perpetual",
  "licensePurchaseId": "perpetual_pro",
  "licensePurchaseAmount": "499.00",
  "subscriptionStatus": "active",
  "subscriptionId": "sub_xxx"
}
```

## 🔐 Sécurité

1. **Password hashing**: Utilise bcrypt avec salting
2. **Email séparé**: Mot de passe dans un email séparé pour sécurité maximale
3. **Métadonnées Stripe**: Stockées de manière sécurisée dans la session
4. **JWT tokens**: Pour l'authentification session
5. **HttpOnly cookies**: Les tokens sont non-accessibles au JavaScript

## 🎯 Cas d'usage

### Cas 1: Achat licence perpétuelle (499€) depuis site vitrine
```
Résultat:
- ✓ Utilisateur créé automatiquement
- ✓ Email des identifiants reçu
- ✓ Email de licence reçu
- ✓ Accès immédiat avec identifiants
- ✓ Clé de licence unique générée
- ✓ Accès perpétuel sans limite
```

### Cas 2: Abonnement mensuel (29€) depuis site vitrine
```
Résultat:
- ✓ Utilisateur créé automatiquement
- ✓ Email des identifiants reçu
- ✓ Email d'abonnement reçu
- ✓ Accès immédiat
- ✓ Renouvellement automatique chaque mois
- ✓ Annulable à tout moment
```

### Cas 3: Utilisateur existant achète depuis dashboard
```
Résultat:
- ✓ Utilisateur trouvé par email
- ✓ Subscription activée dans le compte existant
- ✓ Email de confirmation reçu
- ✓ Pas de duplication de compte
```

## 📧 Contenu des emails

### Email 1: Identifiants (envoyé immédiatement)
```
Objet: 🔐 Vos identifiants VHR Dashboard - Connexion sécurisée

Contenu:
- Avertissement: Les identifiants sont envoyés séparément pour sécurité
- Username: [mon_username]
- Email: [user@example.com]
- Password: [le_mot_de_passe]
- Instructions de connexion
- Lien vers le dashboard
- Avertissement de sécurité
```

### Email 2: Licence (envoyé après paiement)
```
Objet: ✅ Votre licence VHR Dashboard est activée

Contenu:
- Confirmation de l'achat
- Détails du paiement (montant, commande, plan)
- Identifiants utilisateur (username/email)
- Clé de licence unique: VHR-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
- Durée de la licence (Perpétuel ou mensuel)
- Instructions étape par étape pour utiliser la licence
- Fonctionnalités incluses
- Liens vers documentation et support
```

## 🚀 Routes & Endpoints

### Frontend
- **POST** `/create-checkout-session`
  - Body: `{ priceId, mode, username, userEmail, password }`
  - Retour: `{ url }` (URL Stripe Checkout)

### Backend
- **POST** `/webhook`
  - Événement: `checkout.session.completed`
  - Traitement: Crée utilisateur + envoie emails

- **GET** `/api/me`
  - Retour: Utilisateur authentifié (JWT requis)

- **GET** `/api/demo/status`
  - Retour: Statut trial + subscription

## 📝 Configuration required

### .env
```
EMAIL_ENABLED=true
BREVO_SMTP_USER=9d4018001@smtp-brevo.com
BREVO_SMTP_PASS=6E37aw1L4An2XcSZ
EMAIL_FROM=noreply@vhr-dashboard-site.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_STANDARD=price_1SWhBW7g8FcyfmlJZ5rJGh6N
STRIPE_PRICE_ID_PERPETUAL=price_1SWhPb7g8FcyfmlJzlquRicj
```

## ✅ Validation du système

Tous les tests passent ✓:
- [x] Utilisateur crée compte via modal
- [x] Données passées à Stripe en métadonnées
- [x] Webhook reçoit checkout.session.completed
- [x] Utilisateur créé automatiquement
- [x] Email des identifiants envoyé
- [x] Email de licence envoyé
- [x] Identifiants utilisables partout
- [x] Même username/password/email partout

## 🔍 Tester le système

```bash
# Test complet du flux d'achat
node test-complete-checkout.js

# Test envoi emails
node test-email-sending.js

# Voir les emails reçus
# Vérifiez: regatpeter@hotmail.fr (boîte réception + spam)
```

## 📦 Fichiers modifiés

1. **public/js/pricing-stripe.js**
   - Ajout du modal d'enregistrement
   - Capture username/email/password
   - Passage des données à /create-checkout-session

2. **server.js**
   - `/create-checkout-session`: Stocke user data en métadonnées
   - `/webhook`: Crée utilisateur automatiquement
   - Webhook: Envoie emails de credentials et licence

3. **services/emailService.js**
   - Nouvelle fonction: `sendCredentialsEmail()`
   - Mise à jour: `sendPurchaseSuccessEmail()` avec identifiants
   - Template: Credentials email avec design professionnel

## 🎁 Résultat final

✅ **Expérience utilisateur:**
- Enregistrement + paiement en 3 clics depuis le site vitrine
- Reçoit immédiatement ses identifiants ET sa licence
- Peut se connecter tout de suite avec username/password
- Mêmes identifiants partout (dashboard, site, etc.)
- Email de support rapide en cas de problème

✅ **Avantages commerciaux:**
- Conversion automatique sans friction
- Email de bienvenue + licence immédiatement
- Réduction des demandes de support
- Traçabilité complète des ventes
- Renouvellement automatique des abonnements

---

**Date**: 2025-12-07
**Status**: ✅ Production Ready
**Version**: 1.0.0
