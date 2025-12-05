# ⚠️ CRITICAL ASSETS - Ne pas supprimer

Ce fichier liste tous les éléments **essentiels** au fonctionnement du site. Avant d'effectuer un nettoyage massif, consulter cette liste.

## 🛠️ Scripts essentiels

### Backend (server.js)
- `/download/launch-script` - Route de téléchargement du launcher Windows
- `/create-checkout-session` - Route Stripe pour créer les sessions de paiement
- `/webhook` - Webhook Stripe pour confirmer les paiements
- `/api/subscriptions/*` - Routes de gestion des abonnements
- Toutes les routes d'authentification (`/auth/*`)

### Frontend (JavaScript)
- `public/js/pricing-stripe.js` - **CRITIQUE** - Gère TOUS les clics de paiement Stripe
  - JAMAIS ajouter de listeners concurrents dans `script.js`
  - JAMAIS faire de `event.preventDefault()` ou redirection avant Stripe
- `public/script.js` - Initialisation générale du site
- `public/js/botpress-config.js` - Chat widget
- Tous les fichiers d'authentification dans `public/js/`

## 🎨 Fichiers HTML critiques

### Pages principales
- `index.html` / `site-vitrine/index.html` - Page d'accueil
- `pricing.html` / `site-vitrine/pricing.html` - **CRITIQUE** - Doit avoir les boutons Stripe avec:
  - `data-price-id` (attribut)
  - `data-mode` (subscription ou payment)
  - Classes reconnues par `pricing-stripe.js`
- `account.html` - Gestion de compte
- `features.html` - Liste des fonctionnalités
- `contact.html` - Formulaire de contact
- `launch-dashboard.html` - Launcher 1-clic

## 📁 Fichiers de configuration

- `.env` - Variables d'environnement Stripe, Brevo, JWT
- `config/purchase.config.js` - Configuration des achats avec stripePriceId
- `config/subscription.config.js` - Configuration des abonnements avec stripePriceId
- `config/demo.config.js` - Configuration de la démo (si utilisée)

## 🔐 Routes Stripe (JAMAIS supprimer)

```
GET  /download/launch-script        - Télécharge le launcher Windows
POST /create-checkout-session       - Crée session Stripe
POST /webhook                       - Webhook Stripe (paiements)
GET  /api/subscriptions/plans       - Liste les plans
POST /api/subscriptions/create      - Crée un abonnement
GET  /api/account/billing           - Récupère le statut de facturation
```

## 📦 Scripts critiques

- `scripts/start-local-server.bat` - Wrapper batch du launcher
- `scripts/launch-dashboard.ps1` - Script PowerShell du launcher (appelé par .bat)

## ✅ Checklist avant cleanup

Avant de nettoyer des fichiers, vérifier:

- [ ] Les routes server.js pour `/download`, `/create-checkout-session`, `/webhook` existent toujours
- [ ] Les price IDs Stripe dans `pricing.html` correspondent à `.env`
- [ ] Les boutons Stripe ont `data-price-id` et `data-mode`
- [ ] `pricing-stripe.js` est présent et n'a pas d'event listeners concurrents
- [ ] Aucun `handleSubscriptionClick` dans `script.js` qui ferait redirection
- [ ] `launch-dashboard.html` et son endpoint `/download/launch-script` fonctionnent
- [ ] Le fichier `.bat` existe dans `/scripts/`
- [ ] Brevo SMTP est configuré dans `.env` et fonctionnel

## 🚨 Erreurs récentes et solutions

### "Price not found: price_1Qe..."
- Cause: Price IDs placeholders dans les boutons
- Solution: Utiliser les vrais IDs de `.env`

### "Paiement redirige vers account.html"
- Cause: `handleSubscriptionClick` ajoute des listeners conflictuels
- Solution: Laisser SEULEMENT `pricing-stripe.js` gérer les boutons Stripe

### "Lancer en 1 clic ne fonctionne pas"
- Cause: Fichier `/scripts/start-local-server.bat` manquant
- Solution: Recréer le fichier batch

### "Route /download/launch-script 404"
- Cause: Route supprimée du server.js
- Solution: Vérifier que la route existe et le fichier `.bat` aussi

## 📝 Notes importantes

1. **Stripe est fragile**: Chaque changement sur les boutons peut casser les paiements
2. **Deux systèmes cohabitent**: `pricing-stripe.js` (externe) vs `script.js` (local)
   - Les event listeners concurrents = DÉSASTRE
3. **Prix IDs changent par mode**: 
   - `price_1SWhBW...` = Abonnement (subscription)
   - `price_1SWhPb...` = Achat définitif (payment)
4. **Le launcher télécharge un fichier .bat**: Sans le fichier sur disque, le lien 404

---

**Mis à jour**: 6 décembre 2025
**Dernière cause d'incident**: Nettoyage de fichiers demo trop agressif + suppression route demo API

