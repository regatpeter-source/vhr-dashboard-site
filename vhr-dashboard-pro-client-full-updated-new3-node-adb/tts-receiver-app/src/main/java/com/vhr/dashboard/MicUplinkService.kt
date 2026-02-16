package com.vhr.dashboard

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
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class MicUplinkService : Service() {

    companion object {
        private const val TAG = "MicUplinkService"
        const val ACTION_START = "com.vhr.dashboard.MIC_UPLINK_START"
        const val ACTION_STOP = "com.vhr.dashboard.MIC_UPLINK_STOP"

        const val EXTRA_SERVER_URL = "serverUrl"
        const val EXTRA_SERIAL = "serial"
        const val EXTRA_SAMPLE_RATE = "sampleRate"
    }

    private var ws: WebSocket? = null
    private var wsClient: OkHttpClient? = null
    private var recorder: AudioRecord? = null
    private var ioExecutor = Executors.newSingleThreadExecutor()
    private val isStreaming = AtomicBoolean(false)

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START

        if (action == ACTION_STOP) {
            stopStreaming()
            stopSelf()
            return START_NOT_STICKY
        }

        val serverUrl = intent?.getStringExtra(EXTRA_SERVER_URL).orEmpty().trim()
        val serial = intent?.getStringExtra(EXTRA_SERIAL).orEmpty().trim()
        val sampleRate = intent?.getIntExtra(EXTRA_SAMPLE_RATE, 16000) ?: 16000

        if (serverUrl.isBlank() || serial.isBlank()) {
            Log.w(TAG, "Missing serverUrl/serial; uplink not started")
            return START_NOT_STICKY
        }

        startStreaming(serverUrl, serial, sampleRate)
        return START_STICKY
    }

    private fun startStreaming(serverUrl: String, serial: String, sampleRate: Int) {
        if (isStreaming.get()) return

        val wsUrl = buildWsUrl(serverUrl, serial)
        if (wsUrl.isBlank()) {
            Log.e(TAG, "Invalid ws url from serverUrl=$serverUrl")
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
                    startRecorderLoop(sampleRate)
                }

                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    Log.e(TAG, "Uplink WebSocket failure: ${t.message}")
                    stopStreaming()
                }

                override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                    Log.i(TAG, "Uplink WebSocket closed: $code/$reason")
                    stopStreaming()
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "startStreaming error: ${e.message}")
            stopStreaming()
        }
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

    private fun buildWsUrl(serverUrl: String, serial: String): String {
        return try {
            val trimmed = serverUrl.trim().removeSuffix("/")
            val wsBase = when {
                trimmed.startsWith("https://", ignoreCase = true) -> "wss://${trimmed.removePrefix("https://")}"
                trimmed.startsWith("http://", ignoreCase = true) -> "ws://${trimmed.removePrefix("http://")}"
                trimmed.startsWith("wss://", ignoreCase = true) || trimmed.startsWith("ws://", ignoreCase = true) -> trimmed
                else -> "ws://$trimmed"
            }
            "$wsBase/api/audio/stream?serial=$serial&mode=uplink-sender&format=pcm16"
        } catch (_: Exception) {
            ""
        }
    }

    override fun onDestroy() {
        stopStreaming()
        try {
            ioExecutor.shutdownNow()
        } catch (_: Exception) {}
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
