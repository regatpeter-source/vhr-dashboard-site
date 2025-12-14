# 👨‍💼 VHR Pro - Guide Administrateur: Protection des Téléchargements

## 🎯 Objectif

Protéger l'accès au bouton "🚀 Voix vers Casque" (téléchargement d'APK) avec:
1. **Authentification obligatoire** - L'utilisateur doit être connecté
2. **Vérification de licence** - Essai actif OU abonnement Stripe
3. **Logs d'audit** - Traçabilité de tous les téléchargements

---

## 🔧 Configuration Technique

### Routes Protégées Ajoutées

#### 1. POST `/api/download/vhr-app`
Télécharge l'APK ou les données vocales avec vérification complète.

**Authentification:** Middleware `authMiddleware`  
**Vérification:** Essai expiré? Vérifier Stripe subscription  
**Réponse:** Fichier (200) ou Erreur (403/404)

#### 2. GET `/api/download/check-eligibility`
Vérifie l'éligibilité SANS télécharger.

**Usage:** Afficher/Masquer les boutons selon l'accès  
**Réponse:** JSON avec statut détaillé

### Modifications au Dashboard

**Fichier:** `public/dashboard-pro.js`

**Fonction modifiée:** `showInstallerPanel()`
```javascript
// AVANT: Ouvrait le panneau directement
window.showInstallerPanel = function() { ... }

// APRÈS: Vérifie d'abord l'authentification et la licence
window.showInstallerPanel = async function() {
  if (!currentUser) { ... }  // Authentification
  const eligibility = await fetch('/api/download/check-eligibility')  // Licence
  if (!eligibility.canDownload) { ... }  // Accès refusé
  // Sinon: Ouvrir le panneau
}
```

**Fonctions ajoutées:**
- `downloadVHRApp(type)` - Télécharger un fichier protégé
- `addDownloadSection()` - Afficher les boutons de téléchargement

---

## 📊 Flux de Décision

```
Utilisateur clique sur "🚀 Voix vers Casque"
    ↓
[Vérifier: currentUser existe?]
    ├─ NON → ❌ "Veuillez vous connecter" → Redirection login
    └─ OUI ↓
[Vérifier: essai actif?]
    ├─ OUI → ✅ Ouvrir panneau installer
    └─ NON ↓
[Vérifier: abonnement Stripe actif?]
    ├─ OUI → ✅ Ouvrir panneau installer
    └─ NON → ❌ "Essai expiré, abonnement requis" → Redirection pricing
```

---

## 🛠️ Maintenance et Monitoring

### Vérifier les Logs d'Audit

Tous les téléchargements sont loggés côté serveur:

```bash
# Sur Render.com
# Aller à: Settings → Logs

# Pattern à chercher:
[download] User USERNAME downloading TYPE
[check-eligibility] User USERNAME can download (REASON)
[download/vhr-app] Access denied for USERNAME (REASON)
```

### Exemple de Logs

```log
2025-12-14T10:45:23.123Z [download] User john_dev downloading apk
2025-12-14T10:45:24.456Z [check-eligibility] User alice_test can download (demo active - 8 days remaining)
2025-12-14T10:45:45.789Z [download/vhr-app] Access denied for bob_user (no valid subscription)
```

### Interprétation

| Log | Signification | Action |
|-----|---------------|--------|
| `downloading apk` | ✅ Téléchargement réussi | Audit OK |
| `can download (demo active)` | ✅ Essai en cours | Normal |
| `can download (subscription)` | ✅ Abonnement actif | Normal |
| `Access denied (no valid subscription)` | ❌ Essai expiré + pas d'abo | L'utilisateur a besoin de s'abonner |
| `File not found` | ⚠️ APK manquante | Regénérer l'APK |

---

## 🚨 Dépannage

### Problème 1: "APK file not found"

**Symptôme:** Les utilisateurs reçoivent une erreur 404

**Cause:** L'APK compilée n'existe pas à `dist/demo/vhr-dashboard-demo.apk`

**Solution:**
```bash
# Générer l'APK via GitHub Actions:
1. Aller à: https://github.com/YOUR_REPO/actions
2. Cliquer sur "Build & Release Android APK"
3. Cliquer sur "Run workflow"
4. Attendre 10-15 minutes
5. Vérifier que l'APK est créée dans "Releases"

# OU via Docker Compose:
docker-compose up apk-builder
# L'APK sera générée dans: tts-receiver-app/build/outputs/apk/debug/app-debug.apk
```

### Problème 2: "Accès denied même avec abonnement actif"

**Symptôme:** Un utilisateur avec abonnement reçoit 403

**Cause:** La vérification Stripe échoue (API key manquante, timeout, etc.)

**Solution:**
```bash
# Vérifier les variables d'environnement:
echo $STRIPE_SECRET_KEY  # Doit être défini

# Vérifier la clé API:
curl -H "Authorization: Bearer $STRIPE_SECRET_KEY" \
  https://api.stripe.com/v1/subscriptions

# Vérifier les logs:
# Settings → Logs → Chercher "Stripe check error"
```

### Problème 3: Les boutons de téléchargement ne s'affichent pas

**Symptôme:** Pas de section "📥 Télécharger l'Application"

**Cause:** `addDownloadSection()` ne s'exécute pas

**Solution:**
```javascript
// Vérifier dans la console navigateur:
console.log(window.addDownloadSection);  // Doit exister

// Vérifier que le panneau s'ouvre:
document.getElementById('adminInstallerContainer');  // Doit exister

// Forcer un rechargement:
localStorage.clear();
location.reload();
```

---

## 📈 Statistiques et Analytics

### Données à Tracker

```javascript
// À ajouter pour l'analytics:
{
  "downloadAttempts": {
    "total": 150,
    "successful": 140,
    "denied": 10  // Essai expiré sans abo
  },
  "users": {
    "authenticated": 142,
    "demo_active": 125,
    "subscription_active": 17,
    "expired_no_subscription": 10
  },
  "fileTypes": {
    "apk": 135,
    "voice_data": 5
  }
}
```

### Requête SQL (si utilisant une BD)

```sql
-- Téléchargements par utilisateur
SELECT username, COUNT(*) as downloads, MAX(created_at) as last_download
FROM download_logs
GROUP BY username
ORDER BY downloads DESC;

-- Démographique des utilisateurs
SELECT 
  COUNT(CASE WHEN demo_active THEN 1 END) as demo_users,
  COUNT(CASE WHEN subscription_active THEN 1 END) as paying_users,
  COUNT(CASE WHEN NOT demo_active AND NOT subscription_active THEN 1 END) as blocked
FROM users;
```

---

## 🔒 Sécurité: Checklist

- ✅ Authentification: `authMiddleware` requis
- ✅ Autorisation: Vérification Stripe en temps réel
- ✅ CSRF Protection: Cookies de session validés
- ✅ Audit: Tous les téléchargements loggés
- ✅ Rate Limiting: Ajouter si nécessaire (voir ci-dessous)
- ✅ File Validation: Vérifier que le fichier existe avant envoi

### Ajouter Rate Limiting (Optionnel)

```javascript
// Dans server.js
const rateLimit = require('express-rate-limit');

const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // Max 5 téléchargements par 15 min
  message: 'Too many downloads, please try again later',
  standardHeaders: true
});

// Appliquer à la route
app.post('/api/download/vhr-app', downloadLimiter, authMiddleware, async (req, res) => {
  // ...
});
```

---

## 📋 Mise à Jour et Maintenance

### Mise à Jour de l'APK

Quand vous recompilez l'APK:

```bash
# 1. Remplacer le fichier
cp tts-receiver-app/build/outputs/apk/debug/app-debug.apk \
   dist/demo/vhr-dashboard-demo.apk

# 2. Committer
git add dist/demo/vhr-dashboard-demo.apk
git commit -m "chore: Update APK version X.Y.Z"

# 3. Pousser
git push origin main

# 4. Redéployer sur Render (automatique si CD activé)
```

### Mise à Jour des Règles d'Accès

Si vous voulez changer la logique (ex: exiger abonnement dès le départ):

```javascript
// Dans server.js, modifier la vérification:

// AVANT: Laisser essai gratuit
const demoExpired = isDemoExpired(user);
let hasValidSubscription = false;
if (demoExpired && user.stripeCustomerId) { ... }

// APRÈS: Exiger abonnement immédiatement
let hasValidSubscription = false;
if (user.stripeCustomerId) {
  const subs = await stripe.subscriptions.list({ customer: user.stripeCustomerId });
  hasValidSubscription = subs.data.length > 0;
}

if (!hasValidSubscription) {
  return res.status(403).json({ 
    error: 'Subscription required - no trial available' 
  });
}
```

---

## 🎓 Formation pour les Utilisateurs

### Email à Envoyer aux Utilisateurs

```
Subject: 🔐 VHR Dashboard Pro - Téléchargement d'APK Sécurisé

Bonjour [User],

Nous avons sécurisé l'accès au téléchargement d'APK de VHR Dashboard Pro.

✅ NOUVEAU PROCESSUS:

1. Connectez-vous au Dashboard Pro
2. Cliquez sur "🚀 Voix vers Casque"
3. Si vous êtes en essai → Le fichier s'affiche
4. Si l'essai a expiré → Cliquez sur "S'abonner" pour continuer

📝 IMPORTANT:
- Vous devez être authentifié pour télécharger
- L'essai dure 14 jours
- Après l'essai → Abonnement requis pour continuer

❓ Questions?
- Visitez: https://votre-site.com/pricing
- Contactez: support@votre-email.com

Cordialement,
L'équipe VHR
```

---

## 🚀 Déploiement Checklist

- ✅ Code pushé vers GitHub
- ✅ Routes protégées implémentées
- ✅ Dashboard-pro.js modifié
- ✅ Tests manuels complétés
- 🔄 Rendu redéployé (attendre 2-3 min)
- 🔄 Vérifier les logs en temps réel
- 🔄 Communiquer les changements aux utilisateurs

---

## 📚 Ressources

- **Stripe API:** https://stripe.com/docs/api/subscriptions
- **Express Rate Limit:** https://github.com/nfriedly/express-rate-limit
- **Authentication Best Practices:** https://owasp.org/www-community/attacks/

---

**Date de déploiement:** 2025-12-14  
**Responsable:** [Your Name]  
**Support:** [Support Email]
