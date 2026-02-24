package com.vhr.voice

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
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
        private const val NOTIF_CHANNEL_ID = "vhr_voice_downlink"
        private const val NOTIF_CHANNEL_NAME = "VHR Voice Playback"
        private const val NOTIF_ID = 2201
    }

    private var ws: WebSocket? = null
    private var wsClient: OkHttpClient? = null
    private var audioTrack: AudioTrack? = null
    private val isRunning = AtomicBoolean(false)

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START

        if (action == ACTION_STOP) {
            stopDownlink()
            stopSelf()
            return START_NOT_STICKY
        }

        val serverUrl = intent?.getStringExtra(EXTRA_SERVER_URL).orEmpty().trim()
        val serial = intent?.getStringExtra(EXTRA_SERIAL).orEmpty().trim()
        val sampleRate = intent?.getIntExtra(EXTRA_SAMPLE_RATE, 16000) ?: 16000

        if (serverUrl.isBlank() || serial.isBlank()) {
            Log.w(TAG, "Missing serverUrl/serial; downlink not started")
            return START_NOT_STICKY
        }

        ensureForeground(serial)

        startDownlink(serverUrl, serial, sampleRate)
        return START_STICKY
    }

    private fun ensureForeground(serial: String) {
        try {
            val nm = getSystemService(NotificationManager::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    NOTIF_CHANNEL_ID,
                    NOTIF_CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_LOW
                )
                channel.description = "Lecture audio PC vers casque"
                nm?.createNotificationChannel(channel)
            }

            val notification = NotificationCompat.Builder(this, NOTIF_CHANNEL_ID)
                .setContentTitle("VHR Voice – Lecture active")
                .setContentText("PC → Casque ($serial)")
                .setSmallIcon(android.R.drawable.stat_sys_headset)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(Notification.CATEGORY_SERVICE)
                .build()

            startForeground(NOTIF_ID, notification)
        } catch (e: Exception) {
            Log.e(TAG, "ensureForeground error: ${e.message}")
        }
    }

    private fun startDownlink(serverUrl: String, serial: String, sampleRate: Int) {
        if (isRunning.get()) return

        val wsUrl = buildWsUrl(serverUrl, serial)
        if (wsUrl.isBlank()) {
            Log.e(TAG, "Invalid ws url from serverUrl=$serverUrl")
            return
        }

        initAudioTrack(sampleRate)

        try {
            wsClient = OkHttpClient.Builder()
                .readTimeout(0, TimeUnit.MILLISECONDS)
                .build()

            val req = Request.Builder().url(wsUrl).build()
            ws = wsClient?.newWebSocket(req, object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    isRunning.set(true)
                    Log.i(TAG, "Downlink WebSocket open: $wsUrl")
                    try { audioTrack?.play() } catch (_: Exception) {}
                }

                override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
                    playPcm(bytes.toByteArray())
                }

                override fun onMessage(webSocket: WebSocket, text: String) {
                    if (text.contains("sender-connected")) {
                        Log.i(TAG, "Downlink sender connected")
                    } else if (text.contains("sender-disconnected")) {
                        Log.i(TAG, "Downlink sender disconnected")
                    }
                }

                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    Log.e(TAG, "Downlink WebSocket failure: ${t.message}")
                    stopDownlink()
                }

                override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                    Log.i(TAG, "Downlink WebSocket closed: $code/$reason")
                    stopDownlink()
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "startDownlink error: ${e.message}")
            stopDownlink()
        }
    }

    private fun initAudioTrack(sampleRate: Int) {
        try {
            val minBuffer = AudioTrack.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            )
            val bufferSize = maxOf(minBuffer, 4096)

            audioTrack?.release()
            audioTrack = AudioTrack(
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
        } catch (e: Exception) {
            Log.e(TAG, "initAudioTrack error: ${e.message}")
        }
    }

    private fun playPcm(data: ByteArray) {
        try {
            if (data.isEmpty()) return
            val track = audioTrack ?: return
            if (track.state != AudioTrack.STATE_INITIALIZED) return
            if (track.playState != AudioTrack.PLAYSTATE_PLAYING) {
                track.play()
            }
            track.write(data, 0, data.size)
        } catch (e: Exception) {
            Log.e(TAG, "playPcm error: ${e.message}")
        }
    }

    private fun stopDownlink() {
        isRunning.set(false)

        try { ws?.close(1000, "stop") } catch (_: Exception) {}
        ws = null

        try { wsClient?.dispatcher?.executorService?.shutdownNow() } catch (_: Exception) {}
        try { wsClient?.connectionPool?.evictAll() } catch (_: Exception) {}
        wsClient = null

        try { audioTrack?.pause() } catch (_: Exception) {}
        try { audioTrack?.flush() } catch (_: Exception) {}
        try { audioTrack?.release() } catch (_: Exception) {}
        audioTrack = null
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
            "$wsBase/api/audio/stream?serial=$serial&mode=receiver&format=pcm16"
        } catch (_: Exception) {
            ""
        }
    }

    override fun onDestroy() {
        stopDownlink()
        try {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } catch (_: Exception) {}
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
