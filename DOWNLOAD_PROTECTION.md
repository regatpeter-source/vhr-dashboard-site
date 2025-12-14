# 🔐 VHR Pro - Protection des Téléchargements avec Authentification et Licence

## Vue d'Ensemble

Le système de téléchargement d'APK et de fichiers vocaux est maintenant **protégé par authentification et vérification de licence**.

---

## 🛡️ Mécanisme de Protection

### 1. **Authentification Requise**
- L'utilisateur DOIT être connecté (`currentUser`)
- Sans authentification → Redirection vers le formulaire de connexion

### 2. **Vérification de Licence/Essai**
- **Essai actif** (< 14 jours) → ✅ Accès autorisé
- **Essai expiré** → Vérification d'abonnement Stripe:
  - ✅ Abonnement actif → Accès autorisé
  - ❌ Aucun abonnement → Accès refusé + Redirection vers l'abonnement

### 3. **Messages d'Erreur Clairs**
- Utilisateur non authentifié → "Veuillez vous connecter"
- Essai expiré sans abonnement → "Essai expiré - Abonnement requis"

---

## 📡 Routes API Sécurisées

### 1. POST `/api/download/vhr-app`
**Télécharge un fichier (APK ou données vocales)**

```javascript
// Request
{
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'apk' })  // 'apk' ou 'voice-data'
}

// Response (Succès)
HTTP 200
Content-Type: application/vnd.android.package-archive
Content-Disposition: attachment; filename="vhr-dashboard.apk"
[APK file binary]

// Response (Accès Refusé)
HTTP 403
{
  "ok": false,
  "error": "Access denied",
  "message": "❌ Essai expiré et aucun abonnement actif...",
  "needsSubscription": true
}
```

**Sécurité:**
- ✅ Middleware `authMiddleware` requis
- ✅ Vérification `isDemoExpired(user)`
- ✅ Vérification Stripe `stripe.subscriptions.list()`
- ✅ Log des téléchargements pour audit

---

### 2. GET `/api/download/check-eligibility`
**Vérifie si l'utilisateur peut télécharger (sans télécharger)**

```javascript
// Request
{
  method: 'GET',
  credentials: 'include'
}

// Response
{
  "ok": true,
  "canDownload": true,
  "demoExpired": false,
  "remainingDays": 12,
  "hasValidSubscription": false,
  "subscriptionStatus": "none",
  "reason": "Demo valid - 12 days remaining"
}
```

**Cas d'usage:**
- Vérifier l'accès avant d'afficher le bouton
- Afficher les jours d'essai restants
- Afficher le statut de l'abonnement

---

## 🎨 Interface Utilisateur

### Bouton de Téléchargement sur le Dashboard Pro

**Avant (Non Protégé):**
```
🚀 Voix vers Casque
  └─ Ouvre le panneau installer directement
```

**Après (Protégé):**
```
🚀 Voix vers Casque
  ├─ ✅ Utilisateur authentifié?
  │   ├─ NON → Popup: "Veuillez vous connecter"
  │   │       Redirection: Formulaire de connexion
  │   │
  │   └─ OUI → Vérifier l'essai/abonnement
  │       ├─ Essai actif → ✅ Ouvrir panneau
  │       │
  │       └─ Essai expiré
  │           ├─ Abonnement Stripe actif? → ✅ Ouvrir panneau
  │           └─ NON actif → ❌ Popup + Redirection abonnement
```

### Panneau Installer Amélioré

Nouvelle section avec deux boutons de téléchargement:

```
┌─────────────────────────────────────┐
│ 📥 Télécharger l'Application        │
│                                     │
│ [📱 Télécharger APK]  [🎵 Voix]    │
│                                     │
│ ✅ Authentifié en tant que: john   │
└─────────────────────────────────────┘
```

---

## 💻 Code Client (Dashboard Pro)

### Modification de `showInstallerPanel()`

```javascript
window.showInstallerPanel = async function() {
  // 1. Vérifier authentification
  if (!currentUser) {
    alert('❌ Veuillez vous connecter d\'abord');
    return showAccountPanel();
  }
  
  // 2. Vérifier l'éligibilité
  const eligibilityRes = await fetch('/api/download/check-eligibility', {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const data = await eligibilityRes.json();
  
  // 3. Vérifier si l'utilisateur peut télécharger
  if (!data.canDownload) {
    alert(`❌ ${data.reason}\n\nVeuillez vous abonner`);
    showAccountPanel(); // Afficher le formulaire d'abonnement
    return;
  }
  
  // 4. L'utilisateur est éligible - afficher le panneau
  // ... (reste du code)
}
```

### Fonction de Téléchargement Protégée

```javascript
window.downloadVHRApp = async function(type = 'apk') {
  try {
    const response = await fetch('/api/download/vhr-app', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
    
    // Si 403 (Forbidden) = Accès refusé
    if (response.status === 403) {
      const errorData = await response.json();
      alert(`❌ ${errorData.message}`);
      closeInstallerPanel();
      showAccountPanel(); // Rediriger vers l'abonnement
      return;
    }
    
    // Si 200 = Téléchargement réussi
    const blob = await response.blob();
    // ... (déclencher le téléchargement du navigateur)
  } catch (e) {
    alert(`❌ Erreur: ${e.message}`);
  }
}
```

---

## 🔐 Sécurité et Audit

### Logs Serveur

Chaque tentative de téléchargement est enregistrée:

```log
[download] User peter_dev downloading apk
[check-eligibility] User peter_dev can download (demo active - 10 days remaining)
[download/vhr-app] Access denied for john_doe (no valid subscription)
[download/vhr-app] error: File not found
```

### Protection CSRF

- Middleware `authMiddleware` vérifie la session
- Les credentials sont inclus (`credentials: 'include'`)
- Les cookies de session sont validés

### Vérification Stripe

- Appel API en temps réel à Stripe
- Vérification du statut de l'abonnement
- Gestion des erreurs réseau

---

## 🧪 Scénarios de Test

### ✅ Cas 1: Utilisateur avec essai actif

```
1. Se connecter avec un utilisateur en essai
2. Cliquer sur "🚀 Voix vers Casque"
3. ✅ Le panneau s'ouvre → Bouton de téléchargement disponible
4. Cliquer sur "📱 Télécharger APK"
5. ✅ L'APK se télécharge
```

### ✅ Cas 2: Utilisateur avec abonnement actif

```
1. Se connecter avec un utilisateur ayant Stripe abonnement
2. Essai expiré, mais abonnement actif
3. Cliquer sur "🚀 Voix vers Casque"
4. ✅ Le panneau s'ouvre (accès via abonnement)
5. Cliquer sur "📱 Télécharger APK"
6. ✅ L'APK se télécharge
```

### ❌ Cas 3: Utilisateur sans authentification

```
1. NE PAS se connecter
2. Cliquer sur "🚀 Voix vers Casque"
3. ❌ Popup: "Veuillez vous connecter d'abord"
4. Redirection vers le formulaire de connexion
```

### ❌ Cas 4: Essai expiré sans abonnement

```
1. Se connecter avec utilisateur en essai expiré
2. Pas d'abonnement Stripe
3. Cliquer sur "🚀 Voix vers Casque"
4. ❌ Popup: "Essai expiré - Abonnement requis"
5. Redirection vers la page d'abonnement
6. ❌ Tentative de téléchargement direct → HTTP 403
```

---

## 🚀 Déploiement

### Sur Render.com

1. **Push vers GitHub** (déjà fait ✅)
2. **Render détecte les changements** (environ 2-3 minutes)
3. **Nouvelle version déployée** (avec les routes protégées)

### Vérifier le déploiement

```bash
# Tester l'endpoint sur prod
curl -X GET https://votre-app.onrender.com/api/download/check-eligibility \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Cookie: session=YOUR_SESSION"
```

---

## 📋 Checklist d'Implémentation

- ✅ Créé les routes `/api/download/vhr-app` et `/api/download/check-eligibility`
- ✅ Modifié `showInstallerPanel()` pour vérifier l'authentification
- ✅ Ajouté la fonction `downloadVHRApp()` protégée
- ✅ Ajouté la section de téléchargement au panneau installer
- ✅ Intégré la vérification Stripe en temps réel
- ✅ Commité et pushé les changements vers GitHub
- 🔄 Déploiement automatique sur Render (en cours)

---

## 🎯 Résumé

**Avant:** Tout le monde pouvait télécharger  
**Après:** Seuls les utilisateurs authentifiés avec:
- ✅ Essai actif OU
- ✅ Abonnement Stripe actif

peuvent télécharger l'APK et les fichiers vocaux.

**Protection:** Authentification + Vérification de licence + Logs d'audit
