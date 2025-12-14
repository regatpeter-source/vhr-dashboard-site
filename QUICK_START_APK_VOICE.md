# ⚡ DÉMARRAGE RAPIDE - Télécharger APK et Voix

## 🚀 En 3 Étapes

### ✅ ÉTAPE 1: Télécharger l'APK (2-5 minutes)

1. Ouvrir **Dashboard VHR Pro**
2. Cliquer sur **"🚀 Voix vers Casque"**
3. Cliquer sur **"📱 Télécharger APK"**
4. ⏳ Attendre le message: **"✅ Téléchargement réussi!"**
5. ✅ L'APK est maintenant téléchargée dans votre dossier `Téléchargements`

**Important**: Ne pas cliquer sur "Voix" avant que l'APK soit téléchargée!

---

### ✅ ÉTAPE 2: Télécharger les Données Vocales (5-15 minutes)

1. Après l'étape 1, le bouton **"🎵 Télécharger Voix"** devient actif (couleur rouge)
2. Cliquer sur **"🎵 Télécharger Voix"**
3. ⏳ Attendre le message: **"✅ Téléchargement réussi!"**
   - Fichier: `voice-data.zip`
   - Taille: ~500 MB
   - Ce fichier est volumineux, donc l'attente est normale (5-15 min)
4. ✅ Les données vocales sont maintenant téléchargées

**Résultat**: Vous avez les 2 fichiers:
- `vhr-dashboard.apk` (50-100 MB)
- `voice-data.zip` (500 MB)

---

### ✅ ÉTAPE 3: Compiler via GitHub Actions (15-20 minutes)

Vous avez téléchargé les fichiers. Maintenant:

1. Lire le guide complet: **`APK_VOICE_DOWNLOAD_WORKFLOW.md`**
2. Suivre l'ÉTAPE 3 de ce guide
3. Exécuter `.\validate-apk.bat` pour vérifier
4. Committer et pusher vers GitHub:
   ```bash
   git add .
   git commit -m "Update APK and voice data"
   git push origin main
   ```
5. GitHub Actions compile automatiquement (15-20 min)
6. Récupérer l'APK compilée depuis GitHub Artifacts ou Releases

**Total**: ~35-40 minutes pour les 3 étapes

---

## ❓ Questions Fréquentes

### Q: Pourquoi le bouton "Voix" est grisé?
**R**: Pour vous forcer à télécharger l'APK en premier. C'est important pour que les deux fichiers soient prêts ensemble.

### Q: Le téléchargement est lent, c'est normal?
**R**: Oui! Le fichier de voix fait ~500 MB, donc 5-15 minutes c'est normal selon votre connexion. Les données vocales (modèles de reconnaissance, synthèse) sont volumineuses.

### Q: Que signifie "not found voix"?
**R**: Cette erreur a été corrigée! Le dossier `/data/voice-models/` a été créé et est maintenant accessible.

### Q: Dois-je attendre avant de cliquer sur "Voix"?
**R**: **OUI**, c'est important! Attendez la confirmation "✅ Téléchargement réussi!" après l'APK avant de cliquer sur "Voix".

### Q: Que faire si je clique sur "Voix" par accident avant l'APK?
**R**: Le bouton sera grisé, rien ne se passe. C'est normal! Téléchargez d'abord l'APK.

### Q: Combien de temps au total?
**R**: ~35-40 minutes (incluant téléchargement des fichiers + compilation GitHub)

---

## 📋 Checklist

Avant de commencer:
- [ ] Vous êtes connecté au Dashboard VHR Pro
- [ ] Vous avez une bonne connexion Internet
- [ ] Vous avez ~1 Go libre d'espace disque

Pendant le téléchargement:
- [ ] Bouton "APK" cliquable ✅
- [ ] Bouton "Voix" grisé au départ ✅
- [ ] Après APK → Bouton "Voix" s'active ✅
- [ ] Deux messages de confirmation ✅

Après les deux téléchargements:
- [ ] Vous avez `vhr-dashboard.apk` dans Téléchargements
- [ ] Vous avez `voice-data.zip` dans Téléchargements
- [ ] Message final: "Les deux fichiers sont prêts!" ✅

---

## 🔗 Documentation Complète

Pour plus de détails:
- **APK_VOICE_DOWNLOAD_WORKFLOW.md** ← Guide complet (lisez d'abord!)
- **DOWNLOAD_WORKFLOW_VISUAL.md** ← Interfaces et diagrammes
- **COMPILE_APK_GUIDE.md** ← Guide de compilation GitHub

---

## 🎉 C'est tout!

Vous avez maintenant:
1. ✅ L'APK téléchargée
2. ✅ Les données vocales téléchargées
3. ✅ Prêt pour l'étape 3: Compilation GitHub Actions

Consultez le guide complet pour l'étape 3! 🚀

