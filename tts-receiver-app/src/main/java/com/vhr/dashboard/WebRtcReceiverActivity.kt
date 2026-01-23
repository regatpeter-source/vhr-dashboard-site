package com.vhr.dashboard

import android.annotation.SuppressLint
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.WindowManager
import android.webkit.ConsoleMessage
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import java.net.URLEncoder

class WebRtcReceiverActivity : AppCompatActivity() {

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Garder l'écran éveillé pendant la session WebRTC
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Autoriser le debogage WebView (utile pour inspecter la page dans Chrome DevTools)
        WebView.setWebContentsDebuggingEnabled(true)

        val webView = WebView(this)
        setContentView(webView)

        val room = intent.getStringExtra("room")?.takeIf { it.isNotBlank() } ?: "test"
        val serverUrl = intent.getStringExtra("serverUrl")?.takeIf { it.isNotBlank() }
        val baseUrl = serverUrl ?: "http://localhost:3000"
        val url = "${baseUrl.trimEnd('/')}/webrtc-test.html?room=${URLEncoder.encode(room, "UTF-8")}&role=receiver&autostart=1"

        Log.i(TAG, "Loading WebRTC receiver URL: $url")

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                Log.i(TAG, "Page loaded: $url")
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                if (consoleMessage != null) {
                    val origin = consoleMessage.sourceId()
                    Log.i(TAG, "Console [${consoleMessage.messageLevel()}] ${consoleMessage.message()} (${origin}:${consoleMessage.lineNumber()})")
                }
                return super.onConsoleMessage(consoleMessage)
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }
        }

        // Charger l'URL et rester en tâche de fond (l'activité peut être envoyée derrière)
        webView.loadUrl(url)
        moveTaskToBack(true)
    }

    companion object {
        private const val TAG = "WebRtcReceiver"
    }
}
