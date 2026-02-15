package com.vhr.voice

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d("BootReceiver", "🔧 Appareil démarré, lancement du service TTS...")
            
            val serviceIntent = Intent(context, TtsService::class.java)
            context.startService(serviceIntent)
        }
    }
}
