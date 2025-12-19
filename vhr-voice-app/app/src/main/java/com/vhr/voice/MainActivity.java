package com.vhr.voice;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URL;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Main activity for manual configuration (optional)
 * The app can also be controlled entirely via ADB broadcasts
 */
public class MainActivity extends Activity {
    private EditText serverUrlInput;
    private EditText serialInput;
    private TextView statusText;
    private Button startButton;
    private Button stopButton;
    private Button detectButton;
    private SharedPreferences prefs;
    private Handler mainHandler;
    private ExecutorService executor;
    private AtomicBoolean isScanning = new AtomicBoolean(false);
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        prefs = getSharedPreferences("vhr_voice", MODE_PRIVATE);
        mainHandler = new Handler(Looper.getMainLooper());
        executor = Executors.newSingleThreadExecutor();
        
        serverUrlInput = findViewById(R.id.serverUrl);
        serialInput = findViewById(R.id.serial);
        statusText = findViewById(R.id.status);
        startButton = findViewById(R.id.startBtn);
        stopButton = findViewById(R.id.stopBtn);
        detectButton = findViewById(R.id.detectBtn);
        
        // Auto-detect device serial
        String deviceSerial = getDeviceSerial();
        if (deviceSerial != null && !deviceSerial.isEmpty() && !deviceSerial.equals("unknown")) {
            serialInput.setText(deviceSerial);
        } else {
            // Load saved serial if available
            String savedSerial = prefs.getString("serial", "");
            if (!savedSerial.isEmpty()) {
                serialInput.setText(savedSerial);
            }
        }
        
        // Load saved server URL or use default
        String savedUrl = prefs.getString("serverUrl", "");
        if (!savedUrl.isEmpty()) {
            serverUrlInput.setText(savedUrl);
        } else {
            // Default to local network - user should change this
            serverUrlInput.setText("http://192.168.1.XXX:3000");
            serverUrlInput.setSelection(serverUrlInput.getText().length());
        }
        
        // Check if started with intent parameters (from ADB)
        Intent intent = getIntent();
        if (intent != null) {
            String serverUrl = intent.getStringExtra("serverUrl");
            String serial = intent.getStringExtra("serial");
            boolean autoStart = intent.getBooleanExtra("autostart", false);
            
            if (serverUrl != null && !serverUrl.isEmpty()) {
                serverUrlInput.setText(serverUrl);
                prefs.edit().putString("serverUrl", serverUrl).apply();
            }
            if (serial != null && !serial.isEmpty()) {
                serialInput.setText(serial);
                prefs.edit().putString("serial", serial).apply();
            }
            if (autoStart) {
                // Auto-start with provided or saved values
                String url = serverUrlInput.getText().toString().trim();
                String ser = serialInput.getText().toString().trim();
                if (!url.isEmpty() && !ser.isEmpty() && !url.contains("XXX")) {
                    startVoiceService();
                    moveTaskToBack(true);
                }
            }
        }
        
        startButton.setOnClickListener(v -> startVoiceService());
        stopButton.setOnClickListener(v -> stopVoiceService());
        detectButton.setOnClickListener(v -> detectServer());
        
        // Update status if service is running
        if (VoiceReceiverService.isRunning) {
            statusText.setText("🟢 Service actif");
        }
        
        // Auto-detect server on startup if URL contains XXX
        String currentUrl = serverUrlInput.getText().toString();
        if (currentUrl.contains("XXX")) {
            detectServer();
        }
    }
    
    /**
     * Detect VHR server on local network
     */
    private void detectServer() {
        if (isScanning.get()) {
            Toast.makeText(this, "Recherche déjà en cours...", Toast.LENGTH_SHORT).show();
            return;
        }
        
        isScanning.set(true);
        detectButton.setEnabled(false);
        detectButton.setText("🔍 Recherche en cours...");
        statusText.setText("🔍 Recherche du serveur VHR...");
        
        executor.execute(() -> {
            String foundServer = null;
            
            try {
                // Get local IP to determine network prefix
                String localIp = getLocalIpAddress();
                if (localIp != null) {
                    String prefix = localIp.substring(0, localIp.lastIndexOf('.') + 1);
                    
                    // Scan common IP addresses on the network
                    for (int i = 1; i <= 254 && foundServer == null; i++) {
                        String ip = prefix + i;
                        foundServer = checkVHRServer(ip, 3000);
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            
            final String result = foundServer;
            mainHandler.post(() -> {
                isScanning.set(false);
                detectButton.setEnabled(true);
                detectButton.setText("🔍 Détecter serveur automatiquement");
                
                if (result != null) {
                    serverUrlInput.setText(result);
                    prefs.edit().putString("serverUrl", result).apply();
                    statusText.setText("✅ Serveur trouvé !");
                    Toast.makeText(MainActivity.this, "Serveur VHR trouvé: " + result, Toast.LENGTH_LONG).show();
                } else {
                    statusText.setText("❌ Serveur non trouvé");
                    Toast.makeText(MainActivity.this, "Serveur VHR non trouvé. Vérifiez que le PC est allumé et sur le même réseau.", Toast.LENGTH_LONG).show();
                }
            });
        });
    }
    
    /**
     * Get local IP address
     */
    private String getLocalIpAddress() {
        try {
            for (NetworkInterface intf : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                for (InetAddress addr : Collections.list(intf.getInetAddresses())) {
                    if (!addr.isLoopbackAddress() && addr.getHostAddress().indexOf(':') < 0) {
                        String ip = addr.getHostAddress();
                        if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
                            return ip;
                        }
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }
    
    /**
     * Check if a VHR server is running at the given IP and port
     */
    private String checkVHRServer(String ip, int port) {
        try {
            URL url = new URL("http://" + ip + ":" + port + "/api/ping");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(200);
            conn.setReadTimeout(200);
            conn.setRequestMethod("GET");
            
            int responseCode = conn.getResponseCode();
            conn.disconnect();
            
            if (responseCode == 200) {
                return "http://" + ip + ":" + port;
            }
        } catch (Exception e) {
            // Server not found at this IP, continue
        }
        return null;
    }
    
    /**
     * Get the device serial number - multiple methods for Quest compatibility
     */
    private String getDeviceSerial() {
        String serial = null;
        
        // Method 1: Try getprop via shell command (most reliable on Quest)
        try {
            Process process = Runtime.getRuntime().exec("getprop ro.serialno");
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            serial = reader.readLine();
            reader.close();
            if (serial != null && !serial.isEmpty() && !serial.equals("unknown")) {
                return serial;
            }
        } catch (Exception e) {
            // Ignore
        }
        
        // Method 2: Try ro.boot.serialno
        try {
            Process process = Runtime.getRuntime().exec("getprop ro.boot.serialno");
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            serial = reader.readLine();
            reader.close();
            if (serial != null && !serial.isEmpty() && !serial.equals("unknown")) {
                return serial;
            }
        } catch (Exception e) {
            // Ignore
        }
        
        // Method 3: Build.SERIAL (deprecated but may work)
        try {
            serial = Build.SERIAL;
            if (serial != null && !serial.equals("unknown") && !serial.isEmpty()) {
                return serial;
            }
        } catch (Exception e) {
            // Ignore
        }
        
        // Method 4: Use Android ID as fallback (unique per device)
        try {
            serial = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
            if (serial != null && !serial.isEmpty()) {
                // Prefix to indicate it's an Android ID, not serial
                return "QUEST_" + serial.substring(0, Math.min(serial.length(), 12)).toUpperCase();
            }
        } catch (Exception e) {
            // Ignore
        }
        
        return null;
    }
    
    private void startVoiceService() {
        String serverUrl = serverUrlInput.getText().toString().trim();
        String serial = serialInput.getText().toString().trim();
        
        if (serverUrl.isEmpty()) {
            Toast.makeText(this, "Entrez l'URL du serveur", Toast.LENGTH_SHORT).show();
            return;
        }
        
        if (serial.isEmpty()) {
            Toast.makeText(this, "Entrez le numéro de série", Toast.LENGTH_SHORT).show();
            return;
        }
        
        if (serverUrl.contains("XXX")) {
            Toast.makeText(this, "Modifiez l'adresse IP du serveur (remplacez XXX)", Toast.LENGTH_LONG).show();
            return;
        }
        
        // Save for next time
        prefs.edit()
            .putString("serverUrl", serverUrl)
            .putString("serial", serial)
            .apply();
        
        Intent serviceIntent = new Intent(this, VoiceReceiverService.class);
        serviceIntent.setAction("START");
        serviceIntent.putExtra("serverUrl", serverUrl);
        serviceIntent.putExtra("serial", serial);
        
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
        
        statusText.setText("🟢 Service démarré");
        Toast.makeText(this, "Réception audio activée", Toast.LENGTH_SHORT).show();
    }
    
    private void stopVoiceService() {
        Intent serviceIntent = new Intent(this, VoiceReceiverService.class);
        serviceIntent.setAction("STOP");
        startService(serviceIntent);
        
        statusText.setText("🔴 Service arrêté");
        Toast.makeText(this, "Réception audio désactivée", Toast.LENGTH_SHORT).show();
    }
}
