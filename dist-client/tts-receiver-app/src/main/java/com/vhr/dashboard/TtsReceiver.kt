package com.vhr.voice

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
        
        try {
            // Extraire les données du broadcast
            val text = intent.getStringExtra("text") ?: return
            val utteranceId = intent.getStringExtra("utteranceId") ?: "vhr_${System.currentTimeMillis()}"
            
            Log.d(TAG, "💬 Texte à prononcer: '$text'")
            Log.d(TAG, "🆔 ID: $utteranceId")
            
            // Démarrer le service TTS
            val ttsIntent = Intent(context, TtsService::class.java).apply {
                action = TtsService.ACTION_SPEAK
                putExtra(TtsService.EXTRA_TEXT, text)
                putExtra(TtsService.EXTRA_ID, utteranceId)
            }
            
            context.startService(ttsIntent)
            Log.d(TAG, "✅ Service TTS démarré")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erreur lors du traitement du broadcast: ${e.message}")
        }
    }
}
