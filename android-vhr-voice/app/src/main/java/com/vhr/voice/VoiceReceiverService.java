package com.vhr.voice;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import android.text.TextUtils;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.BaseDataSource;
import androidx.media3.datasource.DataSource;
import androidx.media3.datasource.DataSpec;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.LoadControl;
import androidx.media3.exoplayer.source.ProgressiveMediaSource;
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector;
import androidx.media3.extractor.DefaultExtractorsFactory;
import androidx.media3.extractor.ExtractorsFactory;

import java.io.InterruptedIOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;
import okio.ByteString;

@UnstableApi
public class VoiceReceiverService extends Service {
    public static final String ACTION_START = "com.vhr.voice.START";
    public static final String ACTION_STOP = "com.vhr.voice.STOP";
    private static final String TAG = "VHRVoice";
    private static final String CHANNEL_ID = "vhr_voice_channel";
    private static final int NOTIFICATION_ID = 1001;
    // Keep queue tiny to avoid building latency (250ms chunks -> ~2s max)
    private static final int QUEUE_CAPACITY = 12;
    private static final int BACKLOG_THRESHOLD = 6;
    private static final int QUEUE_POLL_MS = 120;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private OkHttpClient httpClient;
    private WebSocket webSocket;
    private ExoPlayer player;
    private BlockingQueue<byte[]> chunkQueue;
    private AtomicBoolean streamEnded;
    private String currentServerUrl;
    private String currentSerial;
    private int reconnectAttempts = 0;
    private long lastBacklogLogMs = 0L;

    @Override
    public void onCreate() {
        super.onCreate();
        httpClient = new OkHttpClient.Builder().retryOnConnectionFailure(true).build();
        createNotificationChannel();
        Log.d(TAG, "VoiceReceiverService created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null && intent.getAction() != null ? intent.getAction() : ACTION_START;
        if (ACTION_STOP.equals(action)) {
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        String serverUrl = intent != null ? intent.getStringExtra("serverUrl") : null;
        String serial = intent != null ? intent.getStringExtra("serial") : null;
        String cleanSerial = intent != null ? intent.getStringExtra("cleanSerial") : null;
        String adbSerial = intent != null ? intent.getStringExtra("adbSerial") : null;
        if (!TextUtils.isEmpty(cleanSerial)) serial = cleanSerial;
        if (!TextUtils.isEmpty(adbSerial)) serial = adbSerial;

        if (serverUrl == null || serverUrl.isEmpty()) {
            Log.w(TAG, "Missing serverUrl; ignoring start command");
            return START_NOT_STICKY;
        }
        if (serial == null || serial.isEmpty()) {
            Log.w(TAG, "Missing serial; ignoring start command");
            return START_NOT_STICKY;
        }

        startForeground(NOTIFICATION_ID, buildNotification("Connexion...", false));
        startStreaming(serverUrl, serial);
        return START_STICKY;
    }

    private void startStreaming(String serverUrl, String serial) {
        stopStreaming();
        currentServerUrl = serverUrl;
        currentSerial = serial;
        reconnectAttempts = 0;
        // Petite file pour limiter la latence (< ~2s)
        chunkQueue = new LinkedBlockingQueue<>(QUEUE_CAPACITY);
        streamEnded = new AtomicBoolean(false);

        preparePlayer();
        connectWebSocket(buildWsUrl(serverUrl, serial));
    }

    private void preparePlayer() {
        releasePlayer();
        DefaultTrackSelector trackSelector = new DefaultTrackSelector(this);
        LoadControl loadControl = new DefaultLoadControl.Builder()
            // Buffers serrés pour du temps réel
            .setBufferDurationsMs(
                /* minBufferMs= */ 200,
                /* maxBufferMs= */ 400,
                /* bufferForPlaybackMs= */ 120,
                /* bufferForPlaybackAfterRebufferMs= */ 120)
            .build();

        player = new ExoPlayer.Builder(this)
            .setTrackSelector(trackSelector)
            .setLoadControl(loadControl)
            .build();

        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_SPEECH)
                .build();
        player.setAudioAttributes(audioAttributes, true);
        player.setHandleAudioBecomingNoisy(true);
        player.setRepeatMode(Player.REPEAT_MODE_OFF);
        player.setVolume(1.0f);

        DataSource.Factory dsFactory = () -> new WebSocketDataSource(chunkQueue, streamEnded);
        ExtractorsFactory extractors = new DefaultExtractorsFactory();

        MediaItem item = MediaItem.fromUri("https://vhr-voice-websocket.local/stream");
        ProgressiveMediaSource mediaSource = new ProgressiveMediaSource.Factory(dsFactory, extractors)
                .createMediaSource(item);
        player.setMediaSource(mediaSource);
        player.prepare();
        player.play();
    }

    private void connectWebSocket(String wsUrl) {
        Log.d(TAG, "Connecting WebSocket: " + wsUrl);
        Request request = new Request.Builder().url(wsUrl).build();
        webSocket = httpClient.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(WebSocket webSocket, Response response) {
                Log.d(TAG, "WebSocket open");
                reconnectAttempts = 0;
                updateNotification("Réception en cours", true);
            }

            @Override
            public void onMessage(WebSocket webSocket, String text) {
                Log.d(TAG, "Message text: " + text);
            }

            @Override
            public void onMessage(WebSocket webSocket, ByteString bytes) {
                offerChunk(bytes.toByteArray());
            }

            @Override
            public void onClosing(WebSocket webSocket, int code, String reason) {
                Log.w(TAG, "WebSocket closing: " + reason);
                markStreamEnded();
            }

            @Override
            public void onClosed(WebSocket webSocket, int code, String reason) {
                Log.w(TAG, "WebSocket closed: " + reason);
                markStreamEnded();
                scheduleReconnect();
            }

            @Override
            public void onFailure(WebSocket webSocket, Throwable t, @Nullable Response response) {
                Log.e(TAG, "WebSocket failure: " + (t != null ? t.getMessage() : "unknown"));
                markStreamEnded();
                scheduleReconnect();
            }
        });
    }

    private void offerChunk(byte[] data) {
        if (chunkQueue == null) return;
        if (chunkQueue.size() >= BACKLOG_THRESHOLD) {
            chunkQueue.clear();
            if (System.currentTimeMillis() - lastBacklogLogMs > 2000) {
                Log.w(TAG, "Audio backlog detected; dropping stale chunks to stay low-latency");
                lastBacklogLogMs = System.currentTimeMillis();
            }
        }
        if (!chunkQueue.offer(data)) {
            // drop oldest to keep stream moving
            chunkQueue.poll();
            chunkQueue.offer(data);
        }
    }

    private void scheduleReconnect() {
        if (currentServerUrl == null || currentSerial == null) return;
        if (reconnectAttempts > 6) {
            updateNotification("Déconnecté (abandon)", false);
            return;
        }
        int delay = Math.min(5000, 1000 + reconnectAttempts * 1000);
        reconnectAttempts++;
        updateNotification("Reconnexion...", false);
        handler.postDelayed(() -> {
            if (currentServerUrl != null && currentSerial != null) {
                chunkQueue = new LinkedBlockingQueue<>(64);
                streamEnded = new AtomicBoolean(false);
                preparePlayer();
                connectWebSocket(buildWsUrl(currentServerUrl, currentSerial));
            }
        }, delay);
    }

    private void markStreamEnded() {
        if (streamEnded != null) {
            streamEnded.set(true);
        }
    }

    private void stopStreaming() {
        markStreamEnded();
        if (webSocket != null) {
            try { webSocket.close(1000, "stop"); } catch (Exception ignored) {}
            webSocket = null;
        }
        releasePlayer();
    }

    private void releasePlayer() {
        if (player != null) {
            try {
                player.stop();
            } catch (Exception ignored) {}
            player.release();
            player = null;
        }
    }

    private Notification buildNotification(String message, boolean connected) {
        Intent launchIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent stopIntent = new Intent(this, VoiceReceiverService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPending = PendingIntent.getService(
                this, 1, stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("VHR Voice")
                .setContentText(message)
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setContentIntent(pendingIntent)
                .addAction(android.R.drawable.ic_media_pause, "Arrêter", stopPending)
                .setOngoing(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_LOW);

        if (connected) {
            builder.setSubText("🟢 Connecté");
        } else {
            builder.setSubText("🟠 En attente");
        }

        return builder.build();
    }

    private void updateNotification(String message, boolean connected) {
        Notification notification = buildNotification(message, connected);
        NotificationManagerCompat.from(this).notify(NOTIFICATION_ID, notification);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "VHR Voice",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Réception audio VHR");
            channel.setSound(null, null);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private String buildWsUrl(String serverUrl, String serial) {
        String ws = serverUrl.trim();
        if (!ws.startsWith("http")) {
            ws = "http://" + ws;
        }
        ws = ws.replaceFirst("^http", "ws");
        if (ws.endsWith("/")) {
            ws = ws.substring(0, ws.length() - 1);
        }
        String encodedSerial = URLEncoder.encode(serial, StandardCharsets.UTF_8);
        return ws + "/api/audio/stream?serial=" + encodedSerial + "&mode=receiver&format=webm";
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "Service destroyed");
        stopStreaming();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private static class WebSocketDataSource extends BaseDataSource {
        private final BlockingQueue<byte[]> queue;
        private final AtomicBoolean ended;
        private byte[] currentChunk;
        private int offset;

        WebSocketDataSource(BlockingQueue<byte[]> queue, AtomicBoolean ended) {
            super(true);
            this.queue = queue;
            this.ended = ended;
        }

        @Override
        public long open(DataSpec dataSpec) {
            transferInitializing(dataSpec);
            transferStarted(dataSpec);
            return C.LENGTH_UNSET;
        }

        @Override
        public int read(byte[] buffer, int offset, int readLength) throws InterruptedIOException {
            try {
                while (currentChunk == null || this.offset >= currentChunk.length) {
                    if (ended.get() && queue.isEmpty()) {
                        return C.RESULT_END_OF_INPUT;
                    }
                    currentChunk = queue.poll(QUEUE_POLL_MS, TimeUnit.MILLISECONDS);
                    this.offset = 0;
                }
                int toCopy = Math.min(readLength, currentChunk.length - this.offset);
                System.arraycopy(currentChunk, this.offset, buffer, offset, toCopy);
                this.offset += toCopy;
                if (this.offset >= currentChunk.length) {
                    currentChunk = null;
                }
                return toCopy;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new InterruptedIOException("Read interrupted");
            }
        }

        @Override
        public Uri getUri() {
            return Uri.EMPTY;
        }

        @Override
        public void close() {
            currentChunk = null;
        }
    }
}
