package com.vhr.voice;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Allows control via adb broadcast:
 * adb shell am broadcast -a com.vhr.voice.START --es serverUrl "http://<LAN_IP>:3000" --es serial "DEVICE_SERIAL" --ez autostart true
 * adb shell am broadcast -a com.vhr.voice.STOP
 */
public class VoiceCommandReceiver extends BroadcastReceiver {
    private static final String TAG = "VHRVoice";
    public static final String ACTION_START = "com.vhr.voice.START";
    public static final String ACTION_STOP = "com.vhr.voice.STOP";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String action = intent.getAction();
        Log.d(TAG, "Broadcast received: " + action);

        if (ACTION_START.equals(action)) {
            Intent serviceIntent = new Intent(context, VoiceReceiverService.class);
            serviceIntent.setAction(VoiceReceiverService.ACTION_START);
            serviceIntent.putExtras(intent);
            androidx.core.content.ContextCompat.startForegroundService(context, serviceIntent);
        } else if (ACTION_STOP.equals(action)) {
            Intent serviceIntent = new Intent(context, VoiceReceiverService.class);
            serviceIntent.setAction(VoiceReceiverService.ACTION_STOP);
            context.startService(serviceIntent);
        }
    }
}
