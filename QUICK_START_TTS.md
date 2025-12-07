# ⚡ QUICK START: Installer la Fonction Voix en 10 minutes

## 📋 Checklist Rapide

```
✅ 1. Cloner le code Android              (2 min)
✅ 2. Ouvrir dans Android Studio           (1 min)
✅ 3. Compiler l'APK                       (5 min)
✅ 4. Installer sur Quest                  (1 min)
✅ 5. Tester avec Dashboard                (1 min)
```

---

## 🚀 Étapes d'Installation

### **Étape 1: Récupérer le Code** (2 min)

```bash
# Le code est dans votre repo
# Structure:
# vhr-dashboard-site/
#   ├── tts-receiver-app/          ← App Android
#   ├── public/js/tts-voice-module.js  ← Module Dashboard
#   └── ...
```

### **Étape 2: Ouvrir dans Android Studio** (1 min)

1. Ouvrir **Android Studio**
2. **File** → **Open**
3. Naviguer vers `vhr-dashboard-site/tts-receiver-app/`
4. Cliquer sur **Open**
5. Attendre la synchronisation Gradle (2-3 min)

**Alternative (Terminal):**
```bash
cd tts-receiver-app
./gradlew sync
```

### **Étape 3: Compiler l'APK** (5 min)

**Méthode 1: Android Studio (Interface)**
1. **Build** → **Build Bundle(s)/APK(s)** → **Build APK(s)**
2. Attendre la compilation
3. Cliquer sur **Locate** quand c'est terminé

**Méthode 2: Terminal**
```bash
cd tts-receiver-app
./gradlew assembleDebug
# L'APK sera dans: app/build/outputs/apk/debug/app-debug.apk
```

### **Étape 4: Installer sur Quest** (1 min)

**Prérequis:**
- Casque Quest connecté en USB
- ADB activé sur le casque
- `adb devices` montre votre casque

**Installation:**
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
# Ou si c'est déjà installé:
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

**Vérifier:**
```bash
adb shell pm list packages | grep vhr
# Doit afficher: com.vhr.dashboard
```

### **Étape 5: Lancer l'App** (30 sec)

```bash
adb shell am start -n com.vhr.dashboard/.MainActivity
```

Vous devriez voir l'app sur le casque avec:
- 🎙️ VHR TTS Receiver
- 🟢 Statut: Écouteur actif
- 💬 Messages: 0

---

## 🧪 Test Immédiat

### **Test 1: Via cURL** (30 sec)

```bash
# Depuis le terminal de votre PC:
curl -X POST http://localhost:3000/api/tts/send \
  -H "Content-Type: application/json" \
  -d '{
    "serial": "192.168.1.28:5555",
    "text": "Test audio du casque"
  }'
```

**Résultat attendu:**
- Le casque prononce "Test audio du casque"
- L'app affiche le message dans l'historique
- Status change en ✅

### **Test 2: Via Dashboard** (1 min)

1. Ouvrir `http://localhost:3000/vhr-dashboard-pro.html`
2. Scroller jusqu'à "🎙️ Envoyeur de Voix"
3. Saisir: "Bienvenue sur VHR"
4. Cliquer "📤 Envoyer au casque"
5. Écouter le casque prononcer

---

## 📊 Vérifier l'Installation

### **L'app est installée?**
```bash
adb shell pm list packages | grep vhr
```

### **Le service TTS s'est lancé?**
```bash
adb shell ps | grep com.vhr.dashboard
# Doit afficher un processus actif
```

### **Voir les logs en direct**
```bash
# Terminal 1: Lancer les logs
adb logcat | grep TtsReceiver

# Terminal 2: Envoyer un message
curl -X POST http://localhost:3000/api/tts/send \
  -H "Content-Type: application/json" \
  -d '{"serial": "192.168.1.28:5555", "text": "Test"}'

# Vous devriez voir dans Terminal 1:
# D/TtsReceiver: 📬 Broadcast reçu
# D/TtsReceiver: 💬 Texte à prononcer: 'Test'
```

---

## ❌ Dépannage Rapide

| Problème | Solution |
|----------|----------|
| **APK ne compile pas** | `./gradlew clean assembleDebug` |
| **Appareil non trouvé** | `adb devices` doit montrer votre Quest |
| **App ne s'installe pas** | Vérifier: `adb shell pm install -r -g app.apk` |
| **App se ferme** | Vérifier les logs: `adb logcat com.vhr.dashboard` |
| **Pas de son** | Vérifier le volume du casque (boutons latéraux) |
| **Dashboard ne voit pas le casque** | Vérifier le serial du casque: `adb shell getprop ro.serialno` |

---

## 📞 Support Express

### **Erreur Gradle?**
```bash
# Solution universelle:
cd tts-receiver-app
./gradlew clean
./gradlew assembleDebug
```

### **App bug immédiatement?**
```bash
# Voir les erreurs:
adb logcat -e "com.vhr.dashboard|E"
```

### **Casque pas détecté?**
```bash
# Vérifier la connection ADB:
adb devices -l
# Doit montrer "device" (pas "unauthorized")

# Si unauthorized, faire:
adb kill-server
adb start-server
adb shell "mkdir -p /sdcard/vhr_logs"
```

---

## ✅ Vous êtes Prêt!

Une fois l'app installée et testée:

1. ✅ Ouvrir le Dashboard
2. ✅ Saisir un message texte
3. ✅ Cliquer "Envoyer"
4. ✅ Écouter le casque prononcer
5. ✅ Voir l'historique dans l'app

**Voilà! Votre fonction voix est active!** 🎉

---

## 📚 Fichiers Importants

| Fichier | But |
|---------|-----|
| `tts-receiver-app/README.md` | Guide complet de l'app |
| `VHR_TTS_RECEIVER_APP.md` | Documentation technique |
| `public/js/tts-voice-module.js` | Module Dashboard |
| `VOICE_FUNCTION_SETUP.md` | Guide architecture |

---

## 🎯 Prochains Pas (Optionnel)

- [ ] Customiser les couleurs (colors.xml)
- [ ] Changer la langue (TtsService.kt ligne 35)
- [ ] Ajouter des notifications (TtsService.kt)
- [ ] Intégrer avec votre API (TtsReceiver.kt)

---

**Durée totale: ~10 minutes**  
**Difficulté: ⭐ Très facile**  
**Support: contact@vhrdashboard.com**
