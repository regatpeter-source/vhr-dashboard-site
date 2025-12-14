# 🧪 GUIDE PRATIQUE: Tester la Protection du Téléchargement

## 🎯 Objectif

Vérifier que le bouton "🚀 Voix vers Casque" fonctionne correctement avec la protection d'authentification et de licence.

---

## 🚀 Avant de Tester

### Prérequis

1. **Accès au dashboard PRO:**
   ```
   https://votre-app.onrender.com/vhr-dashboard-pro.html
   ```

2. **Compte test avec essai actif:**
   - Username: `test_user`
   - Password: Doit être créé via le formulaire

3. **Compte test avec abonnement:**
   - Nécessite une vraie clé Stripe (ou test key)

---

## 📋 Scénarios de Test

### ✅ Scénario 1: Sans authentification

**Objectif:** Vérifier que les utilisateurs non connectés sont bloqués

```
1. Ouvrir le dashboard PRO
   URL: https://votre-app.onrender.com/vhr-dashboard-pro.html
   
2. NE PAS se connecter
   
3. Cliquer sur le bouton "🚀 Voix vers Casque"
   Localisation: Barre de navigation en haut à droite
   
4. ✅ RÉSULTAT ATTENDU:
   - Popup d'alerte: "❌ Veuillez vous connecter d'abord"
   - Panneau d'installer NE s'ouvre PAS
   - Page redirige vers: /account (formulaire de connexion)
```

**Logs attendus:**
```
[console] currentUser is empty
[alert] ❌ Veuillez vous connecter d'abord
```

---

### ✅ Scénario 2: Avec essai actif

**Objectif:** Vérifier que l'accès est autorisé pendant l'essai

**Précondition:** Créer un utilisateur test
```javascript
// Dans la console du navigateur:
localStorage.setItem('vhr_user', 'test_active_trial');
localStorage.setItem('vhr_license_key', 'TRIAL');
location.reload();
```

```
1. Se connecter avec l'utilisateur en essai
   
2. Vérifier que la date de création est < 14 jours
   localStorage.getItem('vhr_demo_start_date');  // Doit être récent
   
3. Cliquer sur "🚀 Voix vers Casque"
   
4. ✅ RÉSULTAT ATTENDU:
   - Le panneau installer s'ouvre
   - Section "📥 Télécharger l'Application" est visible
   - Deux boutons: [📱 APK] et [🎵 Voix]
   - Affiche: "✅ Authentifié en tant que: test_active_trial"
```

**Tester le téléchargement:**
```
1. Cliquer sur "[📱 Télécharger APK]"

2. ✅ RÉSULTAT ATTENDU:
   - Bouton devient: "⏳ Téléchargement..."
   - Après 2-3 secondes: Popup "✅ Téléchargement réussi!"
   - L'APK apparaît dans Downloads (vhr-dashboard.apk)
   - Taille: ~50-100 MB
```

**Logs attendus:**
```
[console] Check eligibility...
[server] [check-eligibility] User test_active_trial can download (demo active - X days)
[server] [download] User test_active_trial downloading apk
```

---

### ❌ Scénario 3: Essai expiré sans abonnement

**Objectif:** Vérifier que les utilisateurs sans accès sont bloqués

**Précondition:** Créer un utilisateur avec essai expiré
```javascript
// Dans la console du navigateur:
const expiredDate = new Date();
expiredDate.setDate(expiredDate.getDate() - 15);  // Il y a 15 jours
localStorage.setItem('vhr_user', 'test_expired');
localStorage.setItem('vhr_demo_start_date', expiredDate.toISOString());
location.reload();
```

```
1. Se connecter avec l'utilisateur en essai expiré
   
2. Vérifier qu'il N'y a PAS d'abonnement Stripe
   user.stripeCustomerId === null
   
3. Cliquer sur "🚀 Voix vers Casque"
   
4. ✅ RÉSULTAT ATTENDU:
   - Popup d'alerte: 
     "❌ Essai expiré et aucun abonnement actif. 
      Veuillez vous abonner pour continuer."
   - Bouton OK → Redirection vers /pricing ou /account
   - Le panneau installer NE s'ouvre PAS
```

**Tester le téléchargement direct:**
```
1. Ouvrir la console navigateur (F12)

2. Tenter un téléchargement manuel:
   ```javascript
   const response = await fetch('/api/download/vhr-app', {
     method: 'POST',
     credentials: 'include',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ type: 'apk' })
   });
   
   const data = await response.json();
   console.log(response.status, data);  // Doit afficher 403
   ```

3. ✅ RÉSULTAT ATTENDU:
   - HTTP 403 Forbidden
   - Réponse JSON:
     ```json
     {
       "ok": false,
       "error": "Access denied",
       "message": "❌ Essai expiré et aucun abonnement...",
       "needsSubscription": true
     }
     ```
```

**Logs attendus:**
```
[server] [check-eligibility] User test_expired can download FALSE
[server] [download/vhr-app] Access denied for test_expired (no valid subscription)
```

---

### ✅ Scénario 4: Avec abonnement Stripe actif

**Objectif:** Vérifier que les utilisateurs payants accèdent même après l'essai

**Précondition:** Avoir un compte Stripe test avec subscription active

```
1. Se connecter avec un utilisateur ayant:
   - Essai expiré (> 14 jours)
   - Abonnement Stripe ACTIF (status: 'active')
   
2. Vérifier la subscription:
   ```javascript
   const user = getCurrentUser();
   console.log(user.stripeCustomerId);  // Doit avoir une valeur
   ```
   
3. Cliquer sur "🚀 Voix vers Casque"
   
4. ✅ RÉSULTAT ATTENDU:
   - Le panneau installer s'ouvre
   - Section "📥 Télécharger l'Application" est visible
   - Affiche: "✅ Authentifié en tant que: [username]"
   - Raison d'accès: "Valid subscription" (dans les logs)
```

**Tester le téléchargement:**
```
1. Cliquer sur "[📱 Télécharger APK]"

2. ✅ RÉSULTAT ATTENDU:
   - Même comportement que Scénario 2
   - APK se télécharge avec succès
```

**Logs attendus:**
```
[server] [check-eligibility] User [name] can download TRUE (subscription active)
[server] [download] User [name] downloading apk
```

---

## 🔍 Vérifications Détaillées

### Vérifier la Fonction `showInstallerPanel()`

Dans la console du navigateur:

```javascript
// 1. Vérifier qu'elle existe
console.log(typeof window.showInstallerPanel);  // Doit être 'function'

// 2. Appeler manuellement avec currentUser vide
window.currentUser = '';
await window.showInstallerPanel();  // Doit afficher la popup

// 3. Appeler avec utilisateur connecté
window.currentUser = 'test_user';
await window.showInstallerPanel();  // Doit faire la vérification
```

### Vérifier l'Endpoint d'Éligibilité

```bash
# Depuis le terminal:

# Option 1: curl
curl -X GET https://votre-app.onrender.com/api/download/check-eligibility \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"

# Option 2: JavaScript dans la console
const res = await fetch('/api/download/check-eligibility', {
  method: 'GET',
  credentials: 'include'
});
const data = await res.json();
console.log(data);
```

**Réponse attendue:**
```json
{
  "ok": true,
  "canDownload": true|false,
  "demoExpired": true|false,
  "remainingDays": 5,
  "hasValidSubscription": true|false,
  "subscriptionStatus": "active|past_due|none",
  "reason": "Demo valid - 5 days remaining | Valid subscription | No access"
}
```

### Vérifier l'Endpoint de Téléchargement

```bash
# Depuis le terminal:
curl -X POST https://votre-app.onrender.com/api/download/vhr-app \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"type":"apk"}' \
  -o downloaded.apk

# Vérifier le fichier
file downloaded.apk  # Doit être: Zip archive data (APK format)
```

---

## 📊 Tableau de Résultats Attendus

| Scénario | Authentifié | Essai Actif | Abonnement | Résultat |
|----------|:-----------:|:-----------:|:----------:|----------|
| 1 | ❌ | - | - | ❌ Access Denied |
| 2 | ✅ | ✅ | - | ✅ Allow |
| 3 | ✅ | ❌ | ❌ | ❌ Access Denied |
| 4 | ✅ | ❌ | ✅ | ✅ Allow |
| 5 | ✅ | ✅ | ✅ | ✅ Allow (Essai prioritaire) |

---

## 🐛 Dépannage Pendant les Tests

### Problème: Bouton "Voix vers Casque" absent

**Solution:**
```javascript
// Forcer un rechargement du DOM
location.reload();

// Ou si le problème persiste:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Problème: Popup d'erreur constante

**Check:**
```javascript
// 1. Vérifier currentUser
console.log('currentUser:', window.currentUser);

// 2. Vérifier authMiddleware en arrière-plan
fetch('/api/me', { credentials: 'include' })
  .then(r => r.json())
  .then(d => console.log('Auth:', d));
```

### Problème: Stripe rejette les appels

**Vérifier:**
```bash
# 1. Logs du serveur
# Settings → Logs → Chercher "Stripe"

# 2. Clé API Stripe
echo $STRIPE_SECRET_KEY | head -c 10  # Doit commencer par sk_test_ ou sk_live_

# 3. Réseau
# F12 → Network → Chercher les requêtes vers api.stripe.com
```

---

## ✅ Checklist de Validation Finale

- [ ] Scénario 1: Non authentifié → Bloqué ✅
- [ ] Scénario 2: Essai actif → Accès autorisé ✅
- [ ] Scénario 3: Essai expiré → Bloqué ✅
- [ ] Scénario 4: Abonnement → Accès autorisé ✅
- [ ] Téléchargement APK réussit ✅
- [ ] Taille du fichier > 50 MB ✅
- [ ] Logs enregistrent les accès ✅
- [ ] Les messages d'erreur sont clairs ✅
- [ ] Les redirections fonctionnent ✅
- [ ] La session persiste correctement ✅

---

## 📝 Rapport de Test

Modèle pour documenter les résultats:

```markdown
## Rapport de Test - Protection Téléchargement
**Date:** 2025-12-14
**Testeur:** [Your Name]

### Scénario 1: Non authentifié
- [ ] Popup affichée: ___
- [ ] Redirection fonctionnée: ___
- [ ] Erreurs console: ___
- **Résultat:** PASS / FAIL

### Scénario 2: Essai actif
- [ ] Panneau ouvert: ___
- [ ] Téléchargement réussi: ___
- [ ] Taille du fichier: ___ MB
- **Résultat:** PASS / FAIL

### Scénario 3: Essai expiré
- [ ] Blocage fonctionné: ___
- [ ] Message clair: ___
- [ ] Redirection vers pricing: ___
- **Résultat:** PASS / FAIL

### Scénario 4: Abonnement
- [ ] Accès autorisé: ___
- [ ] Téléchargement réussi: ___
- [ ] Logs générés: ___
- **Résultat:** PASS / FAIL

**Conclusion:** 
[ ] Tous les tests PASS - Prêt pour la production
[ ] Quelques tests FAIL - Ajustements nécessaires
```

---

## 🎓 Tips de Debugging

### Afficher les Logs Détaillés

```javascript
// Dans le navigateur (F12 → Console)

// 1. Activer le verbose logging
window.debugDownload = true;

// 2. Redéfinir downloadVHRApp pour logger
const originalDownload = window.downloadVHRApp;
window.downloadVHRApp = async function(type) {
  console.log('🔍 Download request:', type);
  console.log('🔍 Current user:', window.currentUser);
  
  const eligibility = await fetch('/api/download/check-eligibility', {
    credentials: 'include'
  });
  console.log('🔍 Eligibility:', await eligibility.json());
  
  return originalDownload(type);
};

// 3. Appeler
await window.downloadVHRApp('apk');
```

### Simuler une Erreur Stripe

```javascript
// Pour tester le comportement en cas d'erreur:

// Temporairement modifier le server pour rejeter Stripe:
// Dans server.js, ajouter:
if (Math.random() > 0.5) {
  throw new Error('Simulated Stripe timeout');
}
```

---

**Bonne chance avec les tests! 🚀**
