# 🎙️ VHR TTS Receiver - Application Android

Application native Android pour recevoir et prononcer les messages texte envoyés depuis le Dashboard VHR.

## 📱 Fonctionnalités

- ✅ Réception en temps réel des messages via broadcast Android
- ✅ Conversion texte-parole native (TextToSpeech)
- ✅ Interface Jetpack Compose moderne
- ✅ Historique des messages
- ✅ Support du français et anglais
- ✅ Service en arrière-plan permanent
- ✅ Démarrage automatique au boot

## 🛠️ Configuration Requise

- **Android SDK**: 26+ (Android 8.0+)
- **Kotlin**: 1.9+
- **Gradle**: 8.0+
- **Android Studio**: 2023.1+

## 📦 Fichiers Inclus

```
tts-receiver-app/
├── build.gradle.kts          # Configuration Gradle
├── settings.gradle.kts        # Configuration Gradle root
├── src/
│   └── main/
│       ├── AndroidManifest.xml
│       ├── java/com/vhr/dashboard/
│       │   ├── MainActivity.kt         # Activity principale
│       │   ├── TtsService.kt           # Service TextToSpeech
│       │   ├── TtsReceiver.kt          # BroadcastReceiver
│       │   ├── BootReceiver.kt         # Receiver au démarrage
│       │   └── TtsViewModel.kt         # ViewModel (état)
│       └── res/
│           └── values/
│               ├── strings.xml         # Ressources texte
│               ├── colors.xml          # Couleurs
│               └── styles.xml          # Styles
```

## 🚀 Installation Rapide

### 1. Ouvrir dans Android Studio

```bash
# Cloner le repo
git clone https://github.com/regatpeter-source/vhr-dashboard-site.git
cd vhr-dashboard-site/tts-receiver-app

# Ouvrir dans Android Studio
# File > Open > Sélectionner ce dossier
```

### 2. Compiler

```bash
./gradlew assembleDebug
```

### 3. Installer sur Quest

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 4. Lancer l'application

```bash
adb shell am start -n com.vhr.dashboard/.MainActivity
```

## 📋 Structure du Code

### TtsService.kt
- Initialise TextToSpeech au démarrage
- Écoute les intentions `ACTION_SPEAK`
- Prononce le texte via TTS natif
- Gère les erreurs et fallbacks

### TtsReceiver.kt
- BroadcastReceiver pour `com.vhr.dashboard.TTS_MESSAGE`
- Extrait le texte et l'ID
- Démarre TtsService pour la prononciation

### MainActivity.kt
- Interface utilisateur Compose
- Affiche l'historique des messages
- Gestion des permissions
- Démarrage du service

### TtsViewModel.kt
- Gestion de l'état avec StateFlow
- Historique des messages
- Compteur de messages

## 🧪 Test depuis le Dashboard

### Via cURL

```bash
curl -X POST http://localhost:3000/api/tts/send \
  -H "Content-Type: application/json" \
  -d '{
    "serial": "192.168.1.28:5555",
    "text": "Bienvenue sur VHR Dashboard"
  }'
```

### Via JavaScript Dashboard

```javascript
// Le module tts-voice-module.js s'en charge automatiquement
TTS.send('192.168.1.28:5555', 'Votre message ici');
```

## 🔍 Vérifier que ça fonctionne

### 1. Vérifier que l'app est installée
```bash
adb shell pm list packages | grep vhr
```

### 2. Vérifier que le service s'est lancé
```bash
adb shell ps | grep com.vhr.dashboard
```

### 3. Voir les logs en temps réel
```bash
adb logcat | grep TtsReceiver
adb logcat | grep TtsService
```

### 4. Envoyer un test
```bash
curl -X POST http://localhost:3000/api/tts/send \
  -H "Content-Type: application/json" \
  -d '{"serial": "192.168.1.28:5555", "text": "Test audio"}'
```

Vous devriez entendre le casque prononcer "Test audio".

## 📞 Dépannage

### L'app ne démarre pas
```bash
# Vérifier les erreurs
adb shell am start -n com.vhr.dashboard/.MainActivity -v

# Voir les logs
adb logcat | grep com.vhr.dashboard
```

### Le texte n'est pas prononcé
1. Vérifier le volume du casque
2. Vérifier le service est actif: `adb shell ps | grep TtsService`
3. Vérifier les logs: `adb logcat | grep TtsService`
4. Vérifier la langue disponible: `adb shell settings get system text_to_speech_default_synth`

### Installer la langue française
```bash
# Sur le casque, aller dans Settings > System > Languages
# Ou installer via Google Play:
adb shell pm install -r -g com.google.android.tts
```

## 🎯 Prochaines Étapes

1. ✅ Compiler et installer l'APK
2. ✅ Tester avec cURL
3. ✅ Tester depuis le Dashboard
4. ✅ Vérifier l'historique dans l'app
5. ✅ Profiter de la voix sur votre casque VR!

## 📚 Ressources

- [Android TextToSpeech](https://developer.android.com/reference/android/speech/tts/TextToSpeech)
- [BroadcastReceiver](https://developer.android.com/guide/components/broadcasts)
- [Jetpack Compose](https://developer.android.com/jetpack/compose)
- [Services Android](https://developer.android.com/guide/components/services)

## 📄 Licence

Licence compatible avec VHR Dashboard

## 📞 Support

contact@vhrdashboard.com
