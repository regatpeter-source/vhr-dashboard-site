package com.vhr.dashboard

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.time.format.DateTimeFormatter

class MainActivity : ComponentActivity() {
    
    private val viewModel: TtsViewModel by viewModels()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Log.d("MainActivity", "🚀 Démarrage de l'app VHR TTS Receiver")
        
        // Demander les permissions
        requestPermissions()
        
        // Démarrer le service TTS
        val serviceIntent = android.content.Intent(this, TtsService::class.java)
        startService(serviceIntent)
        
        // Démarrer le client relais (connexion au serveur Socket.IO)
        RelayClient.start(applicationContext)
        Log.d("MainActivity", "🔗 Relay client démarré (sessionId=${RelayClient.sessionId})")
        
        Log.d("MainActivity", "✅ Service TTS démarré")
        
        setContent {
            VhrTtsReceiverApp(viewModel)
        }
    }
    
    private fun requestPermissions() {
        val permissions = mutableListOf<String>()
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.RECORD_AUDIO
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                permissions.add(Manifest.permission.RECORD_AUDIO)
            }
        }
        
        if (permissions.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, permissions.toTypedArray(), 100)
        }
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        if (requestCode == 100) {
            for (i in permissions.indices) {
                if (grantResults[i] == PackageManager.PERMISSION_GRANTED) {
                    Log.d("MainActivity", "✅ Permission accordée: ${permissions[i]}")
                } else {
                    Log.w("MainActivity", "❌ Permission refusée: ${permissions[i]}")
                }
            }
        }
    }
}

@Composable
fun VhrTtsReceiverApp(viewModel: TtsViewModel) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Color(0xFF667EEA),
            onPrimary = Color.White,
            primaryContainer = Color(0xFF764BA2),
            surface = Color(0xFF1E1E2E),
            onSurface = Color(0xFFE0E0E0)
        )
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            TtsReceiverScreen(viewModel)
        }
    }
}

@Composable
fun TtsReceiverScreen(viewModel: TtsViewModel) {
    val messages = viewModel.messages.collectAsState()
    val isListening = viewModel.isListening.collectAsState()
    val messageCount = viewModel.messageCount.collectAsState()
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(
                        Color(0xFF1A1A2E),
                        Color(0xFF16213E)
                    )
                )
            )
            .padding(16.dp)
    ) {
        // Header
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 20.dp)
        ) {
            Text(
                "🎙️ VHR TTS Receiver",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF667EEA),
                modifier = Modifier.padding(bottom = 8.dp)
            )
            
            Text(
                "Écouteur vocal actif sur le casque Quest",
                fontSize = 14.sp,
                color = Color(0xFFB0B0B0),
                modifier = Modifier.padding(bottom = 12.dp)
            )
        }
        
        // Status Card
        StatusCard(
            isListening = isListening.value,
            messageCount = messageCount.value
        )
        
        // Message List
        Text(
            "📋 Historique des Messages",
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            modifier = Modifier
                .padding(vertical = 16.dp)
        )
        
        if (messages.value.isEmpty()) {
            EmptyStateCard()
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(messages.value) { message ->
                    MessageCard(message)
                }
            }
        }
        
        // Action Buttons
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Button(
                onClick = { viewModel.clearHistory() },
                modifier = Modifier
                    .weight(1f)
                    .height(44.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF764BA2)
                )
            ) {
                Text("🗑️ Effacer l'historique")
            }
        }
    }
}

@Composable
fun StatusCard(isListening: Boolean, messageCount: Int) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isListening) Color(0xFF2D5016) else Color(0xFF5F1E1E)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        "🟢 Statut",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    
                    Text(
                        if (isListening) "Écouteur actif" else "Inactif",
                        fontSize = 12.sp,
                        color = if (isListening) Color(0xFF90EE90) else Color(0xFFFF6B6B),
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
                
                Column(
                    horizontalAlignment = Alignment.End
                ) {
                    Text(
                        "💬 Messages",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    
                    Text(
                        messageCount.toString(),
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF667EEA),
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun MessageCard(message: TtsMessage) {
    Card(
        modifier = Modifier
            .fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = when (message.status) {
                "completed" -> Color(0xFF2D5016)
                "error" -> Color(0xFF5F1E1E)
                "speaking" -> Color(0xFF4A4A2E)
                else -> Color(0xFF2E2E3E)
            }
        ),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        message.text,
                        fontSize = 14.sp,
                        color = Color.White,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }
                
                Text(
                    when (message.status) {
                        "speaking" -> "🔊"
                        "completed" -> "✅"
                        "error" -> "❌"
                        else -> "⏳"
                    },
                    fontSize = 18.sp,
                    modifier = Modifier.padding(start = 8.dp)
                )
            }
            
            Text(
                "${message.status} • ${
                    message.timestamp.format(
                        DateTimeFormatter.ofPattern("HH:mm:ss")
                    )
                }",
                fontSize = 11.sp,
                color = Color(0xFF808080),
                modifier = Modifier.padding(top = 6.dp)
            )
        }
    }
}

@Composable
fun EmptyStateCard() {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 32.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF2E2E3E)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                "📭",
                fontSize = 48.sp,
                modifier = Modifier.padding(bottom = 16.dp)
            )
            
            Text(
                "Aucun message",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            
            Text(
                "En attente de messages du Dashboard...",
                fontSize = 12.sp,
                color = Color(0xFF808080),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
        }
    }
}
