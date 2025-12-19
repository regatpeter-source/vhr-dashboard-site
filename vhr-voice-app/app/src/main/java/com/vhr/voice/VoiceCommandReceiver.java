package com.vhr.voice;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Broadcast receiver to start voice service via ADB command
 * Usage: adb shell am broadcast -a com.vhr.voice.START --es serverUrl "http://192.168.1.3:3000" --es serial "DEVICE_SERIAL"
 */
public class VoiceCommandReceiver extends BroadcastReceiver {
    private static final String TAG = "VHRVoice";
    
    public static final String ACTION_START = "com.vhr.voice.START";
    public static final String ACTION_STOP = "com.vhr.voice.STOP";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "Received broadcast: " + action);
        
        if (ACTION_START.equals(action)) {
            String serverUrl = intent.getStringExtra("serverUrl");
            String serial = intent.getStringExtra("serial");
            
            if (serverUrl != null && serial != null) {
                Log.d(TAG, "Starting voice service: " + serverUrl + " serial: " + serial);
                
                Intent serviceIntent = new Intent(context, VoiceReceiverService.class);
                serviceIntent.setAction("START");
                serviceIntent.putExtra("serverUrl", serverUrl);
                serviceIntent.putExtra("serial", serial);
                
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            } else {
                Log.e(TAG, "Missing serverUrl or serial parameter");
            }
            
        } else if (ACTION_STOP.equals(action)) {
            Log.d(TAG, "Stopping voice service");
            Intent serviceIntent = new Intent(context, VoiceReceiverService.class);
            serviceIntent.setAction("STOP");
            context.startService(serviceIntent);
        }
    }
}
