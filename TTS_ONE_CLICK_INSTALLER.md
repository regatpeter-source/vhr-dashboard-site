# 🎯 VHR Dashboard TTS - Installation en 1 Clic

## ⚡ Concept: Zéro Dépendance

Cet installateur automatique télécharge et configure **tout ce dont vous avez besoin** en une seule exécution.

### ✨ Qu'est-ce qui est Automatisé?

| Besoin | Avant | Maintenant |
|--------|-------|-----------|
| Java JDK 11 | ❌ Manuel (installer depuis java.com) | ✅ Auto-téléchargé et configuré |
| Gradle | ❌ Manuel (configurer dans PATH) | ✅ Auto-configuré avec le wrapper |
| Compilation | ❌ Terminal avec 3-4 commandes | ✅ 1 clic - tout est fait |
| Installation APK | ❌ Chercher l'APK compilée | ✅ Auto-trouvée et installée |

---

## 🚀 Utilisation Rapide

### Pour Windows (Recommandé)

**Option 1: Double-clic (Le Plus Facile)**
1. Allez à: `scripts/`
2. Double-cliquez sur: `VHR-TTS-Installer.bat`
3. Sélectionnez "Installation Complète"
4. Attendez ~10-15 minutes (première fois)
5. ✅ C'est installé!

**Option 2: PowerShell (Plus de contrôle)**
```powershell
# Ouvrez PowerShell dans le dossier du projet
cd scripts
.\VHR-TTS-Complete-Installer.ps1
```

### Options Avancées

```powershell
# Compiler seulement (sans installer)
.\VHR-TTS-Complete-Installer.ps1 -SkipInstall

# Installer seulement (APK déjà compilée)
.\VHR-TTS-Complete-Installer.ps1 -SkipCompile -SkipJava -SkipGradle

# Installer sur un appareil spécifique
.\VHR-TTS-Complete-Installer.ps1 -DeviceSerial "192.168.1.28:5555"
```

---

## 📋 Prérequis

### ✅ Requis (à faire avant de lancer)

- [ ] **Meta Quest 2, 3, ou Pro** - Connecté en USB
- [ ] **Windows 7+** - Avec PowerShell 5.0+
- [ ] **Android Platform Tools (ADB)** - [Télécharger](https://developer.android.com/studio/releases/platform-tools)
- [ ] **Connexion Internet** - Pour télécharger les dépendances

### ❌ NE PAS Besoin d'Installer (Automatique)

- ~~Java JDK 11~~ ✅ Téléchargé et installé automatiquement
- ~~Gradle~~ ✅ Configuré automatiquement
- ~~Android Studio~~ ✅ Non requis

---

## ⏱️ Temps Estimé

| Phase | Première Fois | Exécutions Suivantes |
|-------|--------|---------|
| Installation Java | ~3 min | ⏭️ Ignorée |
| Configuration Gradle | ~1 min | ⏭️ Ignorée |
| Compilation APK | 5-15 min | 1-3 min |
| Installation ADB | ~1 min | ~1 min |
| **Total** | **10-20 min** | **3-5 min** |

**Pourquoi c'est long la première fois?**
- Gradle télécharge ~500 MB de dépendances
- Android SDK télécharge les outils de compilation
- Les compilations suivantes utilisent un cache

---

## 🔧 Installation d'ADB (Prérequis Unique)

### Windows

1. Téléchargez: [Android Platform Tools](https://developer.android.com/studio/releases/platform-tools)
2. Décompressez dans: `C:\Android\platform-tools\`
3. Ajouter au PATH:
   - Ouvrez: `Propriétés du système` → `Variables d'environnement`
   - Cliquez: `Nouvelle`
   - Nom: `ADB_PATH`
   - Valeur: `C:\Android\platform-tools`
   - Éditez `PATH` et ajoutez: `%ADB_PATH%`
4. Redémarrez PowerShell
5. Vérifiez: `adb version`

### macOS/Linux

```bash
# Installez avec Homebrew (macOS)
brew install android-platform-tools

# Ou téléchargez directement depuis:
# https://developer.android.com/studio/releases/platform-tools
```

---

## 📦 Structure des Fichiers

```
scripts/
├── VHR-TTS-Installer.bat                  ← Double-cliquez (Windows)
├── VHR-TTS-Complete-Installer.ps1         ← Script principal PowerShell
├── Create-TTS-Installer-Package.ps1       ← Crée le ZIP téléchargeable
└── install-build-tools.ps1                ← Legacy (remplacé par le nouveau)

tts-receiver-app/                          ← Code source Android
├── build.gradle.kts                       ← Configuration Gradle
├── gradlew                                ← Gradle Wrapper (Linux/macOS)
├── gradlew.bat                            ← Gradle Wrapper (Windows)
└── app/build/outputs/apk/debug/
    └── app-debug.apk                      ← APK compilée (générée)
```

---

## 🎯 Ce que le Script Fait

### 1️⃣ Vérification des Prérequis
```
✓ PowerShell 5.0+ vérifié
✓ Projet Android trouvé
✓ ADB disponible
```

### 2️⃣ Installation de Java JDK 11
```
📥 Télécharge OpenJDK 11 depuis Adoptium
📦 Décompresse vers: C:\Java\jdk-11
🔧 Configure JAVA_HOME
✓ Java prêt
```

### 3️⃣ Configuration de Gradle
```
🔍 Détecte le Gradle Wrapper dans le projet
✓ Gradle Wrapper prêt
```

### 4️⃣ Compilation de l'APK
```
🧹 Nettoyage (gradle clean)
⚙️ Compilation (gradlew assembleDebug)
  ↳ Télécharge les dépendances (première fois)
  ↳ Compile le code
  ↳ Crée l'APK
✓ app-debug.apk généré (5-10 MB)
```

### 5️⃣ Installation sur le Casque
```
🔍 Détecte l'appareil ADB
📱 Sélectionne le Meta Quest
📤 Transfère l'APK
🚀 Lance l'app TTS
✓ App visible sur le casque
```

### 6️⃣ Vérification
```
✓ App installée: com.vhr.dashboard
📖 Guide d'utilisation affiché
```

---

## 🧪 Tester Après Installation

### Test 1: Vérifier que l'app est installée
```bash
adb shell pm list packages | findstr vhr
# Résultat attendu: com.vhr.dashboard
```

### Test 2: Voir les logs en direct
```bash
# Terminal 1: Voir les logs
adb logcat | findstr TtsReceiver

# Terminal 2: Envoyer un message (dans un autre terminal)
curl -X POST http://localhost:3000/api/tts/send \
  -H "Content-Type: application/json" \
  -d '{"serial": "VOTRE_SERIAL", "text": "Test audio"}'

# Vous verrez dans Terminal 1:
# D/TtsReceiver: 📬 Broadcast reçu
# D/TtsReceiver: 💬 Texte à prononcer: 'Test audio'
```

### Test 3: Via le Dashboard
1. Ouvrez: http://localhost:3000/vhr-dashboard-pro.html
2. Allez à: "🎙️ Envoyeur de Voix"
3. Entrez: "Bienvenue sur VHR"
4. Cliquez: "Envoyer au casque"
5. Écoutez le casque parler! ✅

---

## ❌ Dépannage

### Problème: "ADB non trouvé"
```
Cause: Android Platform Tools pas installé
Solution:
  1. Téléchargez: https://developer.android.com/studio/releases/platform-tools
  2. Décompressez dans: C:\Android\platform-tools\
  3. Ajoutez au PATH
  4. Redémarrez le terminal
  5. Vérifiez: adb version
```

### Problème: "Aucun appareil détecté"
```
Cause: Meta Quest pas connecté ou mode débogage désactivé
Solution:
  1. Connectez le casque en USB
  2. Sur le casque, allez à: Paramètres → Système → Développeur
  3. Activez: "Débogage USB"
  4. Acceptez la demande sur l'écran du casque
  5. Relancez l'installation
```

### Problème: "Erreur de compilation - Java non trouvé"
```
Cause: JAVA_HOME non défini ou Java JDK 11 pas compatible
Solution:
  1. Vérifiez: java -version
  2. Doit afficher: "openjdk version "11..."
  3. Si absent, relancez le script (il installera Java)
  4. Si problème persiste:
     - Supprimez: C:\Java\
     - Relancez le script
```

### Problème: "Compilation lente ou timeout"
```
Cause: Première compilation avec téléchargement des dépendances
Solution:
  1. C'est normal - peut prendre 15-20 minutes
  2. Ne fermez pas la fenêtre
  3. Vérifiez votre connexion Internet
  4. Les exécutions suivantes seront rapides (cache)
```

---

## 📊 Architecture

```
Utilisateur
   ↓
[Double-clic] VHR-TTS-Installer.bat
   ↓
[PowerShell] VHR-TTS-Complete-Installer.ps1
   ├─ Check Prerequisites (PowerShell, ADB)
   ├─ Install Java JDK 11
   │  └─ Télécharge depuis: Adoptium (GitHub)
   ├─ Configure Gradle
   │  └─ Utilise le Gradle Wrapper du projet
   ├─ Compile APK
   │  └─ Exécute: gradlew assembleDebug
   │     ├─ Télécharge dépendances (première fois)
   │     └─ Compile en Kotlin/Java
   ├─ Détecte Meta Quest (ADB)
   ├─ Installe APK
   │  └─ Exécute: adb install -r app-debug.apk
   └─ Lance l'app
      └─ Exécute: adb shell am start
         ↓
      [App TTS lancée sur le casque] ✅
```

---

## 🎓 Pour les Développeurs

### Créer le Package ZIP Téléchargeable
```powershell
.\Create-TTS-Installer-Package.ps1
# Crée: VHR-TTS-Installer.zip (~50 MB)
# Prêt à être téléchargé par les utilisateurs
```

### Options de Compilation Avancées
```powershell
# Debug (ce que le script utilise par défaut)
./gradlew assembleDebug

# Release (optimisé pour production)
./gradlew assembleRelease

# Signer l'APK Release
./gradlew assembleRelease --signing-key="path/to/key"
```

---

## 📚 Documentation Supplémentaire

- **QUICK_START_TTS.md** - Guide de démarrage rapide avec exemples
- **VHR_TTS_RECEIVER_APP.md** - Documentation technique complète
- **TTS_IMPLEMENTATION_SUMMARY.md** - Vue d'ensemble de l'implémentation

---

## 🤝 Support

**Erreur ou question?**
- 📧 Email: support@vhr-dashboard-site.com
- 🔗 Contact: https://vhr-dashboard-site.onrender.com/contact.html
- 📖 Docs: Consultez les fichiers README et QUICK_START

---

## ✅ Checklist Avant de Distribuer

- [ ] Java JDK 11 s'installe correctement
- [ ] Gradle configure automatiquement
- [ ] APK compile sans erreur
- [ ] APK installe sur Meta Quest
- [ ] App TTS se lance sur le casque
- [ ] Package ZIP crée avec succès
- [ ] Lien de téléchargement fonctionne

---

**Version:** 2.0  
**Dernière mise à jour:** Décembre 2025  
**Statut:** ✅ Prêt pour distribution
