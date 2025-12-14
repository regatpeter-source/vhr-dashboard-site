# 🚀 Flux Complet: Téléchargement APK et Données Vocales

## 📋 Vue d'ensemble

Le processus de téléchargement et compilation de l'APK **Voix vers Casque** se déroule en **3 étapes distinctes**:

```
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1: Télécharger l'APK                                     │
│  └─ Fichier: vhr-dashboard.apk (~50-100 MB)                    │
│  └─ Durée: 2-5 minutes (selon votre connexion)                 │
│  └─ Action: Cliquez sur "📱 Télécharger APK"                   │
└─────────────────────────────────────────────────────────────────┘
                              ⬇️  ATTENDRE (Important!)
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 2: Télécharger les Données Vocales                      │
│  └─ Fichier: voice-data.zip (~500 MB)                          │
│  └─ Durée: 5-15 minutes (selon votre connexion)                │
│  └─ Action: Cliquez sur "🎵 Télécharger Voix"                  │
│  └─ Contient: Modèles de reconnaissance vocale (FR/EN)         │
│              Modèles de synthèse vocale (FR/EN)                │
│              Packs linguistiques                               │
└─────────────────────────────────────────────────────────────────┘
                    ⬇️  ATTENDRE JUSQU'AU BOUT (Critique!)
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 3: Compiler l'APK via GitHub Actions                    │
│  └─ Action: Pousser les modifications vers GitHub               │
│  └─ git push origin main                                       │
│  └─ Durée: 15-20 minutes (compilation sur Ubuntu Linux)        │
│  └─ Résultat: APK disponible dans Artifacts/Releases           │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Configuration du Système

### Dans le Dashboard VHR Pro

1. **Accédez à "Voix vers Casque"** (🚀 bouton principal)
2. **Une fenêtre s'ouvre avec 2 boutons**:
   - 📱 Télécharger APK (en haut à gauche)
   - 🎵 Télécharger Voix (en haut à droite)

### Protection des Téléchargements

✅ **Authentification requise**  
→ Vous devez être connecté avec un compte autorisé

✅ **Vérification d'accès**
- Si en période de démonstration: ✅ Accès complet
- Si période de démo expirée: Vérification d'abonnement Stripe

✅ **Logs d'audit**  
→ Tous les téléchargements sont enregistrés

---

## 📱 ÉTAPE 1: Télécharger l'APK

### Procédure

```
1. Ouvrir Dashboard VHR Pro
2. Cliquer sur "🚀 Voix vers Casque"
3. Cliquer sur "📱 Télécharger APK"
4. Attendre le message: "✅ Téléchargement réussi!"
5. ⏸️ ARRÊTER ICI - Ne pas cliquer sur "Télécharger Voix" tout de suite
```

### Détails Techniques

| Propriété | Valeur |
|-----------|--------|
| **Nom du fichier** | `vhr-dashboard.apk` |
| **Taille** | 50-100 MB |
| **Chemin serveur** | `/dist/demo/vhr-dashboard-demo.apk` |
| **Type MIME** | `application/vnd.android.package-archive` |
| **Authentification** | ✅ Requise (authMiddleware) |
| **Temps estimé** | 2-5 minutes |

### Message de Confirmation

Vous verrez cette alerte:
```
✅ Téléchargement réussi!

Fichier: vhr-dashboard.apk
Taille: XX.XX MB
```

### ❌ Erreurs Possibles

| Erreur | Cause | Solution |
|--------|-------|----------|
| ❌ Erreur de téléchargement | Non authentifié | Connectez-vous à votre compte |
| ❌ Accès refusé (403) | Compte expiré | Vérifiez votre abonnement |
| 🔄 Timeout | Connexion lente | Vérifiez votre WiFi/réseau |

---

## 🎵 ÉTAPE 2: Télécharger les Données Vocales

### ⏱️ TIMING IMPORTANT

**🔴 ATTENDEZ la fin du téléchargement de l'APK AVANT de cliquer sur "Télécharger Voix"**

Pourquoi?
- L'APK et les données vocales sont des fichiers séparés
- Ils doivent être téléchargés complètement AVANT la compilation
- Les fichiers incomplets causeront des erreurs lors de la compilation

### Procédure

```
1. ✅ Confirmer que l'APK est téléchargé (message "✅ Téléchargement réussi!")
2. Attendre 5-10 secondes (pour que le système traite l'APK)
3. Cliquer sur "🎵 Télécharger Voix"
4. ⏳ Attendre: Le bouton affiche "⏳ Téléchargement..."
5. ✅ Attendre le message: "✅ Téléchargement réussi!"
6. ⏸️ ARRÊTER ICI - La compilation commence à l'étape 3
```

### Détails Techniques

| Propriété | Valeur |
|-----------|--------|
| **Nom du fichier** | `voice-data.zip` |
| **Taille** | ~500 MB |
| **Chemin serveur** | `/data/voice-models/` |
| **Type MIME** | `application/zip` |
| **Authentification** | ✅ Requise (authMiddleware) |
| **Temps estimé** | 5-15 minutes |

### Contenu du Fichier

```
voice-data.zip
├── recognition/
│   ├── fr-FR/
│   │   ├── model.bin
│   │   ├── config.json
│   │   └── dictionary.txt
│   └── en-US/
│       └── [fichiers anglais]
├── synthesis/
│   ├── fr-FR/
│   │   ├── voices/
│   │   ├── config.json
│   │   └── phonemes.txt
│   └── en-US/
│       └── [fichiers anglais]
├── config.json
└── README.md
```

### Message de Confirmation

Vous verrez cette alerte:
```
✅ Téléchargement réussi!

Fichier: voice-data.zip
Taille: XXX.XX MB
```

### ❌ Erreurs Possibles

| Erreur | Cause | Solution |
|--------|-------|----------|
| ❌ Voice data not found | Dossier `/data/voice-models/` manquant | Dossier a été créé automatiquement ✅ |
| 🔄 Timeout | Fichier trop volumineux | Connexion très lente → Réessayer |
| ❌ Accès refusé (403) | Compte expiré | Vérifiez votre abonnement |

---

## 🔧 ÉTAPE 3: Compiler l'APK via GitHub Actions

### Prérequis

✅ Les DEUX fichiers sont téléchargés complètement:
- `vhr-dashboard.apk` ✅
- `voice-data.zip` ✅

### Procédure de Compilation

```bash
# 1. Valider l'environnement
.\validate-apk.bat

# Résultat attendu:
# ✅ PRET POUR COMMIT/PUSH

# 2. Préparer les modifications
git status

# 3. Committer
git add .
git commit -m "Update: Add APK and voice data downloads"

# 4. Pousser vers GitHub
git push origin main

# 5. GitHub Actions démarre automatiquement
# → Compilation commence en 1-2 minutes
# → Durée: 10-15 minutes
# → APK prêt: ~20 minutes au total
```

### Monitoring de la Compilation

#### Option 1: GitHub Web Interface (Recommandé)

1. Allez à: `https://github.com/regatpeter-source/vhr-dashboard-site/actions`
2. Vous verrez le workflow en cours d'exécution
3. Cliquez pour voir les détails en temps réel

#### Option 2: Ligne de Commande

```bash
# Voir les commits récents
git log --oneline -5

# Voir le statut du repository
git status

# Voir les branches
git branch -v
```

### État de la Compilation

| État | Signification | Action |
|------|---------------|--------|
| 🟡 In Progress | Compilation en cours | Attendre 10-15 minutes |
| 🟢 Success | APK compilée avec succès | Télécharger depuis Artifacts/Releases |
| 🔴 Failed | Erreur pendant la compilation | Vérifier les logs sur GitHub |

### Récupération de l'APK

#### Option 1: GitHub Actions Artifacts (Rapide, 30 jours)

1. Allez à l'Actions workflow qui a réussi
2. Cliquez sur "Artifacts"
3. Téléchargez `app-debug.apk`

#### Option 2: GitHub Releases (Permanent)

1. Allez à: `https://github.com/regatpeter-source/vhr-dashboard-site/releases`
2. Trouvez la dernière version
3. Téléchargez `vhr-dashboard.apk`

#### Option 3: Dashboard VHR Pro (Avec Protection)

1. Allez dans "Voix vers Casque"
2. Cliquez sur "🎵 Télécharger Voix" → Cette fois c'est l'APK compilée
3. L'APK compilée par GitHub Actions est maintenant disponible

### Timeline Complète de la Compilation

```
Vous: git push origin main
└─ T+0s: Push complété

GitHub: Détection du changement
└─ T+1-2 min: Workflow trigger

Actions: Setup environnement
└─ T+2-3 min: Java 11 + Android SDK setup

Gradle: Compilation
└─ T+3-15 min: Build APK (10-15 minutes)

Upload: Artifacts
└─ T+15-20 min: APK uploadée dans Artifacts

Vous: Télécharger l'APK
└─ T+20 min: APK prête à installer

TOTAL: ~20 minutes ⏱️
```

---

## 📥 Récapitulatif Complet

### Workflow Simplifié

```
ÉTAPE 1 (5 min)        ÉTAPE 2 (15 min)         ÉTAPE 3 (20 min)
↓                      ↓                        ↓
Télécharger APK →  Télécharger Voix →  Compiler sur GitHub
```

### Checklist Avant de Commencer

- [ ] Vous êtes connecté au Dashboard VHR Pro
- [ ] Votre compte est actif (pas expiré)
- [ ] Vous avez une bonne connexion Internet
- [ ] Vous avez au moins 1 Go libre de stockage
- [ ] Vous avez `git` et la console installés

### Checklist Après Chaque Étape

**Après Étape 1 (APK)**:
- [ ] Message "✅ Téléchargement réussi!" visible
- [ ] Fichier `vhr-dashboard.apk` dans vos téléchargements
- [ ] Attendre 5-10 secondes avant l'étape suivante

**Après Étape 2 (Voix)**:
- [ ] Message "✅ Téléchargement réussi!" visible
- [ ] Fichier `voice-data.zip` dans vos téléchargements
- [ ] Fichier entre 400-600 MB

**Après Étape 3 (Compilation)**:
- [ ] GitHub Actions workflow complété avec ✅ (green checkmark)
- [ ] APK disponible dans Artifacts ou Releases
- [ ] APK entre 50-100 MB

---

## 🆘 Dépannage

### Problème: "not found voix"

**Cause**: Le dossier `/data/voice-models/` n'existait pas

**Solution**: Le dossier a été créé automatiquement ✅

**Vérification**:
```bash
# Check if directory exists
Test-Path "C:\Users\peter\VR-Manager\data\voice-models"

# Should return: True ✅
```

### Problème: Téléchargement très lent

**Solutions**:
1. Vérifier votre connexion Internet
2. Fermer les autres programmes qui utilisent Internet
3. Réessayer à une autre heure

### Problème: APK ne s'installe pas

**Solutions**:
1. Vérifier que l'APK est complètement téléchargée (50-100 MB)
2. Utiliser `adb install vhr-dashboard.apk`
3. Vérifier que votre Meta Quest a suffisamment d'espace
4. Réinstaller via le Dashboard en relançant la compilation

### Problème: Données vocales non trouvées après installation

**Solutions**:
1. Vérifier que `voice-data.zip` a été téléchargé (~500 MB)
2. Installer le fichier vocal dans le répertoire correct
3. Redémarrer l'application Meta Quest
4. Réinstaller l'APK et les données vocales

---

## 📊 Statistiques Complètes

| Élément | Taille | Durée | Notes |
|---------|--------|-------|-------|
| APK Download | 50-100 MB | 2-5 min | Dépend de votre connexion |
| Voice Data | ~500 MB | 5-15 min | Fichier ZIP volumineux |
| Compilation | - | 10-15 min | Sur serveurs GitHub Actions |
| Installation APK | - | ~30 sec | Rapide sur Meta Quest |
| **TOTAL** | **~600 MB** | **~20-30 min** | Temps réel + fichiers |

---

## ✅ Validation Finale

Après avoir complété les 3 étapes:

```
✅ APK téléchargée depuis le Dashboard
✅ Données vocales téléchargées depuis le Dashboard
✅ Git commit et push effectués
✅ GitHub Actions compilation terminée
✅ APK compilée récupérée depuis GitHub
✅ APK installée sur Meta Quest
✅ Données vocales configurées
✅ Feature "Voix vers Casque" testée et fonctionnelle

🎉 SUCCÈS! Votre système VHR est prêt à l'emploi!
```

---

## 📚 Ressources Supplémentaires

- **COMPILE_APK_GUIDE.md** - Guide détaillé de compilation GitHub Actions
- **APK_VALIDATION_PRE_COMMIT.md** - Validation pre-commit
- **validate-apk.bat** - Script de validation automatique
- GitHub Actions: https://github.com/regatpeter-source/vhr-dashboard-site/actions
- GitHub Releases: https://github.com/regatpeter-source/vhr-dashboard-site/releases

