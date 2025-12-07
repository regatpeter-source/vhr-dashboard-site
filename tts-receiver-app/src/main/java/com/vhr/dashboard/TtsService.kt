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
        Log.d(TAG, "🚀 Service TTS créé")
        initializeTts()
    }
    
    private fun initializeTts() {
        try {
            tts = TextToSpeech(this, this)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erreur initialisation TTS: ${e.message}")
        }
    }
    
    override fun onInit(status: Int) {
        isTtsReady = if (status == TextToSpeech.SUCCESS) {
            Log.d(TAG, "✅ TextToSpeech initialisé avec succès")
            
            try {
                // Configuration pour le français
                val locale = java.util.Locale("fr", "FR")
                val langResult = tts.setLanguage(locale)
                
                if (langResult == TextToSpeech.LANG_MISSING_DATA || langResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                    Log.w(TAG, "⚠️ Français non disponible, fallback vers Anglais")
                    tts.language = java.util.Locale.ENGLISH
                } else {
                    Log.d(TAG, "✅ Langue Française configurée")
                }
                
                // Configuration audio
                tts.setSpeechRate(1.0f)  // Vitesse normale
                tts.pitch = 1.0f         // Ton normal
                
                true
            } catch (e: Exception) {
                Log.e(TAG, "❌ Erreur lors de la configuration: ${e.message}")
                false
            }
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
                    
                    Log.d(TAG, "📢 Demande de parole: '$text'")
                    speakText(text, utteranceId)
                }
            }
        }
        
        return START_STICKY
    }
    
    private fun speakText(text: String, utteranceId: String) {
        if (!isTtsReady) {
            Log.w(TAG, "⏳ TTS pas prêt, nouvelle tentative dans 1 sec...")
            scope.launch {
                delay(1000)
                if (isTtsReady) {
                    Log.d(TAG, "✅ Nouvelle tentative après attente")
                    speakText(text, utteranceId)
                } else {
                    Log.e(TAG, "❌ TTS toujours pas prêt")
                }
            }
            return
        }
        
        try {
            Log.d(TAG, "🔊 Prononciation de: '$text'")
            tts.speak(text, TextToSpeech.QUEUE_ADD, null, utteranceId)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erreur lors de la parole: ${e.message}")
        }
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onDestroy() {
        super.onDestroy()
        try {
            if (::tts.isInitialized) {
                tts.stop()
                tts.shutdown()
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erreur lors de la destruction: ${e.message}")
        }
        scope.cancel()
        Log.d(TAG, "🛑 Service TTS détruit")
    }
}
