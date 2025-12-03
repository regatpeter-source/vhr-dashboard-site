# VHR DASHBOARD PRO - Documentation Complète

## 🎨 Interface

### Thème Noir Professionnel
- ✅ Fond noir (#0d0f14) avec accents verts (#2ecc71)
- ✅ Design moderne et épuré
- ✅ Animations fluides et effets hover
- ✅ Scrollbar personnalisée
- ✅ Responsive (mobile, tablette, desktop)

### Deux Modes de Vue

#### 📊 Vue Tableau (par défaut)
- **Affichage multi-casques** : Tous les casques dans un tableau
- **Colonnes** :
  - Nom du casque + Numéro de série
  - Statut (✅ device, 🟢 streaming, ❌ offline)
  - Contrôles Streaming (profil + start/stop)
  - WiFi Auto
  - Gestion Apps + Favoris
  - **Voix PC → Casque** (nouveau !)
  - Actions rapides (renommer, stockage)

#### 🎴 Vue Cartes
- Affichage en grille de cartes individuelles
- Toutes les fonctionnalités disponibles par casque
- Idéal pour 1-3 casques

**Basculer entre les vues** : Bouton "📊 Vue: Tableau" / "🎴 Vue: Cartes" dans la navbar

---

## 🚀 Fonctionnalités

### 1. Détection Automatique des Casques
- ✅ Détection USB via ADB
- ✅ Détection WiFi (IP:port)
- ✅ Mise à jour en temps réel (Socket.IO)
- ✅ Affichage du statut (device, streaming, offline)

### 2. Streaming Vidéo (Scrcpy)
- **6 profils de qualité** :
  - Ultra Low (320p, 600K) - Pour connexions très lentes
  - Low (480p, 1.5M) - Connexions lentes
  - WiFi (640p, 2M) - Recommandé pour WiFi
  - Default (720p, 3M) - Équilibre qualité/perf
  - High (1280p, 8M) - Haute qualité
  - Ultra (1920p, 12M) - Maximum qualité
- ✅ Start/Stop stream par casque
- ✅ Indicateur streaming en temps réel

### 3. ⭐ NOUVEAU : WiFi Automatique
**Fonction** : Connexion WiFi sans entrer d'IP manuellement

**Comment ça marche** :
1. Cliquez sur "📶 WiFi Auto"
2. Le système détecte automatiquement l'IP du casque via 3 méthodes :
   - `ip route` → source IP
   - `ip addr show wlan0` → interface WiFi
   - `getprop dhcp.wlan0.ipaddress` → propriété système
3. Active le mode TCP (port 5555)
4. Connecte automatiquement

**Prérequis** :
- Casque connecté en USB au moins une fois
- WiFi activé sur le casque
- Casque et PC sur le même réseau

**Route API** : `POST /api/adb/wifi-auto`

### 4. ⭐ NOUVEAU : Voix PC → Casque (TTS)
**Fonction** : Envoyer du texte oral du PC vers le casque

**Comment ça marche** :
1. Cliquez sur "🎤 Envoyer Voix"
2. Entrez le texte dans la popup
3. Le texte est envoyé au casque via 2 méthodes :
   - **Notification Android** : Affiche le texte
   - **Broadcast Intent** : Pour apps TTS

**Limitations actuelles** :
- Le texte est affiché en notification sur le casque
- Pour TTS audio complet, installer l'app "VHR TTS" (à développer)

**Future implémentation TTS complète** :
```javascript
// App Android qui écoute les broadcasts VHR
public class VHRTTSReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    String text = intent.getStringExtra("text");
    TextToSpeech tts = new TextToSpeech(context, ...);
    tts.speak(text, QUEUE_FLUSH, null);
  }
}
```

**Route API** : `POST /api/tts/send`
- Body: `{ serial: "...", text: "Bonjour le casque!" }`

### 5. Gestion des Applications
- ✅ Lister toutes les apps installées
- ✅ Lancer une app à distance
- ✅ Interface modale avec recherche

### 6. Favoris
- ✅ Apps favorites sauvegardées
- ✅ Lancement rapide depuis le tableau
- ✅ Icônes personnalisées

### 7. Gestion Multi-Utilisateurs
- ✅ Système de profils utilisateurs
- ✅ Rôles (admin, user, guest)
- ✅ Historique utilisateurs
- ✅ Badge coloré par rôle
- ✅ Menu utilisateur complet

### 8. Actions Rapides
- ✏️ Renommer un casque
- 💾 Gestion stockage (à venir)
- 🔄 Rafraîchir la liste

### 9. Notifications Toast
- ✅ Feedback visuel pour chaque action
- ✅ 3 types : success (vert), error (rouge), info (bleu)
- ✅ Auto-dismiss après 3 secondes

---

## 📁 Structure des Fichiers

```
public/
├── vhr-dashboard-pro.html    # Page principale
├── dashboard-pro.js           # Logic JavaScript (890 lignes)
├── dashboard-pro.css          # Styles fond noir
├── vhr-dashboard-app.html     # Ancienne version (avec auth)
├── dashboard.js               # Ancienne version (281 lignes)
└── dashboard.css              # Anciens styles

server.js                       # Serveur Node.js avec routes API
.env                           # Configuration (NO_ADB=0)
VHR Dashboard.bat              # Lanceur Windows
```

---

## 🔧 Routes API Nouvelles

### WiFi Automatique
```http
POST /api/adb/wifi-auto
Content-Type: application/json

{
  "serial": "1WMHHA60AD2441"
}

Response:
{
  "ok": true,
  "ip": "192.168.1.42",
  "msg": "connected to 192.168.1.42:5555"
}
```

### Text-to-Speech
```http
POST /api/tts/send
Content-Type: application/json

{
  "serial": "1WMHHA60AD2441",
  "text": "Bonjour depuis le PC!"
}

Response:
{
  "ok": true,
  "message": "Texte envoyé (notification + broadcast). Pour TTS audio complet, installez l'app VHR TTS sur le casque."
}
```

---

## 🎯 Utilisation Rapide

### Démarrage
1. Double-cliquez sur `VHR Dashboard.bat`
2. Le serveur démarre automatiquement
3. Le navigateur s'ouvre sur `http://localhost:3000/vhr-dashboard-pro.html`

### Gestion Multi-Casques
1. Branchez tous vos casques en USB
2. Ils apparaissent automatiquement dans le tableau
3. Utilisez chaque colonne pour gérer les fonctions :
   - **Streaming** : Sélectionnez le profil + Start
   - **WiFi** : Cliquez "WiFi Auto" pour passer sans fil
   - **Apps** : Gérez les applications installées
   - **Voix** : Envoyez des messages vocaux
   - **Actions** : Renommez ou gérez le stockage

### Passage en Mode WiFi
1. Connectez le casque en USB
2. Cliquez "📶 WiFi Auto"
3. ✅ Débranchez le câble USB
4. Le casque reste connecté en WiFi

### Envoi de Voix
1. Cliquez "🎤 Envoyer Voix" sur la ligne du casque
2. Entrez votre message : "Mettez le casque s'il vous plaît"
3. Le message s'affiche en notification sur le casque

---

## 📊 Tableau des Fonctionnalités

| Fonctionnalité | Status | Notes |
|---|---|---|
| 🎨 Fond noir | ✅ | Thème professionnel complet |
| 📊 Vue tableau | ✅ | Multi-casques simultanés |
| 🎴 Vue cartes | ✅ | Alternative grille |
| 🔄 Détection auto | ✅ | Socket.IO temps réel |
| 📹 Streaming 6 profils | ✅ | Ultra Low → Ultra |
| 📶 WiFi Auto | ✅ | Détection IP automatique |
| 🎤 Voix PC→Casque | ✅ | Notification + Broadcast |
| 📱 Apps management | ✅ | Liste + Lancement |
| ⭐ Favoris | ✅ | Raccourcis apps |
| 👥 Multi-users | ✅ | Rôles admin/user/guest |
| 🔔 Notifications | ✅ | Toast success/error/info |
| ✏️ Renommage | ✅ | Noms personnalisés |
| 💾 Stockage | 🔜 | À venir |
| 🎙️ TTS Audio complet | 🔜 | Requiert app Android |

---

## 🛠️ Développement Futur

### TTS Audio Complet
**Créer une app Android "VHR TTS Helper"** :

```java
// VHRTTSService.java
public class VHRTTSService extends Service {
    private TextToSpeech tts;
    
    @Override
    public void onCreate() {
        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                tts.setLanguage(Locale.FRENCH);
            }
        });
        
        IntentFilter filter = new IntentFilter("com.vhr.TTS_SPEAK");
        registerReceiver(ttsReceiver, filter);
    }
    
    private BroadcastReceiver ttsReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String text = intent.getStringExtra("text");
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "vhr_tts_" + System.currentTimeMillis());
        }
    };
}
```

Puis modifier la route serveur pour envoyer :
```javascript
const ttsIntent = [
  'shell', 'am', 'broadcast',
  '-a', 'com.vhr.TTS_SPEAK',
  '--es', 'text', text
];
```

### Stockage Manager
- Explorer les fichiers du casque
- Upload/Download de fichiers
- Statistiques d'espace disque

### Live Microphone PC → Casque
- Streaming audio temps réel
- WebRTC ou UDP direct
- Latence < 100ms

---

## 🐛 Dépannage

### Le casque n'apparaît pas
1. Vérifiez : `adb devices` dans le terminal
2. Vérifiez `.env` : `NO_ADB=0`
3. Activez le mode développeur sur le casque
4. Autorisez la connexion ADB (popup sur le casque)

### WiFi Auto ne fonctionne pas
1. Le casque doit être connecté en USB d'abord
2. Le WiFi doit être activé sur le casque
3. PC et casque sur le même réseau
4. Vérifiez les logs serveur pour l'IP détectée

### La voix n'émet pas de son
- C'est normal : la fonction TTS audio complète nécessite une app Android
- Actuellement : affichage notification uniquement
- Pour TTS audio : installez l'app VHR TTS Helper (à développer)

### Le serveur ne démarre pas
1. Vérifiez Node.js installé : `node --version`
2. Installez les dépendances : `npm install`
3. Vérifiez le port 3000 libre : `netstat -ano | findstr :3000`

---

## 📝 Crédits

**VHR Dashboard PRO v2.0**
- Développé par : Peter Regat
- Date : Décembre 2025
- Technologies : Node.js, Express, Socket.IO, ADB, Scrcpy
- License : Voir LICENSE

**Améliorations v2.0** :
- ✅ Thème noir professionnel
- ✅ Vue tableau multi-casques
- ✅ WiFi automatique
- ✅ Fonction voix PC → Casque
- ✅ Interface modernisée
- ✅ Animations et effets
- ✅ Responsive design

---

## 🎉 Fonctionnalités Validées

| Demande Utilisateur | Implémentation | Status |
|---|---|---|
| Fond noir | dashboard-pro.css (#0d0f14) | ✅ |
| Tableau multi-casques | renderDevicesTable() | ✅ |
| WiFi automatique | POST /api/adb/wifi-auto | ✅ |
| Voix PC→Casque | POST /api/tts/send | ✅ |
| Toutes fonctions récentes | dashboard-pro.js (890 lignes) | ✅ |
| Fonctions en colonnes | Table avec 7 colonnes | ✅ |

**Version actuelle disponible à** : `http://localhost:3000/vhr-dashboard-pro.html`
