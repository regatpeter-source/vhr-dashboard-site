package com.vhr.voice

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

data class TtsMessage(
    val id: String,
    val text: String,
    val timestamp: LocalDateTime,
    val status: String = "pending" // pending, speaking, completed, error
)

class TtsViewModel : ViewModel() {
    
    private val _messages = MutableStateFlow<List<TtsMessage>>(emptyList())
    val messages: StateFlow<List<TtsMessage>> = _messages
    
    private val _isListening = MutableStateFlow(true)
    val isListening: StateFlow<Boolean> = _isListening
    
    private val _messageCount = MutableStateFlow(0)
    val messageCount: StateFlow<Int> = _messageCount
    
    fun addMessage(text: String, status: String = "pending") {
        val message = TtsMessage(
            id = System.currentTimeMillis().toString(),
            text = text,
            timestamp = LocalDateTime.now(),
            status = status
        )
        
        viewModelScope.launch {
            _messages.value = listOf(message) + _messages.value
            _messageCount.value = _messages.value.size
        }
    }
    
    fun updateMessageStatus(id: String, status: String) {
        _messages.value = _messages.value.map {
            if (it.id == id) it.copy(status = status) else it
        }
    }
    
    fun clearHistory() {
        viewModelScope.launch {
            _messages.value = emptyList()
            _messageCount.value = 0
        }
    }
    
    fun setListening(isListening: Boolean) {
        _isListening.value = isListening
    }
}
