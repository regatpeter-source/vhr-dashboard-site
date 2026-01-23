package com.vhr.dashboard

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class WebRtcStartReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val room = intent.getStringExtra("room") ?: intent.getStringExtra("serial") ?: "test"
        val serverUrl = intent.getStringExtra("serverUrl")
        val launch = Intent(context, WebRtcReceiverActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION or Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
            putExtra("room", room)
            if (!serverUrl.isNullOrBlank()) putExtra("serverUrl", serverUrl)
        }
        Log.i(TAG, "Starting WebRTC receiver with room=$room serverUrl=$serverUrl")
        context.startActivity(launch)
    }

    companion object {
        private const val TAG = "WebRtcStartReceiver"
    }
}
