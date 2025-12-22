# 📱 Installateur Android TTS - Guide Complet

## 🎯 Qu'est-ce que c'est ?

L'**Installateur Android TTS** est une interface intégrée directement dans le Dashboard Admin qui permet de:

✅ **Compiler** l'APK directement depuis le serveur  
✅ **Installer** l'APK sur votre Meta Quest via ADB  
✅ **Lancer** l'application automatiquement  
✅ **Gérer** le processus avec une interface graphique professionnelle

## 🚀 Accès Rapide

### Via le Dashboard Admin
1. Aller à `http://localhost:3000/admin-dashboard.html`
2. Cliquer sur l'onglet **"📱 Android TTS"**
3. Suivre les étapes

### Page Dédiée
- Accès direct: `http://localhost:3000/android-installer.html`

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir:

### 1. **Android Studio** (Recommandé)
```bash
# Vérifier l'installation
android --version
# ou
sdkmanager --version
```

### 2. **ADB (Android Debug Bridge)**
```bash
# Vérifier l'installation
adb version
# Output: Android Debug Bridge version X.X.XX
```

### 3. **Meta Quest Connecté**
```bash
# Lister les appareils
adb devices -l
# Output example:
# 192.168.1.28:5555    device  ...
```

### 4. **Mode Débogage USB Activé**
- Casque: Paramètres → Avancé → Options de développement → Débogage USB ✅

## 🔄 Workflow Installation

### Étape 1️⃣ Charger les Appareils
```
[Bouton] 🔄 Charger les appareils
    ↓
Affiche la liste des appareils connectés
```

### Étape 2️⃣ Sélectionner Configuration
```
Build Type:
  ○ Debug APK (Rapide, débogage)    ← Recommandé pour tests
  ● Release APK (Optimisé)          ← Production

Appareil: [Dropdown] 192.168.1.28:5555

Options:
  ☐ Lancer l'app après installation
  ☐ Garder l'APK après installation
```

### Étape 3️⃣ Démarrer Installation
```
[Bouton] 🚀 Démarrer l'installation
    ↓
Compilation (33%) → Installation (66%) → Lancement (100%)
```

### Étape 4️⃣ Suivi Temps Réel
```
Progression:
  ⚙️ Compilation Gradle
  📱 Installation ADB
  🚀 Lancement de l'app
```

## 📊 Structure de Progression

```
┌─────────────────────────────┐
│ 📦 Compilation Gradle       │ ⏳ → ⚙️ → ✅
│ (1-2 min pour first build)  │
├─────────────────────────────┤
│ 📱 Installation ADB         │ ⏳ → ⚙️ → ✅
│ (30-60 secondes)            │
├─────────────────────────────┤
│ 🚀 Lancement App            │ ⏳ → ⚙️ → ✅
│ (5-10 secondes)             │
└─────────────────────────────┘
```

**Durée totale estimée**: 2-4 minutes (first build), 1-2 minutes (builds suivants)

## 🔌 Endpoints API Utilisés

L'interface communique avec le serveur via ces endpoints:

### `GET /api/adb/devices`
**Récupère** la liste des appareils ADB connectés
```json
{
  "ok": true,
  "devices": [
    {
      "serial": "192.168.1.28:5555",
      "status": "device",
      "name": "Quest Pro (oculus)"
    }
  ]
}
```

### `POST /api/android/compile`
**Lance** la compilation Gradle
```json
Request:
{
  "buildType": "debug"  // ou "release"
}

Response:
{
  "ok": true,
  "apkPath": "/path/to/app-debug.apk",
  "size": "45.23",  // MB
  "duration": "65.4",  // secondes
  "message": "APK compiled successfully"
}
```

### `POST /api/android/install`
**Installe** l'APK sur l'appareil
```json
Request:
{
  "deviceSerial": "192.168.1.28:5555",
  "buildType": "debug"
}

Response:
{
  "ok": true,
  "duration": "42.3",
  "message": "APK installed successfully"
}
```

### `POST /api/android/launch`
**Lance** l'application
```json
Request:
{
  "deviceSerial": "192.168.1.28:5555"
}

Response:
{
  "ok": true,
  "duration": "3.1",
  "message": "App launched"
}
```

## ⚙️ Configuration Avancée

### Changer le Type de Build
**Debug** (Défaut):
- ✅ Plus rapide
- ✅ Débogage activé
- ✅ Logs détaillés
- ❌ Fichier plus volumineux

**Release**:
- ✅ Optimisé
- ✅ Production-ready
- ❌ Plus lent à compiler
- ❌ Débogage limité

### Personnaliser l'APK

#### Changer le Package Name
Fichier: `tts-receiver-app/build.gradle.kts`
```kotlin
android {
    namespace = "com.vhr.dashboard"  // ← Changer ici
    compileSdk = 34
}
```

#### Changer le Nom de l'App
Fichier: `tts-receiver-app/src/main/res/values/strings.xml`
```xml
<string name="app_name">VHR TTS Receiver</string>  <!-- ← Changer -->
```

#### Changer l'Icône
Remplacez les fichiers dans:
```
tts-receiver-app/src/main/res/mipmap-*/ic_launcher.png
```

## 🐛 Dépannage

### Problème: "ADB not found"
**Cause**: ADB n'est pas dans le PATH
**Solution**:
```bash
# Option 1: Installer Android SDK Platform Tools
# https://developer.android.com/studio/releases/platform-tools

# Option 2: Ajouter au PATH
$env:PATH += ";C:\Users\YourUser\AppData\Local\Android\Sdk\platform-tools"

# Option 3: Relancer depuis Android Studio Terminal
```

### Problème: "No devices connected"
**Cause**: Casque pas connecté ou mode débogage désactivé
**Solution**:
```bash
# 1. Vérifier connexion
adb devices -l

# 2. Activer mode débogage sur le casque
#    Paramètres → Avancé → Options de développement

# 3. Autoriser la connexion USB
#    Une dialog apparaîtra sur le casque

# 4. Tester la connexion
adb shell getprop ro.build.version.sdk
```

### Problème: "Gradle build failed"
**Cause**: Dépendances manquantes ou version incompatible
**Solution**:
```bash
# 1. Nettoyer le build
cd tts-receiver-app
./gradlew clean

# 2. Relancer depuis le Dashboard
# Ou en ligne de commande:
./gradlew assembleDebug
```

### Problème: "Installation failed"
**Cause**: Pas assez d'espace ou permissions insuffisantes
**Solution**:
```bash
# Vérifier l'espace disque
adb shell df /data

# Désinstaller l'ancienne version
adb uninstall com.vhr.dashboard

# Réinstaller
adb install -r app-debug.apk
```

### Problème: "App won't launch"
**Cause**: Permissions manquantes ou service pas activé
**Solution**:
```bash
# 1. Vérifier les permissions
adb shell pm list permissions

# 2. Voir les logs
adb logcat | grep TtsReceiver

# 3. Réinstaller avec -r flag
adb install -r app-debug.apk

# 4. Lancer manuellement depuis le casque
adb shell am start -n com.vhr.dashboard/.MainActivity
```

## 📖 Logs & Débogage

### Voir les Logs en Temps Réel
```bash
# Filter par package
adb logcat | grep com.vhr.dashboard

# Filter par tag
adb logcat | grep TtsReceiver

# Sauvegarder dans un fichier
adb logcat > logcat.txt
```

### Commandes ADB Utiles
```bash
# Lister les appareils
adb devices -l

# Installer APK
adb install app-debug.apk

# Installer avec remplacement
adb install -r app-debug.apk

# Désinstaller
adb uninstall com.vhr.dashboard

# Lancer app
adb shell am start -n com.vhr.dashboard/.MainActivity

# Arrêter app
adb shell am force-stop com.vhr.dashboard

# Voir la version Android
adb shell getprop ro.build.version.release

# Redémarrer l'appareil
adb reboot
```

## 🎯 Cas d'Usage

### Cas 1: Premier Déploiement
```
1. ✅ Charger les appareils
2. ✅ Sélectionner "Debug APK"
3. ✅ Cocher "Lancer après installation"
4. ✅ Cliquer "🚀 Démarrer"
5. 🎉 L'app se lance automatiquement
```

### Cas 2: Mise à Jour
```
1. ✅ Casque toujours connecté
2. ✅ Cliquer "🚀 Démarrer" directement
3. ✅ L'interface efface l'ancienne version automatiquement (-r flag)
4. 🎉 Nouvelle version installée
```

### Cas 3: Test Release vs Debug
```
Avant Production:
1. ✅ Compiler en "Release APK"
2. ✅ Installer sur casque de test
3. ✅ Vérifier performances
4. ✅ Lancer depuis Playstore (si listé)
```

## 📊 Statistiques

### Tailles APK Typiques
- **Debug APK**: 40-50 MB
- **Release APK (optimisé)**: 30-35 MB

### Durées Typiques
| Action | Durée |
|--------|--------|
| First Gradle Build | 60-90s |
| Incremental Build | 10-20s |
| Installation ADB | 30-60s |
| Lancement App | 3-5s |
| **Total (first)** | **2-3 min** |
| **Total (incremental)** | **1-2 min** |

## 🔗 Ressources

- [Android Studio Docs](https://developer.android.com/studio)
- [ADB Reference](https://developer.android.com/studio/command-line/adb)
- [Gradle Documentation](https://gradle.org/docs)
- [Meta Quest Developer](https://developer.oculus.com/)

## ✅ Checklist Complète

- [ ] Android Studio installé
- [ ] ADB disponible
- [ ] Meta Quest connecté
- [ ] Mode débogage activé
- [ ] Accès à `/admin-dashboard.html`
- [ ] Appareils chargés correctement
- [ ] APK compilé avec succès
- [ ] APK installé sur le casque
- [ ] App lancée sans erreur
- [ ] Service TTS actif
- [ ] Logs consultables

## 💡 Tips & Tricks

### Accélerer les Compilations
```bash
# Augmenter la RAM Gradle
cd tts-receiver-app
echo "org.gradle.jvmargs=-Xmx4g" >> gradle.properties

# Utiliser le daemon Gradle
./gradlew --daemon assembleDebug
```

### Cache les Dépendances
```bash
# Gradle cache automatiquement
# Mais vous pouvez les pré-télécharger
./gradlew downloadDependencies
```

### Développement Itératif
```
1. Modifier le code en Kotlin
2. Cliquer "🚀 Démarrer"
3. Nouvelle version installée en ~30s
4. App relancée automatiquement
```

## 📞 Support

Besoin d'aide?
- 📖 Lire `QUICK_START_TTS.md`
- 📖 Lire `VHR_TTS_RECEIVER_APP.md`
- 📧 Contacter: `contact@vhr-dashboard-site.com`

---

**Version**: 1.0  
**Dernière mise à jour**: 2025-12-07  
**Statut**: Production Ready ✅
