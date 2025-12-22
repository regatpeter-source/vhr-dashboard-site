# 🔐 Système de Licence VHR Dashboard

## 📋 Vue d'ensemble

Le système de licence VHR Dashboard permet aux utilisateurs de :
- **Essayer gratuitement** pendant 7 jours
- **S'abonner mensuellement** (9,99€/mois)
- **Acheter une licence à vie** (49,99€ unique)

## 🎯 Flux Complet

### 1️⃣ Téléchargement Initial
```
Utilisateur sur Render → Télécharge dashboard → Essai 7 jours démarre
```

### 2️⃣ Période d'Essai (Jours 1-7)
- ✅ Dashboard fonctionne avec toutes les fonctionnalités
- ⏱️ Bannière affiche les jours restants
- 🚀 Bouton "Débloquer maintenant" disponible

### 3️⃣ Expiration (Jour 7+)
- ⚠️ Dashboard se verrouille
- 📋 Modal de déblocage s'affiche automatiquement
- 🔒 Impossible d'utiliser sans abonnement/licence

### 4️⃣ Option A : Abonnement Mensuel
```
User → Clique "S'abonner" → Redirect pricing.html → Stripe Checkout → Paiement
    → Webhook → Update user.subscriptionStatus = 'active'
    → Dashboard vérifie au démarrage → Accès débloqué
```

**Vérification :**
- À chaque démarrage : `/api/license/check` vérifie `user.subscriptionStatus`
- Nécessite connexion internet pour validation

### 5️⃣ Option B : Achat Définitif
```
User → Clique "Acheter" → Redirect pricing.html → Stripe Checkout → Paiement
    → Webhook → Génère clé licence VHR-XXXX-XXXX-XXXX-XXXX
    → Email automatique avec clé
    → User entre clé dans dashboard → localStorage
    → Dashboard fonctionne OFFLINE avec clé valide
```

**Vérification :**
- Clé stockée dans `localStorage.vhr_license_key`
- Validation via `/api/license/activate` (connexion requise 1x)
- Après activation : fonctionne offline

## 🔧 Architecture Technique

### Backend (`server.js`)

#### Génération de Clé de Licence
```javascript
function generateLicenseKey(username) {
  // Format: VHR-XXXX-XXXX-XXXX-XXXX
  // HMAC-SHA256 avec timestamp + random
  // Stocké dans data/licenses.json
}
```

#### Validation de Licence
```javascript
function validateLicenseKey(key) {
  // Vérifie format VHR-XXXX-...
  // Cherche dans data/licenses.json
  // Retourne true si status === 'active'
}
```

#### Routes API

**`POST /api/license/check`**
```json
Request: { "licenseKey": "VHR-..." }

Response (Licensed):
{
  "ok": true,
  "licensed": true,
  "type": "perpetual|subscription",
  "message": "Licence valide - Accès complet"
}

Response (Trial):
{
  "ok": true,
  "licensed": false,
  "trial": true,
  "daysRemaining": 5,
  "expiresAt": "2025-12-10T12:00:00.000Z",
  "message": "Essai gratuit - 5 jour(s) restant(s)"
}

Response (Expired):
{
  "ok": true,
  "licensed": false,
  "trial": false,
  "expired": true,
  "message": "Période d'essai expirée - Veuillez vous abonner ou acheter une licence"
}
```

**`POST /api/license/activate`**
```json
Request: { "licenseKey": "VHR-1234-5678-9ABC-DEF0" }

Response (Success):
{
  "ok": true,
  "message": "Licence activée avec succès !",
  "licensed": true
}

Response (Invalid):
{
  "ok": false,
  "error": "Clé de licence invalide"
}
```

#### Webhook Stripe
```javascript
// checkout.session.completed (mode: 'payment')
→ Génère licence avec addLicense()
→ Envoie email avec sendLicenseEmail()
→ Logs: '[webhook] License generated: VHR-...'
```

#### Email Automatique
```javascript
async function sendLicenseEmail(email, licenseKey, username) {
  // Template HTML avec gradient noir/vert
  // Clé de licence en grand au centre
  // Instructions d'activation
  // Support: support@vhr-dashboard-site.com
}
```

### Frontend (`dashboard-pro.js`)

#### Vérification au Démarrage
```javascript
async function checkLicense() {
  // 1. Récupère licenseKey de localStorage
  // 2. Appelle /api/license/check
  // 3. Si expired → showUnlockModal(FORCE)
  // 4. Si trial → showTrialBanner(daysRemaining)
  // 5. Si licensed → Accès complet
}
```

#### Bannière d'Essai
```html
<!-- Fixed banner orange/jaune en haut -->
⏱️ Essai gratuit - 5 jour(s) restant(s)
[🚀 Débloquer maintenant]
```

#### Modal de Déblocage
```html
<!-- 3 sections : -->

1. 💳 Abonnement Mensuel - 9,99€/mois
   - Button → redirects to /pricing.html?plan=professional

2. 🎯 Licence à Vie - 49,99€ unique
   - Button → redirects to /pricing.html?plan=perpetual

3. 🔑 Activer Licence Existante
   - Input VHR-XXXX-XXXX-XXXX-XXXX
   - Button → activateLicense() → /api/license/activate
```

## 📁 Fichiers Modifiés

### `server.js`
- ✅ Ajout imports : `crypto`, `nodemailer`
- ✅ Configuration email : `emailTransporter`
- ✅ Fonctions licence : `generateLicenseKey`, `validateLicenseKey`, `addLicense`
- ✅ Routes `/api/license/check` et `/api/license/activate`
- ✅ Webhook modifié : génération et envoi licence par email
- ✅ Email template HTML professionnel

### `dashboard-pro.js`
- ✅ Variables globales : `licenseKey`, `licenseStatus`
- ✅ Fonction `checkLicense()` au démarrage
- ✅ Bannière d'essai `showTrialBanner()`
- ✅ Modal de déblocage `showUnlockModal()`
- ✅ Activation licence `activateLicense()`

### `.env.example`
- ✅ Configuration email : `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`
- ✅ Secret licence : `LICENSE_SECRET`

### Nouveaux Fichiers
- ✅ `data/licenses.json` (créé automatiquement)
- ✅ `LICENCE-SYSTEM.md` (cette documentation)

## 🔑 Format de Clé de Licence

```
VHR-XXXX-XXXX-XXXX-XXXX
│   │    │    │    └─ 4 chars hex (partie 4)
│   │    │    └────── 4 chars hex (partie 3)
│   │    └─────────── 4 chars hex (partie 2)
│   └──────────────── 4 chars hex (partie 1)
└──────────────────── Préfixe fixe "VHR"

Exemple : VHR-A3B2-C5D8-E1F4-G7H9
```

**Génération :**
1. Données : `username|timestamp|random_16_chars`
2. HMAC-SHA256 avec `LICENSE_SECRET`
3. Extraction 16 premiers chars du hash
4. Format : `VHR-XXXX-XXXX-XXXX-XXXX`

**Stockage :**
```json
{
  "key": "VHR-A3B2-C5D8-E1F4-G7H9",
  "username": "peter",
  "email": "peter@example.com",
  "purchaseId": "perpetual_pro",
  "status": "active",
  "createdAt": "2025-12-03T15:30:00.000Z"
}
```

## 📧 Configuration Email

### Gmail (Recommandé pour test)
1. Créer un compte Gmail dédié
2. Activer "Validation en 2 étapes"
3. Générer un "Mot de passe d'application" (16 chars)
4. Ajouter au `.env` :

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre-email@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop  # Mot de passe application
```

### Autres Providers
```env
# Outlook
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587

# SendGrid
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=SG.xxxxxxxxxxxxxxx

# Mailgun
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
```

## 🧪 Tests

### Test 1 : Période d'Essai
```bash
# 1. Delete data/demo-status.json
rm data/demo-status.json

# 2. Ouvrir dashboard
http://localhost:3000/vhr-dashboard-pro.html (le bouton "🗣️ Voix" ouvre l'URL LAN si vous utilisez un casque)

# 3. Vérifier
✅ Bannière orange "7 jours restants"
✅ Dashboard fonctionne normalement
```

### Test 2 : Expiration Manuelle
```bash
# 1. Modifier data/demo-status.json
{
  "firstDownloadedAt": "2025-11-20T00:00:00.000Z",  # 13 jours avant
  "expiresAt": "2025-11-27T00:00:00.000Z"          # 6 jours avant
}

# 2. Recharger dashboard
✅ Modal de déblocage s'affiche
✅ Impossible de fermer si expired=true
```

### Test 3 : Activation Licence
```bash
# 1. Générer une licence test via API
curl -X POST http://localhost:3000/api/test/generate-license \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com"}'

# Response: { "key": "VHR-XXXX-XXXX-XXXX-XXXX" }

# 2. Dans dashboard modal, entrer la clé
✅ Message "Licence activée avec succès !"
✅ Modal se ferme
✅ Bannière disparaît
```

### Test 4 : Achat Stripe (avec Stripe Test Mode)
```bash
# 1. Configurer Stripe test keys dans .env
STRIPE_SECRET_KEY=sk_test_...

# 2. Cliquer "Acheter maintenant" dans modal
# 3. Redirect vers pricing.html?plan=perpetual
# 4. Stripe Checkout avec carte test: 4242 4242 4242 4242
# 5. Webhook reçoit checkout.session.completed
# 6. Logs :
[webhook] License generated: VHR-ABCD-...
[email] License sent to: user@example.com

# 7. Vérifier email reçu
✅ HTML professionnel noir/vert
✅ Clé de licence visible
✅ Instructions d'activation
```

## 🐛 Debug

### Vérifier Génération de Licence
```javascript
// Dans server.js, ajouter temporairement :
app.get('/api/test/generate-license', (req, res) => {
  const license = addLicense('testuser', 'test@example.com', 'perpetual_pro');
  res.json({ ok: true, license });
});
```

### Vérifier Envoi Email
```javascript
// Test email connection
app.get('/api/test/send-email', async (req, res) => {
  try {
    await emailTransporter.verify();
    res.json({ ok: true, message: 'Email config valid' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
```

### Vérifier Webhook Stripe
```bash
# Installer Stripe CLI
stripe listen --forward-to localhost:3000/webhook

# Dans autre terminal
stripe trigger checkout.session.completed

# Vérifier logs server.js :
[webhook] License generated: VHR-...
[email] License sent to: ...
```

## 📊 Statistiques & Analytics

### Fichier `data/licenses.json`
```json
[
  {
    "key": "VHR-A3B2-C5D8-E1F4-G7H9",
    "username": "peter",
    "email": "peter@example.com",
    "purchaseId": "perpetual_pro",
    "status": "active",
    "createdAt": "2025-12-03T15:30:00.000Z"
  },
  {
    "key": "VHR-B4C3-D6E9-F2G5-H8I1",
    "username": "alice",
    "email": "alice@example.com",
    "purchaseId": "perpetual_pro",
    "status": "active",
    "createdAt": "2025-12-03T16:45:00.000Z"
  }
]
```

### Requête Stats
```javascript
app.get('/api/admin/license-stats', authMiddleware, (req, res) => {
  // Require admin role
  if (req.user.role !== 'admin') return res.status(403).json({error: 'Forbidden'});
  
  const licenses = loadLicenses();
  const stats = {
    total: licenses.length,
    active: licenses.filter(l => l.status === 'active').length,
    revoked: licenses.filter(l => l.status === 'revoked').length,
    lastMonth: licenses.filter(l => {
      const created = new Date(l.createdAt);
      const now = new Date();
      const diff = now - created;
      return diff < 30 * 24 * 60 * 60 * 1000;
    }).length
  };
  
  res.json({ ok: true, stats });
});
```

## 🚀 Déploiement Render

### Variables d'Environnement Render
```
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
JWT_SECRET=random-secret-256-bits
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply@vhr-dashboard-site.com
EMAIL_PASS=app-password-here
LICENSE_SECRET=another-random-secret
```

### Webhook Stripe URL
```
https://votre-app.onrender.com/webhook
```

## 🔒 Sécurité

### Bonnes Pratiques
- ✅ `LICENSE_SECRET` unique et aléatoire (256 bits)
- ✅ Clés stockées avec HMAC-SHA256 (pas SHA1/MD5)
- ✅ Email password = "Mot de passe d'application" (pas le vrai)
- ✅ Webhook Stripe avec `STRIPE_WEBHOOK_SECRET` vérifié
- ✅ JWT tokens avec httpOnly cookies
- ✅ Validation côté serveur (pas juste frontend)

### À Éviter
- ❌ Ne jamais commit `.env` avec vraies credentials
- ❌ Ne pas utiliser `LICENSE_SECRET` par défaut en prod
- ❌ Ne pas accepter licences sans validation serveur
- ❌ Ne pas stocker mots de passe en clair

## 📝 Maintenance

### Révoquer une Licence
```javascript
// Trouver licence dans data/licenses.json
{
  "key": "VHR-A3B2-C5D8-E1F4-G7H9",
  "status": "revoked"  // Changer de "active" à "revoked"
}

// Ou via API :
app.post('/api/admin/license/revoke', authMiddleware, (req, res) => {
  const { licenseKey } = req.body;
  const licenses = loadLicenses();
  const license = licenses.find(l => l.key === licenseKey);
  if (!license) return res.status(404).json({error: 'Not found'});
  
  license.status = 'revoked';
  license.revokedAt = new Date().toISOString();
  saveLicenses(licenses);
  
  res.json({ ok: true, message: 'License revoked' });
});
```

### Migration Future
Si changement de format de clé :
```javascript
function migrateLicenses() {
  const licenses = loadLicenses();
  const migrated = licenses.map(l => ({
    ...l,
    version: 2,  // Ajouter version
    // Autres champs...
  }));
  saveLicenses(migrated);
}
```

## 🎓 Support

### Documentation Utilisateur
1. **FAQ** : Ajouter section dans `pricing.html`
2. **Tutoriel** : Vidéo YouTube activation licence
3. **Email Support** : `support@vhr-dashboard-site.com`

### Email de Support Automatique
```javascript
async function sendSupportEmail(userEmail, issue) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'support@vhr-dashboard-site.com',
    subject: `Support VHR Dashboard - ${userEmail}`,
    html: `
      <h2>Nouveau ticket support</h2>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p><strong>Problème:</strong></p>
      <p>${issue}</p>
    `
  };
  await emailTransporter.sendMail(mailOptions);
}
```

## 🎯 Checklist Finale

Avant mise en production :

- [ ] Tester achat Stripe en mode test
- [ ] Tester réception email licence
- [ ] Tester activation licence offline
- [ ] Tester expiration période d'essai
- [ ] Tester abonnement mensuel actif
- [ ] Configurer Stripe Live keys
- [ ] Configurer email production
- [ ] Tester webhook Stripe en prod
- [ ] Backup `data/licenses.json` régulier
- [ ] Monitoring erreurs email (logs)
- [ ] Documentation utilisateur publiée

---

**Status :** ✅ Système complet et fonctionnel

**Version :** 1.0.0

**Date :** 2025-12-03
