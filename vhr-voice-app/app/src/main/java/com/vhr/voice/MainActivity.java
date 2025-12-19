package com.vhr.voice;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import java.lang.reflect.Method;

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
    private SharedPreferences prefs;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        prefs = getSharedPreferences("vhr_voice", MODE_PRIVATE);
        
        serverUrlInput = findViewById(R.id.serverUrl);
        serialInput = findViewById(R.id.serial);
        statusText = findViewById(R.id.status);
        startButton = findViewById(R.id.startBtn);
        stopButton = findViewById(R.id.stopBtn);
        
        // Auto-detect device serial
        String deviceSerial = getDeviceSerial();
        if (deviceSerial != null && !deviceSerial.isEmpty()) {
            serialInput.setText(deviceSerial);
            serialInput.setEnabled(false); // Disable editing since it's auto-detected
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
        
        // Check if started with intent parameters
        Intent intent = getIntent();
        if (intent != null) {
            String serverUrl = intent.getStringExtra("serverUrl");
            String serial = intent.getStringExtra("serial");
            boolean autoStart = intent.getBooleanExtra("autostart", false);
            
            if (serverUrl != null && !serverUrl.isEmpty()) {
                serverUrlInput.setText(serverUrl);
                // Save for next time
                prefs.edit().putString("serverUrl", serverUrl).apply();
            }
            if (serial != null && !serial.isEmpty()) {
                serialInput.setText(serial);
            }
            if (autoStart && serverUrl != null && serial != null) {
                startVoiceService();
                // Minimize to background
                moveTaskToBack(true);
            }
        }
        
        startButton.setOnClickListener(v -> startVoiceService());
        stopButton.setOnClickListener(v -> stopVoiceService());
        
        // Update status if service is running
        if (VoiceReceiverService.isRunning) {
            statusText.setText("🟢 Service actif");
        }
    }
    
    /**
     * Get the device serial number
     */
    private String getDeviceSerial() {
        String serial = null;
        try {
            // Try Build.getSerial() for Android 8+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // This requires READ_PHONE_STATE permission which we may not have
                // So we use reflection to get SERIAL from Build
                try {
                    serial = Build.getSerial();
                } catch (SecurityException e) {
                    // Fall through to other methods
                }
            }
            
            // Fallback: Try Build.SERIAL (deprecated but works on many devices)
            if (serial == null || serial.equals("unknown") || serial.isEmpty()) {
                serial = Build.SERIAL;
            }
            
            // Fallback: Try system property
            if (serial == null || serial.equals("unknown") || serial.isEmpty()) {
                try {
                    Class<?> c = Class.forName("android.os.SystemProperties");
                    Method get = c.getMethod("get", String.class);
                    serial = (String) get.invoke(c, "ro.serialno");
                } catch (Exception e) {
                    // Ignore
                }
            }
            
            // Fallback: Try another property
            if (serial == null || serial.equals("unknown") || serial.isEmpty()) {
                try {
                    Class<?> c = Class.forName("android.os.SystemProperties");
                    Method get = c.getMethod("get", String.class);
                    serial = (String) get.invoke(c, "ril.serialnumber");
                } catch (Exception e) {
                    // Ignore
                }
            }
            
        } catch (Exception e) {
            e.printStackTrace();
        }
        
        return (serial != null && !serial.equals("unknown")) ? serial : null;
    }
    
    private void startVoiceService() {
        String serverUrl = serverUrlInput.getText().toString().trim();
        String serial = serialInput.getText().toString().trim();
        
        if (serverUrl.isEmpty() || serial.isEmpty()) {
            Toast.makeText(this, "Veuillez remplir tous les champs", Toast.LENGTH_SHORT).show();
            return;
        }
        
        if (serverUrl.contains("XXX")) {
            Toast.makeText(this, "Modifiez l'adresse IP du serveur", Toast.LENGTH_LONG).show();
            return;
        }
        
        // Save server URL for next time
        prefs.edit().putString("serverUrl", serverUrl).apply();
        
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
