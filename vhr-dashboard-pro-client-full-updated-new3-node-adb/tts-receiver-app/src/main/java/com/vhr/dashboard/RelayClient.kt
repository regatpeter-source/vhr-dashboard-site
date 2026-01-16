package com.vhr.dashboard

import android.content.Context
import android.content.Intent
import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.URLEncoder
import java.util.UUID

/**
 * Minimal Socket.IO relay client for Quest/Android headsets.
 * Connects to https://www.vhr-dashboard-site.com/relay with role=headset and a persisted sessionId.
 * On incoming "forward" events of type "tts", it triggers the local TTS service.
 */
object RelayClient {

    private const val TAG = "RelayClient"
    private const val PREFS = "relay_prefs"
    private const val KEY_SESSION = "session_id"
    private const val DEFAULT_URL = "https://www.vhr-dashboard-site.com"

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var socket: Socket? = null

    @Volatile
    var sessionId: String = ""
        private set

    fun start(context: Context, customSessionId: String? = BuildConfig.RELAY_SESSION_ID, relayUrl: String? = BuildConfig.RELAY_URL) {
        val appCtx = context.applicationContext
        if (socket?.connected() == true) return

        // Resolve sessionId (persisted or generated)
        sessionId = customSessionId ?: loadSessionId(appCtx)

        val baseUrl = relayUrl ?: DEFAULT_URL
        val query = "role=headset&sessionId=" + URLEncoder.encode(sessionId, "UTF-8")

        val opts = IO.Options().apply {
            transports = arrayOf("websocket")
            reconnection = true
            reconnectionAttempts = 0 // infinite
            timeout = 10_000
            forceNew = true
            this.query = query
        }

        try {
            socket = IO.socket("$baseUrl/relay", opts)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erreur création socket: ${e.message}")
            return
        }

        socket?.on(Socket.EVENT_CONNECT) {
            Log.i(TAG, "✅ Connecté au relais (session=$sessionId)")
            sendPresence()
        }

        socket?.on(Socket.EVENT_CONNECT_ERROR) { err ->
            Log.w(TAG, "⚠️ Erreur connexion relais: ${err?.firstOrNull()?.toString()}")
        }

        socket?.on(Socket.EVENT_DISCONNECT) { reason ->
            Log.w(TAG, "ℹ️ Déconnecté du relais: ${reason?.firstOrNull()?.toString()}")
        }

        socket?.on("state") { args ->
            Log.d(TAG, "📨 state: ${args.joinToString()}")
        }

        socket?.on("forward") { args ->
            scope.launch {
                handleForward(appCtx, args)
            }
        }

        socket?.connect()
    }

    fun stop() {
        try {
            socket?.off()
            socket?.disconnect()
            socket = null
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erreur stop socket: ${e.message}")
        }
    }

    private fun sendPresence() {
        try {
            val info = JSONObject().apply {
                put("type", "presence")
                put("sessionId", sessionId)
                put("device", "android-headset")
                put("platform", "android")
            }
            socket?.emit("state", info)
        } catch (e: Exception) {
            Log.w(TAG, "⚠️ Impossible d'envoyer presence: ${e.message}")
        }
    }

    private fun handleForward(appCtx: Context, args: Array<out Any>) {
        if (args.isEmpty()) return
        val raw = args[0]
        val obj = try {
            when (raw) {
                is JSONObject -> raw
                is String -> JSONObject(raw)
                else -> return
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ JSON forward invalide: ${e.message}")
            return
        }

        val type = obj.optString("type", "")
        val data = obj.optJSONObject("data") ?: JSONObject()

        if (type.equals("tts", ignoreCase = true) || data.has("text")) {
            val text = data.optString("text", obj.optString("text", ""))
            if (text.isNotBlank()) {
                triggerTts(appCtx, text)
            }
        }
    }

    private fun triggerTts(appCtx: Context, text: String) {
        val intent = Intent(appCtx, TtsService::class.java).apply {
            action = TtsService.ACTION_SPEAK
            putExtra(TtsService.EXTRA_TEXT, text)
            putExtra(TtsService.EXTRA_ID, UUID.randomUUID().toString())
        }
        try {
            appCtx.startService(intent)
            Log.i(TAG, "🔊 TTS déclenché depuis le relais: '$text'")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Impossible de démarrer TtsService: ${e.message}")
        }
    }

    private fun loadSessionId(ctx: Context): String {
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val existing = prefs.getString(KEY_SESSION, null)
        if (!existing.isNullOrBlank()) return existing
        val generated = "hs-" + UUID.randomUUID().toString().take(8)
        prefs.edit().putString(KEY_SESSION, generated).apply()
        return generated
    }
}