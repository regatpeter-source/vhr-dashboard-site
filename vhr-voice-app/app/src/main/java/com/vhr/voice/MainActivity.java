package com.vhr.voice;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

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
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        serverUrlInput = findViewById(R.id.serverUrl);
        serialInput = findViewById(R.id.serial);
        statusText = findViewById(R.id.status);
        startButton = findViewById(R.id.startBtn);
        stopButton = findViewById(R.id.stopBtn);
        
        // Check if started with intent parameters
        Intent intent = getIntent();
        if (intent != null) {
            String serverUrl = intent.getStringExtra("serverUrl");
            String serial = intent.getStringExtra("serial");
            boolean autoStart = intent.getBooleanExtra("autostart", false);
            
            if (serverUrl != null) {
                serverUrlInput.setText(serverUrl);
            }
            if (serial != null) {
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
    }
    
    private void startVoiceService() {
        String serverUrl = serverUrlInput.getText().toString().trim();
        String serial = serialInput.getText().toString().trim();
        
        if (serverUrl.isEmpty() || serial.isEmpty()) {
            Toast.makeText(this, "Veuillez remplir tous les champs", Toast.LENGTH_SHORT).show();
            return;
        }
        
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
