# 📱 VHR Dashboard TTS Receiver App - Guide d'implémentation

## Vue d'ensemble
Cette application Android reçoit les messages texte du Dashboard et les convertit en parole (Text-to-Speech) sur votre casque Meta Quest.

## ✨ Fonctionnalités

1. **Réception en temps réel** des messages du Dashboard
2. **Conversion texte-parole** native Android
3. **Notification visuelle et sonore**
4. **Historique des messages**
5. **Paramètres audio** (vitesse, volume)

---

## 🛠️ Architecture Technique

### Composants principaux
1. **BroadcastReceiver** - Écoute les broadcasts du Dashboard
2. **Service** - Gère la TTS en arrière-plan
3. **Activity** - Interface utilisateur
4. **ViewModel** - Gestion d'état

### Flux de données
```
Dashboard (POST /api/tts/send)
    ↓
ADB Command (am broadcast)
    ↓
BroadcastReceiver (Android)
    ↓
TTS Service (TextToSpeech)
    ↓
Audio Output (Casque VR)
```

---

## 📦 Installation et Mise en Place

### Prérequis
- Android Studio 2023+
- Kotlin 1.9+
- Gradle 8.0+
- Meta Quest 2/3 en mode développeur
- ADB installé et configuré

### Dépendances Gradle
```gradle
dependencies {
    // AndroidX
    implementation 'androidx.core:core:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.lifecycle:lifecycle-runtime-ktx:2.7.0'
    implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0'
    implementation 'androidx.lifecycle:lifecycle-livedata-ktx:2.7.0'
    
    // Jetpack Compose (optionnel, pour UI moderne)
    implementation 'androidx.compose.ui:ui:1.5.4'
    implementation 'androidx.compose.material3:material3:1.1.2'
    
    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
}
```

---

## 💻 Code Source

### 1. AndroidManifest.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <application
        android:allowBackup="true"
        android:label="@string/app_name"
        android:usesCleartextTraffic="true">

        <!-- Main Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- TTS Receiver Service -->
        <service android:name=".TtsService" />

        <!-- BroadcastReceiver pour recevoir les TTS -->
        <receiver
            android:name=".TtsReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="com.vhr.dashboard.TTS_MESSAGE" />
            </intent-filter>
        </receiver>

    </application>

</manifest>
```

### 2. TtsService.kt

```kotlin
package com.vhr.dashboard

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.speech.tts.TextToSpeech
import android.util.Log
import kotlinx.coroutines.*

class TtsService : Service(), TextToSpeech.OnInitListener {
    
    private lateinit var tts: TextToSpeech
    private var isTtsReady = false
    private val scope = CoroutineScope(Dispatchers.Main + Job())
    
    companion object {
        const val ACTION_SPEAK = "com.vhr.dashboard.SPEAK"
        const val EXTRA_TEXT = "text"
        const val EXTRA_ID = "utteranceId"
        private const val TAG = "TtsService"
    }
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service créé")
        initializeTts()
    }
    
    private fun initializeTts() {
        tts = TextToSpeech(this, this)
    }
    
    override fun onInit(status: Int) {
        isTtsReady = if (status == TextToSpeech.SUCCESS) {
            Log.d(TAG, "✅ TextToSpeech initialisé")
            
            // Configuration
            tts.language = java.util.Locale.FRENCH
            tts.setSpeechRate(1.0f)  // Vitesse normale
            tts.pitch = 1.0f
            
            true
        } else {
            Log.e(TAG, "❌ TextToSpeech initialization failed: $status")
            false
        }
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.let {
            when (it.action) {
                ACTION_SPEAK -> {
                    val text = it.getStringExtra(EXTRA_TEXT) ?: return START_STICKY
                    val utteranceId = it.getStringExtra(EXTRA_ID) ?: System.currentTimeMillis().toString()
                    
                    Log.d(TAG, "📢 Parlant: $text")
                    speakText(text, utteranceId)
                }
            }
        }
        
        return START_STICKY
    }
    
    private fun speakText(text: String, utteranceId: String) {
        if (!isTtsReady) {
            Log.w(TAG, "TTS pas prêt, nouvelle tentative...")
            scope.launch {
                delay(1000)
                if (isTtsReady) speakText(text, utteranceId)
            }
            return
        }
        
        try {
            tts.speak(text, TextToSpeech.QUEUE_ADD, null, utteranceId)
        } catch (e: Exception) {
            Log.e(TAG, "Erreur lors de la parole: ${e.message}")
        }
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onDestroy() {
        super.onDestroy()
        if (::tts.isInitialized) {
            tts.stop()
            tts.shutdown()
        }
        scope.cancel()
        Log.d(TAG, "Service détruit")
    }
}
```

### 3. TtsReceiver.kt

```kotlin
package com.vhr.dashboard

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class TtsReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "TtsReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "📬 Broadcast reçu: ${intent.action}")
        
        // Extraire le texte du broadcast (envoyé par le Dashboard)
        val text = intent.getStringExtra("text") ?: return
        val utteranceId = intent.getStringExtra("utteranceId") ?: "vhr_${System.currentTimeMillis()}"
        
        Log.d(TAG, "💬 Texte à prononcer: '$text'")
        
        // Démarrer le service TTS
        val ttsIntent = Intent(context, TtsService::class.java).apply {
            action = TtsService.ACTION_SPEAK
            putExtra(TtsService.EXTRA_TEXT, text)
            putExtra(TtsService.EXTRA_ID, utteranceId)
        }
        
        context.startService(ttsIntent)
    }
}
```

### 4. MainActivity.kt

```kotlin
package com.vhr.dashboard

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

data class TtsMessage(
    val id: String,
    val text: String,
    val timestamp: LocalDateTime,
    val status: String // "pending", "speaking", "completed"
)

class TtsViewModel : ViewModel() {
    private val _messages = MutableStateFlow<List<TtsMessage>>(emptyList())
    val messages: StateFlow<List<TtsMessage>> = _messages
    
    fun addMessage(text: String) {
        val message = TtsMessage(
            id = System.currentTimeMillis().toString(),
            text = text,
            timestamp = LocalDateTime.now(),
            status = "pending"
        )
        
        viewModelScope.launch {
            _messages.value = _messages.value + message
        }
    }
    
    fun updateMessageStatus(id: String, status: String) {
        _messages.value = _messages.value.map {
            if (it.id == id) it.copy(status = status) else it
        }
    }
}

class MainActivity : ComponentActivity() {
    
    private val viewModel: TtsViewModel by viewModels()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Log.d("MainActivity", "🚀 Démarrage de l'app VHR TTS")
        
        // Demander les permissions
        requestPermissions()
        
        // Démarrer le service TTS
        val serviceIntent = Intent(this, TtsService::class.java)
        startService(serviceIntent)
        
        setContent {
            TtsReceiverApp(viewModel)
        }
    }
    
    private fun requestPermissions() {
        val permissions = mutableListOf<String>()
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.RECORD_AUDIO
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                permissions.add(Manifest.permission.RECORD_AUDIO)
            }
        }
        
        if (permissions.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, permissions.toTypedArray(), 100)
        }
    }
}

@Composable
fun TtsReceiverApp(viewModel: TtsViewModel) {
    MaterialTheme {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            TtsScreen(viewModel)
        }
    }
}

@Composable
fun TtsScreen(viewModel: TtsViewModel) {
    val messages = viewModel.messages.collectAsState()
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Header
        Text(
            "🎙️ VHR Dashboard TTS",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        
        Text(
            "Écouteur actif - Prêt à recevoir les messages vocaux",
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        
        // Message List
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(messages.value) { message ->
                MessageCard(message)
            }
        }
        
        // Status Info
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer
            )
        ) {
            Column(
                modifier = Modifier.padding(12.dp)
            ) {
                Text(
                    "ℹ️ Statut",
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
                Text(
                    "Total messages: ${messages.value.size}",
                    fontSize = 11.sp,
                    modifier = Modifier.padding(top = 4.dp)
                )
                Text(
                    "Langue: Français",
                    fontSize = 11.sp,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        }
    }
}

@Composable
fun MessageCard(message: TtsMessage) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                when (message.status) {
                    "speaking" -> MaterialTheme.colorScheme.primary
                    "completed" -> MaterialTheme.colorScheme.tertiaryContainer
                    else -> MaterialTheme.colorScheme.surfaceVariant
                }
            )
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    message.text,
                    modifier = Modifier.weight(1f),
                    maxLines = 3,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
                
                Text(
                    when (message.status) {
                        "speaking" -> "🔊"
                        "completed" -> "✅"
                        else -> "⏳"
                    },
                    fontSize = 16.sp
                )
            }
            
            Text(
                message.timestamp.format(DateTimeFormatter.ofPattern("HH:mm:ss")),
                fontSize = 10.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
    }
}
```

### 5. strings.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">VHR TTS Receiver</string>
    <string name="status_listening">Écouteur - Prêt</string>
    <string name="status_speaking">En cours de parole...</string>
    <string name="status_idle">Inactif</string>
</resources>
```

---

## 🚀 Déploiement sur Casque Quest

### 1. Compiler l'APK
```bash
cd sample-android
./gradlew assembleDebug
```

### 2. Installer sur le casque
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 3. Lancer l'application
```bash
adb shell am start -n com.vhr.dashboard/.MainActivity
```

### 4. Garder le service actif
```bash
adb shell am set-debug-app com.vhr.dashboard
```

---

## 🧪 Test depuis le Dashboard

### Via cURL
```bash
curl -X POST http://localhost:3000/api/tts/send \
  -H "Content-Type: application/json" \
  -d '{
    "serial": "192.168.1.28:5555",
    "text": "Bienvenue sur VHR Dashboard"
  }'
```

### Via JavaScript (Dashboard)
```javascript
async function sendVoiceMessage(serial, text) {
  const response = await fetch('/api/tts/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serial, text })
  });
  
  const data = await response.json();
  console.log('✅ Message vocal envoyé:', data);
  return data;
}

// Utilisation
sendVoiceMessage('192.168.1.28:5555', 'La caméra a détecté un mouvement');
```

---

## 📋 Checklist d'implémentation

- [ ] Créer le projet Android Studio
- [ ] Copier les fichiers Kotlin
- [ ] Ajouter les dépendances Gradle
- [ ] Configurer AndroidManifest.xml
- [ ] Compiler l'APK
- [ ] Installer sur Quest
- [ ] Tester avec cURL
- [ ] Intégrer dans le Dashboard UI
- [ ] Gérer l'historique des messages
- [ ] Ajouter paramètres TTS (vitesse, langue, volume)

---

## 🔧 Dépannage

### App ne reçoit pas les messages
1. Vérifier que le service est actif: `adb shell ps | grep vhr`
2. Vérifier les logs: `adb logcat | grep TtsReceiver`
3. Vérifier le serial number du casque

### Audio ne fonctionne pas
1. Vérifier le volume du casque
2. Vérifier les permissions: `adb shell dumpsys package com.vhr.dashboard | grep permission`
3. Redémarrer le service: `adb shell am startservice com.vhr.dashboard/.TtsService`

### Problèmes de langue
- Changer `java.util.Locale.FRENCH` à `java.util.Locale.ENGLISH`
- Ou détecter la langue du système

---

## 📚 Ressources Complémentaires

- [Android TextToSpeech Documentation](https://developer.android.com/reference/android/speech/tts/TextToSpeech)
- [Jetpack Compose Documentation](https://developer.android.com/jetpack/compose)
- [Meta Quest Developer Documentation](https://developer.oculus.com/)
- [Android BroadcastReceiver Guide](https://developer.android.com/guide/components/broadcasts)

---

## 💡 Améliorations Futures

1. **WebSocket pour communication temps réel** au lieu de broadcasts
2. **Reconnaissance vocale** (retour du casque vers Dashboard)
3. **Gestion de queue** pour plusieurs messages
4. **Synthèse vocale native** (plus rapide et meilleure qualité)
5. **Interface de configuration** dans l'app
6. **Notification heads-up** avec actions rapides
7. **Support multi-langue** automatique
8. **Enregistrement des messages** pour les rejouer

---

**Version**: 1.0  
**Mise à jour**: 2025-12-07  
**Support**: contact@vhrdashboard.com
