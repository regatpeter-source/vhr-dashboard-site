# VHR Voice App - Application de réception audio en arrière-plan

## Fonctionnalité

Cette application Android permet de recevoir l'audio du PC sur le casque Quest **sans interrompre les jeux en cours**.

Contrairement au navigateur qui met les jeux en pause quand il s'ouvre, cette app tourne en **service d'arrière-plan** et peut recevoir l'audio pendant que vous jouez.

## Caractéristiques

- 🎮 **Mode arrière-plan** : Ne met pas les jeux en pause
- 🔊 **Audio en temps réel** : Réception via WebSocket
- 📱 **Contrôle ADB** : Peut être démarrée/arrêtée depuis le PC
- 🔔 **Notification** : Indicateur visible quand actif
- 🔄 **Reconnexion auto** : Se reconnecte si la connexion est perdue

## Installation

### Pré-requis
- JDK 17+ installé
- Android SDK (via Android Studio ou séparément)
- Casque Quest connecté en USB avec mode développeur activé

### Compilation

```powershell
cd vhr-voice-app
./gradlew assembleDebug
```

L'APK sera généré dans: `app/build/outputs/apk/debug/app-debug.apk`

### Installation sur le Quest

```powershell
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Utilisation

### Méthode 1: Via le Dashboard (automatique)

Quand vous cliquez sur "🎤 Envoyer Voix" dans le dashboard, l'app sera automatiquement démarrée en arrière-plan si elle est installée.

### Méthode 2: Via ADB (manuel)

**Démarrer la réception audio:**
```powershell
adb shell am broadcast -a com.vhr.voice.START --es serverUrl "http://192.168.1.3:3000" --es serial "VOTRE_SERIAL"
```

**Arrêter la réception audio:**
```powershell
adb shell am broadcast -a com.vhr.voice.STOP
```

### Méthode 3: Via l'app (interface)

1. Ouvrez "VHR Voice" depuis la bibliothèque d'apps Quest
2. Entrez l'URL du serveur (ex: `http://192.168.1.3:3000`)
3. Entrez le numéro de série du casque
4. Cliquez sur "Démarrer la réception"
5. Retournez dans votre jeu - l'audio continuera en arrière-plan

## Architecture technique

```
PC (Dashboard)                    Quest (VHR Voice App)
     |                                    |
     | 1. Capture micro                   |
     | 2. Encode WebM/Opus                |
     | 3. WebSocket send ----------------> 4. WebSocket receive
     |                                    | 5. Decode audio
     |                                    | 6. Play via AudioTrack
     |                                    | (en arrière-plan)
```

## Dépannage

### L'app ne démarre pas via broadcast
- Vérifiez que l'app est bien installée: `adb shell pm list packages | grep vhr`
- Redémarrez le casque et réessayez

### Pas de son
- Vérifiez que le serveur est accessible depuis le Quest
- Vérifiez que le PC envoie bien l'audio (voir les logs du serveur)
- Assurez-vous que le volume du Quest n'est pas à zéro

### L'app se ferme
- Vérifiez les permissions dans les paramètres Quest
- L'app utilise un foreground service pour rester active

## Logs

Voir les logs de l'app:
```powershell
adb logcat -s VHRVoice
```
