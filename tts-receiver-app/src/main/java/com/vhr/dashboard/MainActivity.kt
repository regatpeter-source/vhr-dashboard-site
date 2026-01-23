package com.vhr.dashboard

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * Écran minimal. Le flux WebRTC est géré par WebRtcReceiverActivity via broadcast.
 */
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val tv = TextView(this).apply {
            text = "VHR WebRTC Receiver\n\nEnvoyez le broadcast com.vhr.webrtc.START pour lancer le récepteur en tâche de fond."
            textSize = 16f
            setPadding(32, 32, 32, 32)
        }
        setContentView(tv)
    }
}
