# 👤 Mon Compte - Documentation Complète

## 🎯 Présentation

Le panneau **Mon Compte** est une interface complète et moderne pour gérer votre profil utilisateur dans VHR Dashboard PRO. Accessible via le bouton "👤 Mon Compte" dans la navbar, il offre une gestion détaillée de votre compte, statistiques et paramètres.

---

## 🚀 Accès Rapide

**Comment ouvrir :** Cliquez sur le bouton **"👤 Mon Compte"** dans la barre de navigation (en haut, entre "Vue: Tableau" et votre nom d'utilisateur)

---

## 📋 Onglet Profil

### En-tête du profil
- **Avatar** : Icône basée sur votre rôle
  - 👑 Administrateur
  - 👤 Utilisateur
  - 👥 Invité
- **Badge rôle** : Couleur selon le niveau
  - 🟠 Orange = Admin
  - 🔵 Bleu = User
  - ⚪ Gris = Guest
- **Date d'inscription** : "Membre depuis X jours"

### Informations du compte (colonne gauche)

#### 📝 Modification du nom d'utilisateur
```
[Nom actuel] [✓ Bouton valider]
```
- Cliquez sur le ✓ pour sauvegarder
- Les données sont automatiquement migrées vers le nouveau nom
- Notification de confirmation

#### 🔒 Affichage du rôle
- Rôle actuel affiché (non modifiable depuis le profil)
- Badge administrateur si applicable

#### 📧 Email (optionnel)
- Champ pour entrer votre email
- Non obligatoire, pour contact/notifications futures

#### ✍️ Bio personnelle
- Zone de texte libre
- Décrivez-vous en quelques mots
- Sauvegarde avec le bouton "💾 Sauvegarder"

### Activité récente (colonne droite)

#### 📊 Statistiques en temps réel
```
┌─────────────────────────────────┐
│ Dernière connexion │ Il y a 5min │
│ Sessions totales   │      42     │
│ Apps lancées       │     156     │
│ Casques gérés      │      3      │
└─────────────────────────────────┘
```

#### 🔐 Sécurité
- **📥 Exporter mes données** : Télécharge un JSON complet
  - Username, rôle, stats, préférences
  - Format : `vhr-data-[user]-[timestamp].json`
  
- **🗑️ Supprimer mon compte** : Suppression définitive
  - Double confirmation requise
  - Supprime toutes les données (stats, prefs)
  - Supprime l'utilisateur de la liste
  - Demande de créer un nouveau compte après

---

## 📊 Onglet Statistiques

### Cartes de statistiques principales

#### 🟢 Sessions totales
- Nombre de fois où vous avez lancé un stream
- Grande carte verte avec animation

#### 🔵 Apps lancées
- Nombre total d'applications lancées
- Grande carte bleue

#### 🟣 Casques gérés
- Maximum de casques connectés simultanément
- Grande carte violette

#### 🟠 Temps de streaming
- Durée totale en heures et minutes
- Format : `XhYm`
- Grande carte orange

### 📈 Graphiques d'activité
```
┌────────────────────────────────────┐
│  📊 Graphiques détaillés          │
│     disponibles prochainement      │
└────────────────────────────────────┘
```
*À venir : graphiques en courbes, barres, camemberts*

### 🏆 Accomplissements (Achievements)

#### 🏅 Habitué
- **Condition** : 10+ sessions
- Badge doré
- Débloqué automatiquement

#### 🎮 Joueur
- **Condition** : 50+ apps lancées
- Badge violet
- Pour les utilisateurs actifs

#### 🥽 Collectionneur
- **Condition** : 3+ casques gérés
- Badge bleu
- Pour les multi-casques

#### 🔒 À débloquer
- Achievements futurs
- Grisés tant que non débloqués
- Motivation pour continuer

---

## ⚙️ Onglet Paramètres

### 🎨 Apparence

#### Préférences d'affichage
```
☑ 🔄 Rafraîchissement automatique des casques
☑ 🔔 Notifications toast activées
☐ 🔊 Sons d'actions activés
```

#### Vue par défaut
```
Dropdown:
├─ 📊 Tableau
└─ 🎴 Cartes
```
- Définit la vue affichée au démarrage
- Appliqué immédiatement lors de la sauvegarde

### ⚡ Performance

#### Profil streaming par défaut
```
Dropdown:
├─ Ultra Low (320p)
├─ Low (480p)
├─ WiFi (640p)
├─ Default (720p)    ← Par défaut
├─ High (1280p)
└─ Ultra (1920p)
```
- Profil pré-sélectionné lors du lancement de stream

#### Intervalle de rafraîchissement
```
[5] secondes (1-60)
```
- Fréquence de mise à jour de la liste des casques
- Par défaut : 5 secondes

### 🔧 Avancé

#### Options développeur
```
☐ 🐛 Mode debug (logs console)
☐ 📶 WiFi auto au démarrage
```

- **Debug mode** : Active les logs détaillés dans la console
- **WiFi auto** : Tente de connecter les casques en WiFi dès le démarrage

---

## 💾 Sauvegarde des Données

### LocalStorage
Toutes les données sont sauvegardées localement :

```javascript
// Stats utilisateur
localStorage: 'vhr_user_stats_[username]'
{
  joinedAt: "2025-12-03T10:30:00.000Z",
  totalSessions: 42,
  totalStreamTime: 7200,  // en secondes
  devicesManaged: 3,
  appsLaunched: 156,
  lastLogin: "2025-12-03T15:45:00.000Z",
  favoriteDevice: "Quest_2"
}

// Préférences utilisateur
localStorage: 'vhr_user_prefs_[username]'
{
  autoRefresh: true,
  notifications: true,
  sounds: false,
  defaultView: "table",
  defaultProfile: "default",
  refreshInterval: 5,
  debugMode: false,
  autoWifi: false
}
```

### Export de données
Format JSON exporté :
```json
{
  "username": "Peter",
  "role": "admin",
  "stats": {
    "totalSessions": 42,
    "appsLaunched": 156,
    "devicesManaged": 3,
    "totalStreamTime": 7200,
    "lastLogin": "2025-12-03T15:45:00.000Z",
    "memberSince": "15 jours",
    "favoriteDevice": "Quest_2",
    "joinedAt": "2025-11-18T10:00:00.000Z"
  },
  "preferences": {
    "autoRefresh": true,
    "notifications": true,
    "sounds": false,
    "defaultView": "table",
    "defaultProfile": "default",
    "refreshInterval": 5,
    "debugMode": false,
    "autoWifi": false
  },
  "exportDate": "2025-12-03T15:50:00.000Z"
}
```

---

## 🔄 Incrémentation Automatique des Stats

Les statistiques sont mises à jour automatiquement lors de vos actions :

### 📈 Actions trackées

| Action | Stat incrémentée | Quand |
|--------|------------------|-------|
| Lancer un stream | `totalSessions` | Clic "▶️ Start Stream" |
| Lancer une app | `appsLaunched` | Clic "▶️ Lancer" dans la liste apps |
| Connecter un casque | `devicesManaged` | Nouveau casque détecté (max) |
| Temps de stream | `totalStreamTime` | Durée du stream (à implémenter) |

### Code exemple
```javascript
// Lors du lancement d'une app
window.launchApp = async function(serial, pkg) {
  const res = await api(`/api/apps/${serial}/launch`, {
    method: 'POST',
    body: JSON.stringify({ package: pkg })
  });
  
  if (res.ok) {
    incrementStat('appsLaunched');  // ← Incrémente automatiquement
    showToast('✅ App lancée !', 'success');
  }
};
```

---

## 🎨 Design & Animations

### Palette de couleurs
```css
/* Header gradient */
background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);

/* Cards stats */
.stat-card-green:   linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
.stat-card-blue:    linear-gradient(135deg, #3498db 0%, #2980b9 100%);
.stat-card-purple:  linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
.stat-card-orange:  linear-gradient(135deg, #f39c12 0%, #e67e22 100%);

/* Badges rôles */
.badge-admin:  #ff9800 (Orange)
.badge-user:   #2196f3 (Bleu)
.badge-guest:  #95a5a6 (Gris)
```

### Effets
- ✨ Backdrop blur (8px) sur le panneau
- 🎭 Ombres portées sur les cartes
- 🌊 Transitions douces (0.3s)
- 💫 Hover effects sur les onglets
- 📱 Responsive design complet

---

## 🔧 Fonctions JavaScript Principales

### Navigation
```javascript
showAccountPanel()         // Ouvre le panneau
closeAccountPanel()        // Ferme le panneau
switchAccountTab(tab)      // Change d'onglet ('profile', 'stats', 'settings')
```

### Gestion utilisateur
```javascript
updateUsername()           // Met à jour le nom d'utilisateur
saveProfileChanges()       // Sauvegarde le profil
saveSettings()            // Sauvegarde les paramètres
```

### Stats
```javascript
getUserStats()            // Récupère les stats
incrementStat(statName)   // Incrémente une stat
formatDate(isoString)     // Formate une date relative
```

### Données
```javascript
getUserPreferences()      // Récupère les préférences
saveUserPreferences(prefs) // Sauvegarde les préférences
exportUserData()          // Exporte en JSON
confirmDeleteAccount()    // Supprime le compte
```

---

## 📱 Responsive Design

Le panneau "Mon Compte" s'adapte à toutes les tailles d'écran :

### 🖥️ Desktop (>900px)
- 2 colonnes dans l'onglet Profil
- Largeur max : 900px
- Toutes les cartes visibles

### 📱 Tablette (600px - 900px)
- 2 colonnes réduites
- Scrollbar verticale si nécessaire
- Cartes stats en grille 2x2

### 📱 Mobile (<600px)
- 1 colonne
- Cartes empilées verticalement
- Boutons pleine largeur
- Textes réduits

---

## 🚀 Utilisation Rapide

### Modifier son profil
1. Cliquez "👤 Mon Compte"
2. Modifiez votre nom, email, bio
3. Cliquez "💾 Sauvegarder"

### Voir ses statistiques
1. Cliquez "👤 Mon Compte"
2. Onglet "📊 Statistiques"
3. Consultez vos chiffres et achievements

### Personnaliser les paramètres
1. Cliquez "👤 Mon Compte"
2. Onglet "⚙️ Paramètres"
3. Cochez/décochez les options
4. Sélectionnez vos préférences
5. Cliquez "💾 Sauvegarder"

### Exporter ses données
1. Cliquez "👤 Mon Compte"
2. Onglet "📋 Profil"
3. Section "🔐 Sécurité"
4. Cliquez "📥 Exporter mes données"
5. Fichier JSON téléchargé

---

## 🎯 Fonctionnalités Futures

### 📊 Statistiques avancées
- Graphiques interactifs (Chart.js)
- Historique d'activité (calendrier)
- Comparaison avec d'autres utilisateurs
- Temps de jeu par app

### 🏆 Achievements étendus
```
🌟 Expert (100+ sessions)
🚀 Speedrunner (10 apps en 1h)
🌙 Noctambule (sessions après minuit)
🔥 Streak (7 jours consécutifs)
💎 Légende (tous les achievements)
```

### 🔔 Notifications
- Nouveaux achievements débloqués
- Rappels d'activité
- Mises à jour du dashboard

### 👥 Profil social
- Photo de profil personnalisée
- Partage de stats publiques
- Classement des utilisateurs
- Badges de profil

### ☁️ Cloud sync
- Sauvegarde cloud des données
- Synchronisation multi-appareils
- Récupération de compte

---

## 📝 Changelog

### Version 2.0 (2025-12-03)
✅ Ajout du panneau "Mon Compte" complet
✅ 3 onglets : Profil, Statistiques, Paramètres
✅ Système de stats avec incrémentation auto
✅ Export de données JSON
✅ Suppression de compte sécurisée
✅ 4 achievements de base
✅ Préférences utilisateur avancées
✅ Design moderne avec gradients
✅ Responsive mobile/tablette/desktop
✅ Animations et transitions fluides

---

## 🎉 Résumé des Améliorations

| Fonctionnalité | Avant | Après |
|----------------|-------|-------|
| Gestion profil | ❌ Menu basique | ✅ Panneau complet 3 onglets |
| Statistiques | ❌ Aucune | ✅ 4 stats principales + achievements |
| Paramètres | ❌ LocalStorage manuel | ✅ Interface graphique complète |
| Export données | ❌ Impossible | ✅ Export JSON complet |
| Design | ⚪ Basique | ✅ Moderne avec gradients |
| Responsive | ⚠️ Partiel | ✅ Complet mobile/tablette/desktop |

**Votre compte est maintenant un véritable centre de contrôle personnel !** 🎮
