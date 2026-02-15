package com.vhr.voice

import android.app.Service
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.IBinder
import android.util.Log
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import java.util.concurrent.Executors
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class AudioDownlinkService : Service() {

    companion object {
        private const val TAG = "AudioDownlinkService"
        const val ACTION_START = "com.vhr.voice.AUDIO_DOWNLINK_START"
        const val ACTION_STOP = "com.vhr.voice.AUDIO_DOWNLINK_STOP"

        const val EXTRA_SERVER_URL = "serverUrl"
        const val EXTRA_SERIAL = "serial"
        const val EXTRA_SAMPLE_RATE = "sampleRate"
        const val EXTRA_RELAY_ENABLED = "relayEnabled"
        const val EXTRA_SESSION_CODE = "sessionCode"
        const val EXTRA_RELAY_BASE = "relayBase"
    }

    private var ws: WebSocket? = null
    private var wsClient: OkHttpClient? = null
    private var audioTrack: AudioTrack? = null
    private val ioExecutor = Executors.newSingleThreadExecutor()
    private val pcmQueue = LinkedBlockingQueue<ByteArray>()
    private val isPlaying = AtomicBoolean(false)

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START

        if (action == ACTION_STOP) {
            stopPlayback()
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
            Log.w(TAG, "Missing serverUrl/serial; downlink not started")
            return START_NOT_STICKY
        }

        startPlayback(serverUrl, serial, sampleRate, relayEnabled, sessionCode, relayBase)
        return START_STICKY
    }

    private fun startPlayback(serverUrl: String, serial: String, sampleRate: Int, relayEnabled: Boolean, sessionCode: String, relayBase: String) {
        if (isPlaying.get()) return

        val wsUrl = buildWsUrl(serverUrl, serial, relayEnabled, sessionCode, relayBase)
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
                    Log.i(TAG, "Downlink WebSocket open: $wsUrl")
                    startAudioLoop(sampleRate)
                }

                override fun onMessage(webSocket: WebSocket, text: String) {
                    // status/control messages are ignored for PCM downlink
                }

                override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
                    if (!isPlaying.get()) return
                    val chunk = bytes.toByteArray()
                    if (chunk.isNotEmpty()) {
                        pcmQueue.offer(chunk)
                    }
                }

                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    Log.e(TAG, "Downlink WebSocket failure: ${t.message}")
                    stopPlayback()
                }

                override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                    Log.i(TAG, "Downlink WebSocket closed: $code/$reason")
                    stopPlayback()
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "startPlayback error: ${e.message}")
            stopPlayback()
        }
    }

    private fun startAudioLoop(sampleRate: Int) {
        if (isPlaying.getAndSet(true)) return

        val minBuf = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        val bufferSize = maxOf(minBuf, 4096)

        val track = AudioTrack(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build(),
            AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(sampleRate)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .build(),
            bufferSize,
            AudioTrack.MODE_STREAM,
            AudioManager.AUDIO_SESSION_ID_GENERATE
        )

        audioTrack = track
        pcmQueue.clear()

        ioExecutor.execute {
            try {
                track.play()
                Log.i(TAG, "PCM downlink playback started (sr=$sampleRate)")

                while (isPlaying.get()) {
                    val chunk = pcmQueue.poll(750, TimeUnit.MILLISECONDS) ?: continue
                    if (chunk.isNotEmpty()) {
                        track.write(chunk, 0, chunk.size, AudioTrack.WRITE_BLOCKING)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Audio loop error: ${e.message}")
            } finally {
                try { track.stop() } catch (_: Exception) {}
                try { track.release() } catch (_: Exception) {}
                audioTrack = null
                isPlaying.set(false)
                pcmQueue.clear()
            }
        }
    }

    private fun stopPlayback() {
        isPlaying.set(false)
        pcmQueue.clear()

        try { audioTrack?.stop() } catch (_: Exception) {}
        try { audioTrack?.release() } catch (_: Exception) {}
        audioTrack = null

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
                "$wsBase/api/relay/audio?session=${java.net.URLEncoder.encode(sessionCode.uppercase(), "UTF-8")}&serial=${java.net.URLEncoder.encode(serial, "UTF-8")}&role=viewer"
            } else {
                "$wsBase/api/audio/stream?serial=$serial&mode=receiver&format=pcm16"
            }
        } catch (_: Exception) {
            ""
        }
    }

    override fun onDestroy() {
        stopPlayback()
        try { ioExecutor.shutdownNow() } catch (_: Exception) {}
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}