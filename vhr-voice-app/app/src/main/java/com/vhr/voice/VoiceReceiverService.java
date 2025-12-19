package com.vhr.voice;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import java.net.URI;
import java.nio.ByteBuffer;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Background service for receiving voice audio from PC via WebSocket
 * Runs as a foreground service to stay active even when games are running
 */
public class VoiceReceiverService extends Service {
    private static final String TAG = "VHRVoice";
    private static final String CHANNEL_ID = "vhr_voice_channel";
    private static final int NOTIFICATION_ID = 1001;
    
    private WebSocketClient webSocketClient;
    private AudioTrack audioTrack;
    private ExecutorService executor;
    private String serverUrl;
    private String deviceSerial;
    private boolean isRunning = false;
    
    // Audio configuration
    private static final int SAMPLE_RATE = 48000;
    private static final int CHANNEL_CONFIG = AudioFormat.CHANNEL_OUT_STEREO;
    private static final int AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "VoiceReceiverService created");
        executor = Executors.newSingleThreadExecutor();
        createNotificationChannel();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            
            if ("START".equals(action)) {
                serverUrl = intent.getStringExtra("serverUrl");
                deviceSerial = intent.getStringExtra("serial");
                
                if (serverUrl != null && deviceSerial != null) {
                    Log.d(TAG, "Starting voice receiver: " + serverUrl + " serial: " + deviceSerial);
                    startForegroundService();
                    startWebSocket();
                }
            } else if ("STOP".equals(action)) {
                stopSelf();
            }
        }
        
        return START_STICKY;
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "VHR Voice Receiver",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Réception audio PC vers casque");
            channel.setSound(null, null);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    private void startForegroundService() {
        Intent stopIntent = new Intent(this, VoiceReceiverService.class);
        stopIntent.setAction("STOP");
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent, PendingIntent.FLAG_IMMUTABLE
        );
        
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }
        
        Notification notification = builder
            .setContentTitle("🎤 VHR Voice Active")
            .setContentText("Réception audio du PC en cours...")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_media_pause, "Arrêter", stopPendingIntent)
            .build();
        
        startForeground(NOTIFICATION_ID, notification);
    }
    
    private void startWebSocket() {
        if (isRunning) {
            Log.d(TAG, "Already running, stopping first");
            stopWebSocket();
        }
        
        executor.execute(() -> {
            try {
                // Build WebSocket URL
                String wsUrl = serverUrl.replace("http://", "ws://").replace("https://", "wss://");
                wsUrl += "/api/audio/stream?serial=" + deviceSerial + "&mode=receiver";
                
                Log.d(TAG, "Connecting to: " + wsUrl);
                
                URI uri = new URI(wsUrl);
                webSocketClient = new WebSocketClient(uri) {
                    @Override
                    public void onOpen(ServerHandshake handshake) {
                        Log.d(TAG, "WebSocket connected!");
                        isRunning = true;
                        initAudioTrack();
                    }
                    
                    @Override
                    public void onMessage(String message) {
                        // Handle JSON messages
                        Log.d(TAG, "Message: " + message);
                    }
                    
                    @Override
                    public void onMessage(ByteBuffer bytes) {
                        // Handle binary audio data
                        playAudio(bytes);
                    }
                    
                    @Override
                    public void onClose(int code, String reason, boolean remote) {
                        Log.d(TAG, "WebSocket closed: " + reason);
                        isRunning = false;
                        releaseAudioTrack();
                        
                        // Auto-reconnect after 3 seconds
                        if (!executor.isShutdown()) {
                            try {
                                Thread.sleep(3000);
                                if (!isRunning) {
                                    startWebSocket();
                                }
                            } catch (InterruptedException e) {
                                // Ignore
                            }
                        }
                    }
                    
                    @Override
                    public void onError(Exception ex) {
                        Log.e(TAG, "WebSocket error: " + ex.getMessage());
                    }
                };
                
                webSocketClient.connect();
                
            } catch (Exception e) {
                Log.e(TAG, "Failed to start WebSocket: " + e.getMessage());
            }
        });
    }
    
    private void initAudioTrack() {
        try {
            int bufferSize = AudioTrack.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT);
            
            AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build();
            
            AudioFormat format = new AudioFormat.Builder()
                .setSampleRate(SAMPLE_RATE)
                .setChannelMask(CHANNEL_CONFIG)
                .setEncoding(AUDIO_FORMAT)
                .build();
            
            audioTrack = new AudioTrack(
                attributes,
                format,
                bufferSize * 2,
                AudioTrack.MODE_STREAM,
                AudioManager.AUDIO_SESSION_ID_GENERATE
            );
            
            audioTrack.play();
            Log.d(TAG, "AudioTrack initialized");
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to init AudioTrack: " + e.getMessage());
        }
    }
    
    private void playAudio(ByteBuffer buffer) {
        if (audioTrack != null && audioTrack.getPlayState() == AudioTrack.PLAYSTATE_PLAYING) {
            try {
                byte[] data = new byte[buffer.remaining()];
                buffer.get(data);
                audioTrack.write(data, 0, data.length);
            } catch (Exception e) {
                Log.e(TAG, "Audio playback error: " + e.getMessage());
            }
        }
    }
    
    private void releaseAudioTrack() {
        if (audioTrack != null) {
            try {
                audioTrack.stop();
                audioTrack.release();
                audioTrack = null;
            } catch (Exception e) {
                // Ignore
            }
        }
    }
    
    private void stopWebSocket() {
        isRunning = false;
        if (webSocketClient != null) {
            try {
                webSocketClient.close();
            } catch (Exception e) {
                // Ignore
            }
            webSocketClient = null;
        }
    }
    
    @Override
    public void onDestroy() {
        Log.d(TAG, "VoiceReceiverService destroyed");
        stopWebSocket();
        releaseAudioTrack();
        if (executor != null) {
            executor.shutdown();
        }
        super.onDestroy();
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
