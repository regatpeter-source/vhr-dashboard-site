# 🚀 VHR Dashboard - Guide de Démarrage Rapide

## Pour les utilisateurs Windows

### Méthode 1 : Via le site web (RECOMMANDÉ) ✅

1. **Accédez au launcher web:**
   - Allez sur: `https://vhr-dashboard-site.onrender.com/launch-dashboard.html`
   - Ou cliquez sur le bouton "🚀 Lancer en local" dans la page d'accueil

2. **Téléchargez le script:**
   - Cliquez sur le grand bouton vert "🚀 Lancer le Dashboard"
   - Le fichier `launch-dashboard.ps1` sera téléchargé

3. **Exécutez le script:**
   - Ouvrez PowerShell (Windows + R → `powershell` → Entrée)
   - Naviguez jusqu'au dossier des téléchargements
   - Exécutez: `.\launch-dashboard.ps1`
   - Si erreur: exécutez d'abord `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

4. **Laissez la magie opérer** ✨
   - Le script télécharge le dashboard
   - L'extrait automatiquement
   - Lance le dashboard dans votre navigateur
   - Nettoie après lui-même

### Méthode 2 : Via le raccourci de bureau (PLUS SIMPLE)

1. **Téléchargez et double-cliquez:**
   - Téléchargez `VHR Dashboard Launcher.url` depuis le projet
   - Double-cliquez pour lancer automatiquement

### Méthode 3 : Batch launcher

1. **Utilisez le fichier batch:**
   - Double-cliquez sur `scripts/launch-dashboard.bat`
   - Tout est géré automatiquement

---

## ⚙️ Prérequis minimaux

- ✅ Windows 7 ou supérieur
- ✅ PowerShell 5.0+ (inclus par défaut)
- ✅ Navigateur web (Chrome, Edge, Firefox)
- ✅ ~500 MB espace disque temporaire
- ✅ Connexion Internet

---

## 🎯 Que se passe-t-il exactement ?

```
[1/4] 📥 Téléchargement (5-30 sec)
      └─ Récupère VHR-Dashboard-Portable.zip depuis Render

[2/4] 📦 Extraction (5-10 sec)
      └─ Décompresse dans C:\Users\...\AppData\Local\Temp

[3/4] 🔍 Localisation (1 sec)
      └─ Trouve l'application à lancer

[4/4] 🚀 Lancement (2-5 sec)
      └─ Ouvre le dashboard dans votre navigateur

🧹 Nettoyage automatique
   └─ Supprime les fichiers temporaires
```

**Temps total:** 15-50 secondes

---

## ❓ J'ai une erreur, que faire ?

### Erreur: "PowerShell cannot be loaded..."

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Puis réessayez.

### Erreur: "Impossible de télécharger"

1. Vérifiez votre connexion Internet
2. Vérifiez que `https://vhr-dashboard-site.onrender.com` est accessible
3. Attendez 30 secondes et réessayez

### Erreur: "Dossier non trouvé"

1. Redémarrez PowerShell en administrateur
2. Vérifiez que vous avez ~500 MB d'espace disque libre
3. Vérifiez que l'antivirus ne bloque pas l'extraction

### Le dashboard ne se lance pas

1. Vérifiez que votre navigateur par défaut fonctionne
2. Essayez de redémarrer PowerShell
3. Vérifiez les logs pour plus de détails

---

## 📖 Documentation complète

Pour une documentation détaillée: **`LAUNCH-DASHBOARD.md`**

Résumé technique: **`LAUNCHER-SUMMARY.md`**

---

## 💡 Conseils utiles

- 📌 **Créez un raccourci** vers le script sur votre bureau
- 🔄 **Le script télécharge toujours la dernière version**
- 🛡️ **100% transparent:** vous pouvez voir le code du script
- 🌐 **Fonctionne offline** une fois le dashboard extrait
- ⚡ **Rapide:** entièrement optimisé

---

## ✨ Fonctionnalités du Dashboard

Une fois lancé, vous pouvez:

- 👥 **Gérer les accès** (avec licences VHR)
- 📊 **Voir les statistiques** d'utilisation
- 🎮 **Contrôler les appareils** VR
- ⚙️ **Configurer** les paramètres
- 📝 **Gérer les utilisateurs** et les droits

---

## 🆘 Support

Besoin d'aide ? Consultez:

1. **Documentation:** `/LAUNCH-DASHBOARD.md`
2. **Formulaire de contact:** https://vhr-dashboard-site.onrender.com/contact.html
3. **GitHub Issues:** https://github.com/regatpeter-source/vhr-dashboard-site/issues

---

## 🎉 Vous êtes prêt !

C'est tout ce que vous devez savoir. Le launcher fait le reste.

**Bon usage du VHR Dashboard !** 🥽✨

---

*Version 1.0 - 2024*  
*Compatible: Windows 7+*  
*Dernière mise à jour: [Date]*
