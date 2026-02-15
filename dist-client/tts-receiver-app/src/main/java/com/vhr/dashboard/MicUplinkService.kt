package com.vhr.voice

import android.app.Service
import android.content.Intent
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.IBinder
import android.util.Log
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString.Companion.toByteString
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class MicUplinkService : Service() {

    companion object {
        private const val TAG = "MicUplinkService"
        const val ACTION_START = "com.vhr.voice.MIC_UPLINK_START"
        const val ACTION_STOP = "com.vhr.voice.MIC_UPLINK_STOP"

        const val EXTRA_SERVER_URL = "serverUrl"
        const val EXTRA_SERIAL = "serial"
        const val EXTRA_SAMPLE_RATE = "sampleRate"
        const val EXTRA_RELAY_ENABLED = "relayEnabled"
        const val EXTRA_SESSION_CODE = "sessionCode"
        const val EXTRA_RELAY_BASE = "relayBase"
    }

    private var ws: WebSocket? = null
    private var wsClient: OkHttpClient? = null
    private var recorder: AudioRecord? = null
    private var ioExecutor = Executors.newSingleThreadExecutor()
    private val reconnectExecutor = Executors.newSingleThreadScheduledExecutor()
    private val isStreaming = AtomicBoolean(false)
    private val shouldRun = AtomicBoolean(false)
    private var reconnectFuture: ScheduledFuture<*>? = null

    @Volatile private var lastServerUrl: String = ""
    @Volatile private var lastSerial: String = ""
    @Volatile private var lastSampleRate: Int = 16000
    @Volatile private var lastRelayEnabled: Boolean = false
    @Volatile private var lastSessionCode: String = ""
    @Volatile private var lastRelayBase: String = ""

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START

        if (action == ACTION_STOP) {
            shouldRun.set(false)
            cancelReconnect()
            stopStreaming()
            stopSelf()
            return START_NOT_STICKY
        }

        val serverUrl = intent?.getStringExtra(EXTRA_SERVER_URL).orEmpty().trim()
        val serial = intent?.getStringExtra(EXTRA_SERIAL).orEmpty().trim()
        val sampleRate = intent?.getIntExtra(EXTRA_SAMPLE_RATE, 16000) ?: 16000
        val relayEnabled = intent?.getBooleanExtra(EXTRA_RELAY_ENABLED, false) ?: false
        val sessionCode = intent?.getStringExtra(EXTRA_SESSION_CODE).orEmpty().trim()
        val relayBase = intent?.getStringExtra(EXTRA_RELAY_BASE).orEmpty().trim()

        if (serverUrl.isBlank() || serial.isBlank()) {
            Log.w(TAG, "Missing serverUrl/serial; uplink not started")
            return START_NOT_STICKY
        }

        shouldRun.set(true)
        lastServerUrl = serverUrl
        lastSerial = serial
        lastSampleRate = sampleRate
        lastRelayEnabled = relayEnabled
        lastSessionCode = sessionCode
        lastRelayBase = relayBase

        cancelReconnect()
        startStreaming(serverUrl, serial, sampleRate, relayEnabled, sessionCode, relayBase)
        return START_STICKY
    }

    private fun startStreaming(serverUrl: String, serial: String, sampleRate: Int, relayEnabled: Boolean, sessionCode: String, relayBase: String) {
        if (!shouldRun.get()) return

        if (isStreaming.get() || ws != null) return

        val wsUrl = buildWsUrl(serverUrl, serial, relayEnabled, sessionCode, relayBase)
        if (wsUrl.isBlank()) {
            Log.e(TAG, "Invalid ws url from serverUrl=$serverUrl")
            scheduleReconnect("invalid-ws-url")
            return
        }

        try {
            wsClient = OkHttpClient.Builder()
                .readTimeout(0, TimeUnit.MILLISECONDS)
                .build()

            val req = Request.Builder().url(wsUrl).build()
            ws = wsClient?.newWebSocket(req, object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    Log.i(TAG, "Uplink WebSocket open: $wsUrl")
                    cancelReconnect()
                    startRecorderLoop(sampleRate)
                }

                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    Log.e(TAG, "Uplink WebSocket failure: ${t.message}")
                    handleSocketDrop("failure")
                }

                override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                    Log.i(TAG, "Uplink WebSocket closed: $code/$reason")
                    handleSocketDrop("closed-$code")
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "startStreaming error: ${e.message}")
            stopStreaming()
            scheduleReconnect("start-exception")
        }
    }

    private fun handleSocketDrop(reason: String) {
        stopStreaming()
        if (shouldRun.get()) {
            scheduleReconnect(reason)
        }
    }

    private fun scheduleReconnect(reason: String) {
        if (!shouldRun.get()) return
        if (lastServerUrl.isBlank() || lastSerial.isBlank()) return
        if (reconnectFuture?.isDone == false) return

        Log.w(TAG, "Scheduling uplink reconnect in 1200ms (reason=$reason)")
        reconnectFuture = reconnectExecutor.schedule({
            reconnectFuture = null
            if (!shouldRun.get()) return@schedule
            Log.i(TAG, "Reconnecting uplink websocket...")
            startStreaming(
                lastServerUrl,
                lastSerial,
                lastSampleRate,
                lastRelayEnabled,
                lastSessionCode,
                lastRelayBase
            )
        }, 1200, TimeUnit.MILLISECONDS)
    }

    private fun cancelReconnect() {
        try {
            reconnectFuture?.cancel(false)
        } catch (_: Exception) {
        }
        reconnectFuture = null
    }

    private fun startRecorderLoop(sampleRate: Int) {
        if (isStreaming.getAndSet(true)) return

        val minBuf = AudioRecord.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )

        val bufferSize = maxOf(minBuf, 4096)

        val localRecorder = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            sampleRate,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            bufferSize
        )

        recorder = localRecorder

        ioExecutor.execute {
            val buf = ByteArray(2048)
            try {
                localRecorder.startRecording()
                Log.i(TAG, "Mic capture started (sr=$sampleRate)")

                while (isStreaming.get()) {
                    val read = localRecorder.read(buf, 0, buf.size)
                    if (read > 0) {
                        ws?.send(buf.copyOf(read).toByteString())
                    } else if (read < 0) {
                        Log.w(TAG, "AudioRecord read error=$read")
                        break
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Recorder loop error: ${e.message}")
            } finally {
                try { localRecorder.stop() } catch (_: Exception) {}
                try { localRecorder.release() } catch (_: Exception) {}
                recorder = null
                isStreaming.set(false)
            }
        }
    }

    private fun stopStreaming() {
        isStreaming.set(false)

        try { recorder?.stop() } catch (_: Exception) {}
        try { recorder?.release() } catch (_: Exception) {}
        recorder = null

        try { ws?.close(1000, "stop") } catch (_: Exception) {}
        ws = null

        try { wsClient?.dispatcher?.executorService?.shutdownNow() } catch (_: Exception) {}
        try { wsClient?.connectionPool?.evictAll() } catch (_: Exception) {}
        wsClient = null
    }

    private fun buildWsUrl(serverUrl: String, serial: String, relayEnabled: Boolean, sessionCode: String, relayBase: String): String {
        return try {
            val effectiveBase = (if (relayEnabled) relayBase else "").ifBlank { serverUrl }.trim().removeSuffix("/")
            val trimmed = effectiveBase
            val wsBase = when {
                trimmed.startsWith("https://", ignoreCase = true) -> "wss://${trimmed.removePrefix("https://")}"
                trimmed.startsWith("http://", ignoreCase = true) -> "ws://${trimmed.removePrefix("http://")}"
                trimmed.startsWith("wss://", ignoreCase = true) || trimmed.startsWith("ws://", ignoreCase = true) -> trimmed
                else -> "ws://$trimmed"
            }
            if (relayEnabled && sessionCode.isNotBlank()) {
                "$wsBase/api/relay/audio?session=${java.net.URLEncoder.encode(sessionCode.uppercase(), "UTF-8")}&serial=${java.net.URLEncoder.encode(serial, "UTF-8")}&role=uplink-sender"
            } else {
                "$wsBase/api/audio/stream?serial=$serial&mode=uplink-sender&format=pcm16"
            }
        } catch (_: Exception) {
            ""
        }
    }

    override fun onDestroy() {
        shouldRun.set(false)
        cancelReconnect()
        stopStreaming()
        try {
            ioExecutor.shutdownNow()
        } catch (_: Exception) {}
        try {
            reconnectExecutor.shutdownNow()
        } catch (_: Exception) {}
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
