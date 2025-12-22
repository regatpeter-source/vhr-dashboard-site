# 🎙️ VHR Dashboard - Système Vocal Complet

## 📊 Résumé de ce qui a été créé

Vous avez maintenant un **système vocal complet** pour communiquer avec votre casque Quest !

### ✅ 3 Composants Implémentés

1. **Backend TTS** (Node.js)
   - ✅ Route API `/api/tts/send`
   - ✅ Integration ADB pour casque
   - ✅ Gestion des broadcasts

2. **Module Dashboard** (Frontend JavaScript)
   - ✅ Interface utilisateur complète
   - ✅ Sélection des appareils
   - ✅ Historique des messages
   - ✅ Test navigateur (fallback)

3. **Application Android** (Casque Quest)
   - ✅ Service TextToSpeech natif
   - ✅ BroadcastReceiver pour écouter
   - ✅ Interface Jetpack Compose
   - ✅ Historique avec UI moderne

---

## 📁 Structure des Fichiers

```
vhr-dashboard-site/
│
├── 📱 tts-receiver-app/              ← APP ANDROID
│   ├── README.md                      # Guide complet
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/vhr/dashboard/
│       │   ├── MainActivity.kt        # UI principale
│       │   ├── TtsService.kt          # Service TTS
│       │   ├── TtsReceiver.kt         # Récepteur
│       │   ├── BootReceiver.kt        # Auto-start
│       │   └── TtsViewModel.kt        # État
│       └── res/
│           └── values/
│               ├── colors.xml
│               ├── strings.xml
│               └── styles.xml
│
├── 📚 Documentation/
│   ├── VHR_TTS_RECEIVER_APP.md        # Guide technique (450+ lignes)
│   ├── VOICE_FUNCTION_SETUP.md        # Architecture
│   ├── QUICK_START_TTS.md             # Installation rapide ⭐
│   └── TTS_IMPLEMENTATION_SUMMARY.md  # Ce fichier
│
├── 🌐 Frontend Dashboard/
│   └── public/js/tts-voice-module.js  # Module UI complet
│
└── 🔧 Backend/
    └── server.js                       # Route /api/tts/send
```

---

## 🚀 Démarrage Rapide

### **Option 1: Installation Complète** (10 min)

```bash
# 1. Lire le guide
cat QUICK_START_TTS.md

# 2. Ouvrir dans Android Studio
# File > Open > tts-receiver-app

# 3. Compiler
./gradlew assembleDebug

# 4. Installer
adb install -r tts-receiver-app/app/build/outputs/apk/debug/app-debug.apk

# 5. Lancer
adb shell am start -n com.vhr.dashboard/.MainActivity

# 6. Tester
curl -X POST http://localhost:3000/api/tts/send \
  -H "Content-Type: application/json" \
  -d '{"serial": "192.168.1.28:5555", "text": "Test vocal"}'
```

### **Option 2: Lire la Documentation** (5 min)

1. **QUICK_START_TTS.md** - Guide d'installation (recommandé d'abord!)
2. **VHR_TTS_RECEIVER_APP.md** - Code source détaillé
3. **VOICE_FUNCTION_SETUP.md** - Architecture technique

---

## 📋 Checklist d'Installation

- [ ] Lire **QUICK_START_TTS.md**
- [ ] Ouvrir projet dans Android Studio
- [ ] Compiler l'APK
- [ ] Installer sur casque Quest
- [ ] Vérifier que l'app s'est lancée
- [ ] Tester avec cURL
- [ ] Tester via Dashboard
- [ ] Profiter de la voix! 🎉

---

## 🧪 Tester le Système

### **Test 1: Via Terminal** (30 sec)

```bash
curl -X POST http://localhost:3000/api/tts/send \
  -H "Content-Type: application/json" \
  -d '{
    "serial": "192.168.1.28:5555",
    "text": "Bienvenue sur VHR Dashboard"
  }'
```

### **Test 2: Via Dashboard** (1 min)

1. Ouvrir `http://localhost:3000/vhr-dashboard-pro.html`
2. Scroller jusqu'à "🎙️ Envoyeur de Voix"
3. Saisir un message
4. Cliquer "📤 Envoyer au casque"

### **Test 3: Via Logcat** (2 min)

```bash
adb logcat | grep TtsReceiver
# Vous devriez voir les logs en temps réel
```

---

## 📊 Architecte: Flux Complet

```
┌─────────────────────────────────┐
│ Dashboard PC (Web)              │
│  - Interface utilisateur        │
│  - Formulaire d'envoi           │
│  - Historique                   │
└──────────┬──────────────────────┘
           │
           │ POST /api/tts/send
           │ {serial, text}
           │
           ▼
┌─────────────────────────────────┐
│ Serveur Node.js                 │
│  - Reçoit la requête            │
│  - Prépare le broadcast ADB     │
│  - Envoie au casque             │
└──────────┬──────────────────────┘
           │
           │ adb shell am broadcast
           │ -a com.vhr.dashboard.TTS_MESSAGE
           │ --es "text" "..."
           │
           ▼
┌─────────────────────────────────┐
│ Casque Quest (Android)          │
│  - BroadcastReceiver écoute    │
│  - Lance TtsService             │
│  - TextToSpeech prononce        │
│  - Affiche dans l'UI            │
│  - Mise à jour historique       │
└─────────────────────────────────┘
           │
           ▼
        🔊 AUDIO
```

---

## 🎯 Fonctionnalités Implémentées

### **Backend**
- ✅ API REST `/api/tts/send`
- ✅ Support multi-appareils
- ✅ Broadcast Android
- ✅ Gestion erreurs

### **Frontend**
- ✅ Interface Compose modern
- ✅ Sélection casque/broadcast
- ✅ Historique complet
- ✅ Test navigateur
- ✅ Compteur messages
- ✅ Statuts temps réel

### **Android App**
- ✅ Service TTS natif
- ✅ BroadcastReceiver
- ✅ ViewModel avec StateFlow
- ✅ UI Jetpack Compose
- ✅ Permissions gérées
- ✅ Logs détaillés
- ✅ Démarrage auto
- ✅ Fallback langue

---

## 🔧 Configuration

### **Changer la Langue** (Français → Anglais)

**Fichier:** `tts-receiver-app/src/main/java/com/vhr/dashboard/TtsService.kt`

```kotlin
// Ligne 35, remplacer:
val locale = java.util.Locale("fr", "FR")  // Français

// Par:
val locale = java.util.Locale("en", "US")  // Anglais
```

### **Customiser les Couleurs**

**Fichier:** `tts-receiver-app/src/main/res/values/colors.xml`

```xml
<color name="primary">#667EEA</color>    ← Changer cette couleur
<color name="primary_dark">#764BA2</color>
```

### **Changer le Serial du Casque**

```bash
# Trouver votre serial:
adb devices -l
# Exemple output: 192.168.1.28:5555    device

# Utiliser dans les commandes:
curl -X POST http://localhost:3000/api/tts/send \
  -H "Content-Type: application/json" \
  -d '{"serial": "VOTRE_SERIAL_ICI", "text": "Test"}'
```

---

## 📞 Support & FAQ

### **Q: L'app ne s'installe pas**
A: Essayer avec `-r` (replace):
```bash
adb install -r tts-receiver-app/app/build/outputs/apk/debug/app-debug.apk
```

### **Q: Pas de son sur le casque**
A: Vérifier le volume (boutons latéraux) et les paramètres audio

### **Q: Comment tester sans casque?**
A: Utiliser le bouton "🔊 Test (Navigateur)" dans le Dashboard

### **Q: Changer la langue du casque?**
A: Vérifier `VOICE_FUNCTION_SETUP.md` section Dépannage

### **Q: Oublié le serial du casque?**
A: Commande: `adb devices -l`

---

## 📚 Ressources Complémentaires

- [Android TextToSpeech](https://developer.android.com/reference/android/speech/tts/TextToSpeech)
- [Jetpack Compose](https://developer.android.com/jetpack/compose)
- [ADB Commands](https://developer.android.com/studio/command-line/adb)
- [Meta Quest Dev](https://developer.oculus.com/)

---

## 🎉 Vous Êtes Prêt!

Tout ce qu'il vous faut est en place. Il ne vous reste qu'à:

1. ✅ Compiler l'app Android
2. ✅ L'installer sur votre Quest
3. ✅ Tester depuis le Dashboard
4. ✅ Profiter de la voix!

**Bonne chance! 🚀**

---

## 📊 Commits Associés

| Commit | Description |
|--------|-------------|
| `ca32e52` | Quick start guide for TTS |
| `4edf1c2` | Complete Android TTS app |
| `6911e42` | Voice setup guide |
| `26b1343` | TTS documentation + module |
| `ad9cacf` | Message system improvements |

---

**Version:** 1.0  
**Date:** 2025-12-07  
**Auteur:** VHR Dashboard Team  
**Support:** contact@vhr-dashboard-site.com
