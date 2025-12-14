# 📱 Comment Compiler l'APK - Solution Rapide

## ❌ Problème: Windows Gradle Bug

```
Erreur: java.io.IOException: La syntaxe du nom de fichier, 
de répertoire ou de volume est incorrecte
```

**Cause:** Android Gradle 7.0.4+ a un bug Windows incompatible  
**Solution:** Compiler sur **Linux via GitHub Actions** ✅

---

## ✅ Solution: GitHub Actions (Ubuntu Linux)

GitHub Actions compile l'APK sur Ubuntu (Linux) où Gradle fonctionne parfaitement.

### 🚀 Méthode 1: Automatique (Recommandée)

**La compilation démarre automatiquement quand vous poussez des changements.**

```bash
# 1. Faire des changements
# ... modifiez du code dans tts-receiver-app/ ...

# 2. Committer et pousser
git add .
git commit -m "feat: Update app"
git push origin main

# 3. Attendre ~15-20 minutes
# La compilation démarre automatiquement

# 4. Récupérer l'APK
# https://github.com/regatpeter-source/vhr-dashboard-site/actions
# → Télécharger l'artifact
```

### 🎯 Méthode 2: Manuel (Si besoin immédiat)

**Déclencher la compilation manuellement sans changements:**

```bash
# Via le script PowerShell
.\build-apk-github.ps1

# Ou directement sur GitHub:
# https://github.com/regatpeter-source/vhr-dashboard-site/actions
# → "Build & Release Android APK"
# → "Run workflow"
```

### 📊 Voir la Compilation en Cours

1. **GitHub Actions Dashboard:**
   ```
   https://github.com/regatpeter-source/vhr-dashboard-site/actions
   ```

2. **Voir les logs détaillés:**
   ```
   Click sur le workflow → "build" → Voir chaque étape
   ```

3. **Voir l'APK générée:**
   ```
   Onglet "Artifacts" → Télécharger app-debug.apk
   ```

---

## 📥 Où Récupérer l'APK

### Option 1: Artifacts (Expire après 30 jours)
```
https://github.com/regatpeter-source/vhr-dashboard-site/actions
→ Click le workflow
→ Onglet "Artifacts"
→ Télécharger app-debug.apk
```

### Option 2: Releases (Permanent)
```
https://github.com/regatpeter-source/vhr-dashboard-site/releases
→ Télécharger app-debug.apk
```

### Option 3: Dashboard VHR Pro (Avec Protection)
```
https://votre-app.onrender.com/vhr-dashboard-pro.html
→ Connectez-vous
→ Cliquer "🚀 Voix vers Casque"
→ "📱 Télécharger APK"
(Besoin d'essai actif ou abonnement)
```

---

## 🧪 Tester la Compilation

### Test 1: Vérifier le Workflow

```bash
# Voir le statut du workflow
git log --oneline -1
# → Doit montrer votre dernier commit

# Attendre 1-2 minutes que GitHub détecte le push
# Puis vérifier:
https://github.com/regatpeter-source/vhr-dashboard-site/actions
```

### Test 2: Vérifier les Logs

```
1. Aller à: https://github.com/regatpeter-source/vhr-dashboard-site/actions
2. Click sur le workflow en cours
3. Click sur "build"
4. Voir les logs en temps réel:
   ✅ Checkout
   ✅ Setup Java 11
   ✅ Setup Android SDK
   ✅ Build APK
   ✅ Upload Artifacts
```

### Test 3: Télécharger l'APK

```
1. Quand le ✅ checkmark apparaît (compilation finie)
2. Aller à l'onglet "Artifacts"
3. Télécharger "app-debug.apk"
4. Vérifier la taille: ~50-100 MB
5. Installer sur Meta Quest:
   adb install app-debug.apk
```

---

## ⏱️ Timing Attendu

| Étape | Durée |
|-------|-------|
| Push vers GitHub | Immédiat |
| Détection du workflow | 1-2 min |
| Setup (Java, SDK) | 2-3 min |
| Compilation Gradle | 8-12 min |
| Upload Artifacts | 1 min |
| **Total** | **~15-20 min** |

*Les builds suivantes seront plus rapides grâce au Gradle cache.*

---

## 🛠️ Troubleshooting

### ❌ Le workflow ne démarre pas

**Solution:**
1. Vérifier que vous avez poussé vers GitHub:
   ```bash
   git push origin main
   ```

2. Attendre 1-2 minutes (GitHub met du temps à détecter)

3. Rafraîchir: https://github.com/regatpeter-source/vhr-dashboard-site/actions

### ❌ Le workflow échoue (Build error)

**Solution:**
1. Click sur le workflow
2. Voir l'onglet "Build" pour les détails
3. Common errors:
   - `Missing Android SDK` → Le script l'installe
   - `Out of memory` → Gradle utilise 4GB
   - `Network timeout` → Réessayer

### ❌ APK not found

**Solution:**
1. Vérifier que le workflow a complété (checkmark vert)
2. Vérifier l'onglet "Artifacts"
3. Si absent: Rebuild a échoué, voir les logs

---

## 💡 Tips

### Pour un Développement Rapide

1. **Faire des changements petits et cohérents**
   ```bash
   # Petit commit
   git commit -m "fix: Change voice settings"
   git push
   # APK compilée en ~15 min
   ```

2. **Ne pas compiler si pas nécessaire**
   - APK change rarement
   - Seulement quand code Java/Android change

3. **Utiliser les Artifacts tant qu'ils existent**
   - Plus rapide que les Releases
   - Persistent 30 jours

### Pour la Production

1. **Créer une Release explicite**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   # Release créée automatiquement
   ```

2. **Versionner l'APK**
   - Mettre à jour `build.gradle.kts`
   - VersionCode et versionName

3. **Documenter les changements**
   - Notes de release
   - Changelog

---

## 🎯 Prochaines Étapes

- [ ] Pousser un changement vers GitHub
- [ ] Attendre la compilation (15-20 min)
- [ ] Télécharger l'APK
- [ ] Tester sur Meta Quest
- [ ] Itérer

---

## ✅ Résumé

```
Windows Gradle = ❌ Impossible
GitHub Actions (Ubuntu) = ✅ Fonctionne parfaitement

Action: Push vers GitHub → Attendez 15-20 min → Téléchargez l'APK
```

**C'est la meilleure solution pour le développement et la production!** 🚀
