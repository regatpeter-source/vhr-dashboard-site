package com.vhr.voice;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final String PREFS = "vhr_voice";

    private EditText serverUrlInput;
    private EditText serialInput;
    private TextView statusText;
    private TextView logText;
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);

        serverUrlInput = findViewById(R.id.serverUrlInput);
        serialInput = findViewById(R.id.serialInput);
        statusText = findViewById(R.id.statusText);
        logText = findViewById(R.id.logText);
        Button startBtn = findViewById(R.id.startBtn);
        Button stopBtn = findViewById(R.id.stopBtn);

        startBtn.setOnClickListener(v -> startServiceFromUi());
        stopBtn.setOnClickListener(v -> stopServiceFromUi());

        loadDefaults();
        requestNotificationPermissionIfNeeded();
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        String serverUrl = intent.getStringExtra("serverUrl");
        String serial = intent.getStringExtra("serial");
        String cleanSerial = intent.getStringExtra("cleanSerial");
        String adbSerial = intent.getStringExtra("adbSerial");
        if (!TextUtils.isEmpty(cleanSerial)) serial = cleanSerial;
        if (!TextUtils.isEmpty(adbSerial)) serial = adbSerial;
        boolean autoStart = intent.getBooleanExtra("autostart", false);

        // Avoid swapping URL and serial if extras are malformed
        if (looksLikeUrl(serial)) {
            // Treat it as serverUrl if missing
            if (TextUtils.isEmpty(serverUrl)) {
                serverUrl = serial;
            }
            serial = null;
        }
        if (looksLikeUrl(serverUrl) && serverUrl.contains("serial=")) {
            // If we mistakenly received a full receiver URL, strip query
            int q = serverUrl.indexOf("?");
            if (q > 0) serverUrl = serverUrl.substring(0, q);
        }

        if (serverUrl != null && !serverUrl.isEmpty()) {
            serverUrlInput.setText(serverUrl);
            prefs.edit().putString("serverUrl", serverUrl).apply();
        }
        if (serial != null && !serial.isEmpty()) {
            serialInput.setText(serial);
            prefs.edit().putString("serial", serial).apply();
        }

        if (autoStart) {
            startServiceFromUi();
            // Push activity to background quickly to avoid game pause
            moveTaskToBack(true);
        }
    }

    private void loadDefaults() {
        String storedUrl = prefs.getString("serverUrl", "http://<LAN_IP>:3000");
        String storedSerial = prefs.getString("serial", "");

        if (looksLikeUrl(storedUrl)) {
            serverUrlInput.setText(storedUrl);
        }

        if (!storedSerial.isEmpty() && !looksLikeUrl(storedSerial)) {
            serialInput.setText(storedSerial);
        } else {
            String deviceSerial = fetchDeviceSerial();
            if (deviceSerial != null) {
                serialInput.setText(deviceSerial);
            }
        }
    }

    private void startServiceFromUi() {
        String serverUrl = serverUrlInput.getText().toString().trim();
        String serial = serialInput.getText().toString().trim();

        if (serverUrl.isEmpty() || serverUrl.contains("<LAN_IP>")) {
            toast("URL serveur invalide");
            return;
        }
        if (serial.isEmpty()) {
            toast("Numéro de série requis");
            return;
        }

        prefs.edit().putString("serverUrl", serverUrl).putString("serial", serial).apply();
        Intent serviceIntent = new Intent(this, VoiceReceiverService.class);
        serviceIntent.setAction(VoiceReceiverService.ACTION_START);
        serviceIntent.putExtra("serverUrl", serverUrl);
        serviceIntent.putExtra("serial", serial);
        ContextCompat.startForegroundService(this, serviceIntent);
        statusText.setText("Service démarré...");
        logText.setText(String.format(Locale.US, "Connecting to %s with serial %s", serverUrl, serial));
    }

    private void stopServiceFromUi() {
        Intent serviceIntent = new Intent(this, VoiceReceiverService.class);
        serviceIntent.setAction(VoiceReceiverService.ACTION_STOP);
        startService(serviceIntent);
        statusText.setText("Service arrêté");
    }

    private void toast(String msg) {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    private String fetchDeviceSerial() {
        try {
            Process process = Runtime.getRuntime().exec("getprop ro.serialno");
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String serial = reader.readLine();
            reader.close();
            if (serial != null && !serial.equalsIgnoreCase("unknown") && !serial.isEmpty()) return serial.trim();
        } catch (Exception ignored) {}

        try {
            Process process = Runtime.getRuntime().exec("getprop ro.boot.serialno");
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String serial = reader.readLine();
            reader.close();
            if (serial != null && !serial.equalsIgnoreCase("unknown") && !serial.isEmpty()) return serial.trim();
        } catch (Exception ignored) {}

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                String serial = Build.getSerial();
                if (serial != null && !serial.equalsIgnoreCase("unknown") && !serial.isEmpty()) return serial.trim();
            } else {
                String serial = Build.SERIAL;
                if (serial != null && !serial.equalsIgnoreCase("unknown") && !serial.isEmpty()) return serial.trim();
            }
        } catch (Exception ignored) {}

        try {
            String androidId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
            if (androidId != null && !androidId.isEmpty()) {
                return "QUEST_" + androidId.toUpperCase(Locale.US);
            }
        } catch (Exception ignored) {}

        return null;
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 100);
            }
        }
    }

    private boolean looksLikeUrl(String value) {
        if (TextUtils.isEmpty(value)) return false;
        String v = value.trim().toLowerCase(Locale.US);
        return v.startsWith("http://") || v.startsWith("https://") || v.contains("://");
    }
}
