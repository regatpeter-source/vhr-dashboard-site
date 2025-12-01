# Gestion de la Période de Démonstration (7 jours)

## Configuration

La durée et les paramètres de la période de démonstration gratuite sont contrôlés par le fichier `/config/demo.config.js`.

### Paramètres configurables

```javascript
DEMO_DAYS: 7                    // Nombre de jours de démo gratuite
DEMO_DURATION_MS: 7 * 24 * 60 * 60 * 1000  // Durée en millisecondes
MODE: 'database'                // Mode de stockage: 'database' ou 'localStorage'
WARNING_DAYS_BEFORE: 1          // Jours avant l'expiration pour afficher l'avertissement
```

### Modifier la durée de démo

#### Option 1: Changer le nombre de jours

Editez `/config/demo.config.js`:

```javascript
DEMO_DAYS: 14,  // Pour 14 jours au lieu de 7
DEMO_DURATION_MS: 14 * 24 * 60 * 60 * 1000,
```

#### Option 2: Changer en heures (pour tester)

```javascript
DEMO_DAYS: 2,  // Affichage: 2 jours
DEMO_DURATION_MS: 2 * 60 * 60 * 1000,  // Réalité: 2 heures de démo
```

#### Option 3: Mode développement (pas de limite)

```javascript
MODE: 'none',  // Désactive complètement la limitation de démo
```

---

## API Endpoints

### Vérifier le statut de la démo

**Endpoint:** `GET /api/demo/status`

**Authentification:** Requise (token JWT)

**Réponse:**

```json
{
  "ok": true,
  "demo": {
    "demoStartDate": "2025-12-01T21:11:26.079Z",
    "demoExpired": false,
    "remainingDays": 6,
    "totalDays": 7,
    "expirationDate": "2025-12-08T21:11:26.079Z",
    "hasActiveSubscription": false,
    "daysUntilWarning": 1
  }
}
```

### Logique de gestion

- **Au registre:** La date de démarrage (`demoStartDate`) est automatiquement définie
- **Vérification:** Chaque appel calcule les jours restants
- **Abonnement actif:** Si l'utilisateur a un abonnement payant, le timer de démo est ignoré
- **Avertissement:** Un jour avant l'expiration, un signal est envoyé

---

## Intégration côté client

### JavaScript

```javascript
// Vérifier le statut de la démo
async function checkDemoStatus() {
  const res = await fetch('/api/demo/status', {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const data = await res.json();
  
  if (data.ok) {
    console.log('Jours restants:', data.demo.remainingDays);
    console.log('Expire le:', new Date(data.demo.expirationDate).toLocaleDateString());
    
    // Afficher un avertissement si < 1 jour
    if (data.demo.remainingDays <= 1 && !data.demo.hasActiveSubscription) {
      console.warn('⚠️ Votre période de démo expire bientôt!');
    }
    
    // Bloquer l'accès si expiré
    if (data.demo.demoExpired && !data.demo.hasActiveSubscription) {
      console.error('❌ Votre période de démo est expirée');
      window.location.href = '/pricing.html';  // Rediriger vers upgrade
    }
  }
}
```

---

## Exemples d'utilisation

### Scénario 1: Ajouter 3 jours de démo supplémentaire

1. Ouvrir `/config/demo.config.js`
2. Modifier `DEMO_DAYS: 7` → `DEMO_DAYS: 10`
3. Modifier `DEMO_DURATION_MS` en conséquence
4. Redémarrer le serveur

### Scénario 2: Tester la démo avec courte durée

```javascript
// Dans /config/demo.config.js
DEMO_DAYS: 1,
DEMO_DURATION_MS: 10 * 60 * 1000,  // 10 minutes seulement
```

### Scénario 3: Donner accès illimité pendant le développement

```javascript
// Dans /config/demo.config.js
MODE: 'none',  // Aucune vérification de démo
```

---

## Réinitialiser la démo pour un utilisateur

### Option 1: Modifier manuellement dans `/data/users.json`

```json
{
  "username": "monuser",
  "demoStartDate": "2025-12-01T21:11:26.079Z",  // ← Modifier cette date
  ...
}
```

Puis redémarrer le serveur.

### Option 2: Créer une route admin (à implémenter)

```javascript
app.post('/api/admin/reset-demo/:username', authMiddleware, adminCheck, (req, res) => {
  const user = getUserByUsername(req.params.username);
  if (user) {
    user.demoStartDate = new Date().toISOString();
    persistUser(user);
    res.json({ ok: true, message: 'Demo réinitialisée' });
  }
});
```

---

## Notifications d'expiration

La logique actuelle dans `/server.js`:
- ✅ Calcule les jours restants
- ✅ Détecte l'expiration
- ⏳ À implémenter: Emails d'avertissement
- ⏳ À implémenter: Pop-up côté client

### Pour activer les emails (à ajouter):

```javascript
if (remainingDays === 1 && !user.hasActiveSubscription) {
  // Envoyer un email d'avertissement
  sendEmail(user.email, 'Votre démo expire demain!', ...);
}
```

---

## Résumé des fichiers modifiés

- ✅ `/config/demo.config.js` - Configuration centralisée
- ✅ `/server.js` - Fonctions de gestion + route `/api/demo/status`
- ✅ `/add-user.js` - Initialisé `demoStartDate`
- ✅ `/data/users.json` - Champs `demoStartDate` ajoutés

---

## Questions fréquentes

**Q: Où est stockée la date de démarrage?**
A: Dans le champ `demoStartDate` de l'utilisateur dans `/data/users.json`

**Q: Peut-on réinitialiser la démo après expiration?**
A: Oui, en modifiant le fichier `/data/users.json` ou en créant une route admin

**Q: La démo est-elle vérifiée à chaque requête?**
A: Non, seulement quand `/api/demo/status` est appelée (à faire côté client)

**Q: Un abonnement payant annule-t-il la limite de démo?**
A: Oui, si `subscriptionStatus === 'active'`, la démo est ignorée
