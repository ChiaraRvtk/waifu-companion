// Assumes debugLog, isProcessing, messageInput, addMessage, conversationContext, maxMemorySize,
// showTypingIndicator, getAIResponse, currentModel, playTTS,
// selectedLanguageCode, translateToLanguageCode, showTransliteration,
// getTranslatedText, getTransliteration (from ai_interface.js) are accessible via window or config.js

function deleteMessage(messageElement, content, isUser) {
  // Remove from UI with a small fade effect
  messageElement.style.opacity = '0';
  messageElement.style.transform = 'scale(0.9)';
  messageElement.style.transition = 'all 0.2s ease';

  setTimeout(() => {
    messageElement.remove();
  }, 200);

  // Remove from conversationContext
  const role = isUser ? 'user' : 'assistant';
  // Use findLastIndex to target the specific instance if there are duplicates (more likely to delete the one clicked)
  // However, simple findIndex is usually enough for most cases.
  const index = conversationContext.findIndex(m => m.content === content && m.role === role);

  if (index !== -1) {
    conversationContext.splice(index, 1);
    try {
      localStorage.setItem('conversationContext', JSON.stringify(conversationContext));
      debugLog(`Message deleted from context: "${content.substring(0, 30)}..."`, 'info');
    } catch (e) {
      debugLog('Failed to update localStorage after message deletion', 'error');
    }
  } else {
    debugLog('Message removed from UI, but not found in conversationContext (may have been a system/sample message).', 'info');
  }
}
window.deleteMessage = deleteMessage;

async function sendMessage() {
  if (isProcessing) return;

  const message = messageInput.value.trim();
  if (!message) return;

  isProcessing = true;
  // Clear input immediately to prevent double-processing or STT interference
  messageInput.value = "";
  if (window.hasOwnProperty('sttFinalTranscript')) {
    window.sttFinalTranscript = "";
  }

  debugLog(`Processing new message: "${message}"`, 'info');

  try {
    addMessage(message, true, null, null, 'en-US');
    conversationContext.push({ role: "user", content: message });
    while (conversationContext.length > maxMemorySize) {
      conversationContext.shift();
    }
    localStorage.setItem('conversationContext', JSON.stringify(conversationContext));
    debugLog('Saved user message to conversation context', 'info');

    showTypingIndicator(true);

    const aiResponse = await getAIResponse(message, selectedLanguageCode);
    showTypingIndicator(false);

    let originalReply = aiResponse.reply;
    let englishTranslationText = null;
    let transliterationText = null;
    const isErrorReply = originalReply === "Oh no... I'm having trouble connecting. Could we try again in a moment?";

    if (!isErrorReply) {
      // Since translate to language is now the same as response language, no automatic translation needed
      // englishTranslationText is no longer generated

      if (showTransliteration && (selectedLanguageCode === 'ja-JP' || selectedLanguageCode === 'ko-KR')) {
        transliterationText = await getTransliteration(originalReply, selectedLanguageCode);
      }
    }

    const messageId = addMessage(originalReply, false, englishTranslationText, transliterationText, selectedLanguageCode);

    conversationContext.push({
      role: "assistant",
      content: originalReply,
    });
    // Trim again after assistant reply to respect memory size
    while (conversationContext.length > maxMemorySize) {
      conversationContext.shift();
    }
    localStorage.setItem('conversationContext', JSON.stringify(conversationContext));
    debugLog('Saved AI response to conversation context and trimmed.', 'info');

    if (currentModel && !isErrorReply) {
      // Enhanced emotion responses with more varied animations
      switch (aiResponse.emotion) {
        case "happy":
          currentModel.expression("f04");
          // Add cheerful body language
          currentAnimationState.targetBodyAngle = Math.random() * 10 - 5;
          setTimeout(() => { currentAnimationState.targetBodyAngle = 0; }, 3000);
          break;
        case "sad":
          currentModel.expression("f03");
          currentModel.internalModel.coreModel.setParameterValueById("ParamBrowY", -1);
          // Slight downward head tilt
          currentAnimationState.targetHeadAngle = -8;
          setTimeout(() => { currentAnimationState.targetHeadAngle = 0; }, 4000);
          break;
        case "surprised":
          currentModel.expression("f02");
          currentModel.internalModel.coreModel.setParameterValueById("ParamEyeLOpen", 2);
          currentModel.internalModel.coreModel.setParameterValueById("ParamEyeROpen", 2);
          // Quick head movement
          currentAnimationState.targetHeadAngle = (Math.random() - 0.5) * 15;
          setTimeout(() => { currentAnimationState.targetHeadAngle = 0; }, 2000);
          break;
        case "thoughtful":
          currentModel.expression("f04");
          currentModel.internalModel.coreModel.setParameterValueById("ParamBrowY", 0.5);
          // Slight head tilt
          currentAnimationState.targetHeadAngle = Math.random() > 0.5 ? 12 : -12;
          setTimeout(() => { currentAnimationState.targetHeadAngle = 0; }, 5000);
          break;
        case "excited":
          currentModel.motion("tap_body");
          currentModel.expression("f01");
          // More energetic body movement
          currentAnimationState.targetBodyAngle = 15;
          setTimeout(() => {
            currentAnimationState.targetBodyAngle = -10;
            setTimeout(() => { currentAnimationState.targetBodyAngle = 0; }, 1000);
          }, 1000);
          break;
        default:
          currentModel.expression("f00");
          // Reset any ongoing animations
          currentAnimationState.targetHeadAngle = 0;
          currentAnimationState.targetBodyAngle = 0;
      }
    }

    const langConfig = languages.find(l => l.code === selectedLanguageCode) || languages.find(l => l.code === 'en-US');
    const voiceId = selectedVoiceId || langConfig.defaultVoiceId;
    debugLog(`TTS Queue: Using voice ID: ${voiceId} for language: ${langConfig.englishName}`, 'info');

    // Initiate TTS playback but don't block `isProcessing` from being reset.
    // `playTTS` itself handles stopping any previous audio.
    if (window.enableVoice && !isErrorReply) {
      try {
        playTTS(originalReply, selectedLanguageCode, messageId);
      } catch (e) {
        // If TTS fails (e.g., HTTP 429/500 or provider error), just log it and continue.
        // The chat UI has already displayed the response text, so conversation is unaffected.
        debugLog(`TTS call failed (playTTS threw): ${e}`, 'error');
      }
    } else if (!window.enableVoice) {
      debugLog('TTS is disabled in settings, skipping playback.', 'info');
    } else if (isErrorReply) {
      debugLog('TTS skipped for connectivity error message.', 'info');
    }


    debugLog(`AI response processed. Emotion: ${aiResponse.emotion}. isProcessing is now false. TTS initiated.`, 'info');
    isProcessing = false; // Allow new messages to be sent

  } catch (err) {
    debugLog(`Message processing failed: ${err}`, 'error');
    // Ensure isProcessing is reset in case of an error before TTS is even called
    isProcessing = false;
    addMessage("Sorry, something went wrong while processing your message.", false);
    showTypingIndicator(false);
  }
}

function initChatController() {
  // Assumes messageInput is globally available (e.g., from config.js)
  if (window.messageInput) {
    messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        sendMessage();
      }
    });
    debugLog('Chat controller initialized, Enter key listener added to message input.', 'info');
  } else {
    debugLog('Chat_Controller: messageInput not found for event listener attachment.', 'error');
  }

  // Search button initialization
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      if (typeof window.toggleSearch === 'function') {
        window.toggleSearch();
      }
    });
    debugLog('Search button event listener added.', 'info');
  }
  // Add listener for the send button if not using inline onclick
  // For this refactor, we'll keep the inline onclick="sendMessage()" for the button
  // but the Enter key listener is good to have here.

  // Add listener for reset chat button if not using inline onclick
  // For this refactor, we'll keep the inline onclick="clearChatHistory()" for the button
}