VHR DASHBOARD TTS RECEIVER - ONE-CLICK INSTALLER
=================================================

DEMARRAGE RAPIDE (FR):

1. Connectez votre Meta Quest en USB
2. Double-cliquez sur: VHR-TTS-Installer.bat
3. Suivez les instructions
4. L'application s'installe automatiquement!

DUREE:
- Premiere installation: 5-15 minutes 
  (Gradle telecharge les dependances ~500 MB)
- Installations suivantes: 1-3 minutes


QUICK START (EN):

1. Connect your Meta Quest via USB
2. Double-click: VHR-TTS-Installer.bat
3. Follow the instructions  
4. App installs automatically!

TIME:
- First installation: 5-15 minutes
  (Gradle downloads dependencies ~500 MB)
- Subsequent runs: 1-3 minutes


QU'EST-CE QUI S'INSTALLE AUTOMATIQUEMENT?
==========================================

✓ Java JDK 11 - Telecharge et configure automatiquement
✓ Gradle - Configure automatiquement
✓ APK TTS - Compile automatiquement
✓ Installation sur Meta Quest - Automatique
✓ Lancement de l'app - Automatique


PRE-REQUIS MINIMAUX:
====================

REQUIS (faire avant de lancer l'installateur):
- Meta Quest 2, 3, ou Pro
- Windows 7 ou plus recent
- Windows PowerShell 5.0+
- Android Platform Tools (ADB)
  Telecharger: https://developer.android.com/studio/releases/platform-tools
- Connexion Internet stable

NE PAS BESOIN (installe automatiquement):
- Java JDK ← Telecharge et installe automatiquement
- Gradle ← Configure automatiquement  
- Android Studio ← Non requis


FICHIERS INCLUS:
================

- VHR-TTS-Installer.bat
  Lanceur principal (pour Windows)
  
- VHR-TTS-Complete-Installer.ps1
  Script PowerShell d'installation automatique
  
- QUICK_START.md
  Guide de demarrage rapide
  
- DOCUMENTATION.md
  Documentation technique complete


ETAPES DE L'INSTALLATION:
=========================

1. Verification des prerequis
   ✓ PowerShell 5.0+ ?
   ✓ Projet Android ?
   ✓ ADB disponible ?

2. Installation de Java JDK 11 (si absent)
   - Telecharge OpenJDK 11 depuis Adoptium
   - Configure JAVA_HOME automatiquement
   
3. Configuration de Gradle
   - Utilise le Gradle Wrapper du projet
   
4. Compilation de l'APK
   - gradle assembleDebug
   - Telecharge les dependances (premiere fois)
   - Compile le code
   - Genere l'APK (5-10 MB)

5. Installation sur le casque
   - Detecte l'appareil ADB
   - Transfère l'APK
   - Installe l'app
   - Lance l'app automatiquement

6. Verification
   - L'app est-elle installee ?
   - L'app est-elle lancee sur le casque ?


DEPANNAGE:
==========

Probleme: "ADB non trouve"
Solution:
  1. Telecharger Android Platform Tools
  2. Decompresser dans: C:\Android\platform-tools\
  3. Ajouter au PATH
  4. Redemarrer PowerShell
  5. Verifier: adb version

Probleme: "Aucun appareil detecte"
Solution:
  1. Connectez le casque en USB
  2. Activez le mode developpeur sur le casque
  3. Acceptez le debogage USB sur l'ecran
  4. Relancez l'installation

Probleme: "Erreur Java JDK 11 non trouve"
Solution:
  1. Verifiez: java -version
  2. Doit afficher "openjdk version 11..."
  3. Si absent, relancez le script (il installera Java)

Probleme: "Compilation timeout (>30 minutes)"
Solution:
  1. C'est normal la premiere fois
  2. Attendez - Gradle telecharge les dependances
  3. Les executions suivantes seront rapides


CONFIGURATION APRES INSTALLATION:
==================================

L'app est maintenant installee!

Pour utiliser la fonction voix:

1. Ouvrez le Dashboard: http://localhost:3000/vhr-dashboard-pro.html
2. Allez a: "Envoyeur de Voix"
3. Entrez un texte
4. Cliquez: "Envoyer au casque"
5. Ecoutez le casque parler!


SUPPORT:
========

Documentation: Consultez QUICK_START.md ou DOCUMENTATION.md
Contact: https://vhr-dashboard-site.onrender.com/contact.html
Email: support@vhr-dashboard.com


VERSION: 2.0
DATE: Decembre 2025
STATUT: Pret pour distribution
