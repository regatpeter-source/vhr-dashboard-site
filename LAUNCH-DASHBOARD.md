# 🚀 Guide de lancement du Dashboard VHR en local

## Vue d'ensemble

Pour faciliter l'accès au **VHR Dashboard**, nous proposons un launcher PowerShell qui automatise complètement le processus de téléchargement, extraction et lancement du dashboard en un seul clic.

## 🎯 Prérequis

- **Windows** 7 ou supérieur
- **PowerShell** 5.0 ou supérieur (inclus par défaut dans Windows 7+)
- **Navigateur web** moderne (Chrome, Edge, Firefox, etc.)
- **Espace disque** : environ 500 MB (temporaire)
- **Connexion Internet** (pour télécharger le dashboard)

### Vérifier votre version de PowerShell

Ouvrez PowerShell et exécutez :
```powershell
$PSVersionTable.PSVersion
```

Vous devriez voir une version 5.0 ou supérieure.

## 📥 Installation du Launcher

### Option 1 : Via le site web (recommandé)

1. Accédez à la page de lancement : https://vhr-dashboard-site.onrender.com/launch-dashboard.html
2. Cliquez sur le bouton **"🚀 Lancer le Dashboard"**
3. Le script `launch-dashboard.ps1` sera téléchargé
4. Ouvrez le fichier téléchargé avec PowerShell

### Option 2 : Téléchargement direct

1. Téléchargez le script PowerShell : `/download/launch-script`
2. Sauvegardez-le dans un dossier de votre choix
3. Ouvrez PowerShell
4. Exécutez : `.\launch-dashboard.ps1`

## ▶️ Exécution du Script

### Étape 1 : Ouvrir PowerShell

- Appuyez sur **Windows + R**
- Tapez `powershell` et appuyez sur Entrée
- Ou recherchez "PowerShell" dans le menu Démarrer

### Étape 2 : Exécuter le script

```powershell
.\launch-dashboard.ps1
```

Si vous obtenez une erreur de politique d'exécution, exécutez d'abord :

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Puis réessayez : `.\launch-dashboard.ps1`

### Si vous récupérez le pack ZIP manuellement

1. Téléchargez et **extrayez entièrement** l'archive (ne lancez pas les fichiers depuis l'intérieur du ZIP).
2. Ouvrez le dossier `client-pack` du pack extrait.
3. Double-cliquez sur `start-dashboard-pro.bat` (ou exécutez `start-dashboard-pro.ps1`).
4. Si Windows affiche "chemin introuvable", l'extraction est incomplète ou le fichier est lancé hors du dossier `client-pack` : ré-extrayez puis relancez.

## 🔄 Processus automatisé

Le script effectue les étapes suivantes automatiquement :

```
[1/4] 📥 Téléchargement
     ↓
     Télécharge VHR-Dashboard-Portable.zip
     depuis les serveurs VHR

[2/4] 📦 Extraction
     ↓
     Extrait le fichier dans un dossier temporaire
     (C:\Users\...\AppData\Local\Temp\VHR-Dashboard)

[3/4] 🔍 Localisation
     ↓
     Recherche l'exécutable ou index.html
     du dashboard

[4/4] 🚀 Lancement
     ↓
     Lance le dashboard dans votre navigateur par défaut
```

## ✅ Vous verrez

- Messages de progression colorés en cyan/jaune/vert
- Un compteur pour chaque étape : [1/4], [2/4], etc.
- Emojis pour une meilleure lisibilité
- À la fin : votre dashboard s'ouvre automatiquement

## 🧹 Nettoyage

Le script **nettoie automatiquement** après lui-même :
- Le fichier ZIP téléchargé est supprimé
- Aucun fichier temporaire n'est laissé

## ❌ Résolution des problèmes

### Le script ne s'exécute pas

**Erreur:** `PowerShell cannot be loaded because running scripts is disabled on this system`

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Répondez `Y` (Oui) quand on vous le demande.

---

### Le téléchargement échoue

**Erreur:** `Erreur de téléchargement du fichier`

**Solutions:**
1. Vérifiez votre connexion Internet
2. Assurez-vous que le serveur est accessible : https://vhr-dashboard-site.onrender.com
3. Attendez quelques secondes et réessayez

---

### Le dashboard ne se lance pas

**Erreur:** `Erreur lors du lancement du dashboard`

**Solutions:**
1. Vérifiez que vous avez les droits administrateur
2. Vérifiez que le navigateur par défaut fonctionne
3. Essayez d'ouvrir manuellement le fichier `index.html` depuis le dossier d'extraction

---

### Problème d'espace disque

**Erreur:** `Pas assez d'espace disque`

**Solutions:**
1. Libérez au moins 500 MB d'espace sur votre disque C:
2. Nettoyez vos fichiers temporaires : `Disk Cleanup`
3. Supprimez les anciens fichiers inutilisés

---

### Accès refusé

**Erreur:** `Accès refusé` lors de l'extraction

**Solutions:**
1. Redémarrez PowerShell en tant qu'administrateur
2. Vérifiez que le dossier `Temp` n'est pas protégé
3. Désactivez temporairement votre antivirus

## 📞 Support

Si vous rencontrez un problème :

1. **Consultez cette documentation** - Une solution pourrait être listée ci-dessus
2. **Contactez-nous** via notre formulaire de contact
3. **Envoyez les logs** - Copiez/collez les messages d'erreur du PowerShell

## 🔐 Sécurité

- Le script est **open-source** et transparent
- Vous pouvez voir exactement ce qu'il fait dans `scripts/launch-dashboard.ps1`
- Le dashboard fonctionne **entièrement en local** après le lancement
- Aucune donnée sensible n'est transmise

## 💡 Conseils

- **Épinglez PowerShell** à votre barre des tâches pour un accès rapide
- **Créez un raccourci** qui exécute le script automatiquement
- **Utilisez le launcher** à chaque fois que vous voulez une version à jour du dashboard

## 📝 Notes

- Le launcher **télécharge la dernière version** à chaque exécution
- Si vous n'avez pas Internet à la maison, téléchargez d'abord sur un autre ordinateur
- Le script fonctionne également avec PowerShell 7+ (PowerShell Core)

---

**Dernière mise à jour:** 2024  
**Version du launcher:** 1.0  
**Compatible:** Windows 7+, PowerShell 5.0+
