# 🎙️ Guide Complet: Fonction Voix sur Casque VR

## 📊 Vue d'ensemble de l'architecture

Pour recevoir la fonction voix (TTS) sur votre casque Quest, vous avez besoin de **3 composants**:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. DASHBOARD PC (Web)                                       │
│    - Interface utilisateur                                  │
│    - Formulaire d'envoi de messages                        │
│    - Historique et statut                                  │
└──────────────┬──────────────────────────────────────────────┘
               │ API POST /api/tts/send
               │ {serial, text}
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. SERVEUR NODE.JS (Backend)                               │
│    - Reçoit le message du Dashboard                        │
│    - Commande ADB au casque                                │
│    - Envoie un broadcast Android                           │
└──────────────┬──────────────────────────────────────────────┘
               │ adb shell am broadcast
               │ action: com.vhr.dashboard.TTS_MESSAGE
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. APPLICATION ANDROID (Casque Quest)                      │
│    ✅ Service TTS (TextToSpeech)                           │
│    ✅ BroadcastReceiver (écouteur)                         │
│    ✅ Activity (UI)                                        │
│    ✅ ViewModel (gestion d'état)                           │
└─────────────────────────────────────────────────────────────┘
               │
               ▼
            🔊 AUDIO SPEAKER
```

---

## 🛠️ Composants Nécessaires

### ✅ Côté Serveur (Déjà implémenté)
- **Route API**: `/api/tts/send` ✅
- **Fonction ADB**: Envoie les commandes au casque ✅
- **Support du broadcasting** Android ✅

### ✅ Côté Dashboard (Créé)
- **Module JS**: `public/js/tts-voice-module.js` ✅
- **Interface UI**: Formulaire + historique ✅
- **Gestion d'appareil**: Sélection dynamique ✅

### ❌ Côté Casque (À CRÉER - Instructions fournies)
- **App Android**: VHR TTS Receiver
  - BroadcastReceiver pour écouter les messages
  - Service TextToSpeech pour prononcer le texte
  - Activity UI pour afficher les messages
  - Gestion des permissions

---

## 📱 3 Étapes pour Activer la Voix

### **Étape 1: Sur le Dashboard (PC)**
Vous avez déjà tout ce qu'il faut grâce à `tts-voice-module.js`:

```javascript
// Le module est déjà chargé et crée l'interface UI

// Utilisation simple:
TTS.send('192.168.1.28:5555', 'Bienvenue sur VHR Dashboard');
// ou
TTS.broadcast('Alerte de sécurité détectée');
```

**Actions possibles:**
- ✅ Sélectionner un casque
- ✅ Taper un message
- ✅ Envoyer au casque
- ✅ Tester avec le navigateur
- ✅ Voir l'historique

---

### **Étape 2: Serveur Node.js (Déjà prêt)**

Le serveur reçoit le message et l'envoie via ADB:

```bash
# Logiquement, voici ce qui se passe:
adb shell am broadcast \
  -a "com.vhr.dashboard.TTS_MESSAGE" \
  --es "text" "Votre message ici" \
  --es "utteranceId" "vhr_1234567890"
```

**Statut:** ✅ Fonctionnel et testable

---

### **Étape 3: Application Android (À créer)**

C'est la **partie manquante**. Il faut créer une application Android qui:

1. **Écoute** les broadcasts du Dashboard
2. **Capture** le texte envoyé
3. **Prononce** le texte avec TextToSpeech
4. **Affiche** l'historique dans l'interface

**📄 Documentation complète fournie:** `VHR_TTS_RECEIVER_APP.md`

---

## 🚀 Implémentation Rapide (20-30 minutes)

### Option A: Utiliser le code fourni (Recommandé)

1. **Ouvrez Android Studio**
2. **Créez un nouveau projet Kotlin/Jetpack Compose**
3. **Copiez les fichiers Kotlin depuis VHR_TTS_RECEIVER_APP.md:**
   - `TtsService.kt` - Service de parole
   - `TtsReceiver.kt` - Récepteur de messages
   - `MainActivity.kt` - Interface UI
4. **Mettez à jour AndroidManifest.xml**
5. **Compilez et installez sur Quest**

### Option B: Utiliser un exemple existant

Si vous avez `sample-android/`, vous pouvez:
```bash
# Ajouter les fichiers TTS dans le projet existant
cp TtsService.kt sample-android/app/src/main/java/com/vhr/dashboard/
cp TtsReceiver.kt sample-android/app/src/main/java/com/vhr/dashboard/
```

---

## 📋 Checklist d'Installation

### Côté PC/Dashboard
- [x] ✅ Serveur TTS configuré (`/api/tts/send`)
- [x] ✅ Module JS TTS créé (`tts-voice-module.js`)
- [x] ✅ Interface UI disponible
- [ ] ☐ Intégrer le module dans votre dashboard HTML

**Pour intégrer le module:**
```html
<!-- Dans vhr-dashboard-pro.html ou admin-dashboard.html -->
<script src="/js/tts-voice-module.js"></script>
```

### Côté Casque Android
- [ ] ☐ Créer le projet Android Studio
- [ ] ☐ Implémenter TtsService.kt
- [ ] ☐ Implémenter TtsReceiver.kt
- [ ] ☐ Implémenter MainActivity.kt
- [ ] ☐ Configurer AndroidManifest.xml
- [ ] ☐ Compiler l'APK
- [ ] ☐ Installer sur Quest: `adb install app-debug.apk`
- [ ] ☐ Lancer l'app: `adb shell am start -n com.vhr.dashboard/.MainActivity`
- [ ] ☐ Tester avec le Dashboard

---

## 🧪 Tests

### Test 1: Via Dashboard
```bash
# Ouvrir http://localhost:3000/vhr-dashboard-pro.html
# Saisir un message comme "Bienvenue sur VHR"
# Cliquer "📤 Envoyer au casque"
# Vérifier que le casque prononce le texte
```

### Test 2: Via cURL
```bash
curl -X POST http://localhost:3000/api/tts/send \
  -H "Content-Type: application/json" \
  -d '{
    "serial": "192.168.1.28:5555",
    "text": "Test de voix sur le casque"
  }'
```

### Test 3: Via Logcat
```bash
# Sur la machine de dev:
adb logcat | grep TtsReceiver
# Vous devriez voir:
# D/TtsReceiver: 📬 Broadcast reçu: com.vhr.dashboard.TTS_MESSAGE
# D/TtsReceiver: 💬 Texte à prononcer: 'Test de voix sur le casque'
```

---

## 🔧 Dépannage

### Le casque ne reçoit rien

**Cause 1: App Android n'est pas installée**
```bash
adb shell pm list packages | grep vhr
# Si vide, installer l'APK
```

**Cause 2: Le service n'est pas actif**
```bash
adb shell ps | grep com.vhr.dashboard
# Doit afficher un processus actif
```

**Cause 3: BroadcastReceiver non déclaré**
- Vérifier AndroidManifest.xml
- Vérifier l'action du broadcast: `com.vhr.dashboard.TTS_MESSAGE`

### Le texte n'est pas prononcé

**Cause 1: TextToSpeech pas initialisé**
- Vérifier les logs: `adb logcat | grep "TtsService"`
- Doit voir: `✅ TextToSpeech initialisé`

**Cause 2: Audio mute ou volume zéro**
```bash
# Sur le casque: vérifier le volume
# Dans l'app: vérifier les paramètres de volume
```

**Cause 3: Locale non supportée**
- Changer de `Locale.FRENCH` à `Locale.ENGLISH`
- Ou installer les données TTS pour la langue

### Dashboard ne voit pas les appareils

**Vérifier la connexion ADB:**
```bash
adb devices -l
# Doit afficher votre Quest
```

---

## 📞 Support

Si vous avez des questions:
1. Consultez `VHR_TTS_RECEIVER_APP.md` pour les détails
2. Vérifiez les logs: `adb logcat`
3. Testez avec cURL avant d'utiliser le Dashboard
4. Contactez: contact@vhr-dashboard-site.com

---

## 📚 Ressources Complémentaires

- [Android TextToSpeech](https://developer.android.com/reference/android/speech/tts/TextToSpeech)
- [BroadcastReceiver Guide](https://developer.android.com/guide/components/broadcasts)
- [ADB Documentation](https://developer.android.com/studio/command-line/adb)
- [Meta Quest Development](https://developer.oculus.com/)
- [Kotlin Coroutines](https://kotlinlang.org/docs/coroutines-overview.html)

---

## 🎯 Résumé

| Composant | Status | Détails |
|-----------|--------|---------|
| **Serveur TTS** | ✅ Prêt | `/api/tts/send` fonctionnel |
| **Module Dashboard** | ✅ Créé | `tts-voice-module.js` avec UI complète |
| **Application Android** | 📋 Instructions | Nécessite création (code fourni) |
| **Intégration Dashboard** | ⏳ À faire | Ajouter `<script src="/js/tts-voice-module.js"></script>` |

**Temps estimé d'implémentation:** 1-2 heures

---

**Version:** 1.0  
**Date:** 2025-12-07  
**Dernière mise à jour:** 26b1343
