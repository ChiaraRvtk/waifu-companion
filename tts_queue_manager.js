// --- TTS Queue and State ---
let ttsQueue = [];
let isCurrentlySpeaking = false; // Tracks if processNextTTSInQueue is actively processing a message
let ttsCancelled = false; // Internal flag to stop a running chunk loop

async function playTTS(fullText, languageCode, messageId = null, startIndex = 0) {
  if (fullText) {
    debugLog(`TTS: Queuing request for language ${languageCode || 'default_en-US'}: "${fullText.toString().substring(0, 50)}..."`, 'info');
    ttsQueue.push({ fullText: fullText.toString(), languageCode: languageCode || 'en-US', messageId, startIndex });
  } else if (messageId) {
    // Retry/Resume flow: re-queue the existing message content
    const msgDiv = document.getElementById(messageId);
    if (!msgDiv) return;
    const text = msgDiv.querySelector('.message-original-text').textContent;
    debugLog(`TTS: Resuming playback for message ${messageId} from index ${startIndex}`, 'info');
    ttsQueue.push({ fullText: text, languageCode: languageCode || 'en-US', messageId, startIndex });
  } else if (!fullText && !messageId) {
    // Resume global queue if paused
    debugLog("TTS: Global resume triggered", "info");
    processNextTTSInQueue();
    return;
  }

  processNextTTSInQueue(); 
}

// sequential processing
async function processNextTTSInQueue() {
  if (isCurrentlySpeaking || ttsQueue.length === 0) return;
  isCurrentlySpeaking = true;
  ttsCancelled = false;
  
  let currentTask = ttsQueue.shift();
  const { fullText, languageCode, messageId, startIndex } = currentTask;
  
  try {
    const langs = Array.isArray(window.languages) ? window.languages : [{ code:'en-US', englishName:'English (US)', defaultVoiceId:'en_us_001' }];
    const langConfig = langs.find(l => l.code === languageCode) || langs.find(l => l.code === 'en-US') || langs[0];
    const voiceId = (typeof window.selectedVoiceId === 'string' && window.selectedVoiceId) || langConfig.defaultVoiceId || 'en_us_001';

    const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2000-\u329F]|\uD83E[\uDD00-\uDFFF])/g;
    const cleanText = String(fullText || '').replace(/\*/g, '').replace(emojiRegex, '').trim();
    const sentences = (typeof splitIntoSentences === 'function') ? splitIntoSentences(cleanText) : [cleanText];

    // Group sentences into chunks based on window.ttsChunkLimit
    const chunks = [];
    let currentChunk = { text: '', indices: [] };
    const limit = window.ttsChunkLimit || 300;

    sentences.forEach((s, idx) => {
      if (idx < startIndex) return; // Skip if we are resuming from a specific sentence
      
      const sTrim = s.trim();
      if (!sTrim) return;

      if (currentChunk.text.length + sTrim.length > limit && currentChunk.text.length > 0) {
        chunks.push(currentChunk);
        currentChunk = { text: sTrim, indices: [idx] };
      } else {
        currentChunk.text += (currentChunk.text ? ' ' : '') + sTrim;
        currentChunk.indices.push(idx);
      }
    });
    if (currentChunk.text) chunks.push(currentChunk);

    debugLog(`TTS: Grouped ${sentences.length} sentences into ${chunks.length} chunks (limit: ${limit})`, 'info');
    
    for (let i = 0; i < chunks.length; i++) {
      if (ttsCancelled) break;

      const chunk = chunks[i];
      const chunkText = chunk.text;

      // Visual feedback: highlight all sentences in this chunk
      if (messageId) {
        chunk.indices.forEach(idx => highlightSentence(messageId, idx, true));
      }

      try {
        // Preloading logic works on chunk level now
        const preloaded = await TTSPreloader.getPreloadedBuffer(i, chunkText, voiceId);
        
        // Start preloading NEXT chunk immediately
        if (i + 1 < chunks.length && !ttsCancelled) {
          TTSPreloader.preloadNext(i + 1, chunks[i+1].text, voiceId);
        }

        await tryPlaySingleChunk(chunkText, voiceId, 0, preloaded);
      } catch (err) {
        const isRateLimit = err.status === 429 || (err.message && err.message.includes('429'));
        const errorType = isRateLimit ? 'Rate Limit (429)' : 'Error';
        debugLog(`TTS: ${errorType} at sentence ${i}: ${err.message}`, 'error');
        
        // Show retry button on the UI to allow manual resumption
        // We pass the first sentence index of the current chunk as the restart point
        if (messageId) {
          showRetryTTSButton(messageId, chunk.indices[0], languageCode);
        }
        
        if (isRateLimit) {
          debugLog("TTS: Rate limit hit. Pausing playback sequence. Click Resume to continue.", "warn");
          isCurrentlySpeaking = false;
          ttsCancelled = true;
          return; // Stop processing this message and do NOT proceed to the next queue item
        }
        
        throw err; // For other errors, break the loop and trigger standard error handling
      }

      // Small pause between sentences for natural flow
      if (i < chunks.length - 1 && !ttsCancelled) {
        await new Promise(r => setTimeout(r, 150));
      }
    }
    
    // Clear highlight when done
    if (messageId) highlightSentence(messageId, null);
    
  } catch (e) {
    debugLog('TTS Queue Error: ' + e, 'error');
  }

  isCurrentlySpeaking = false;
  processNextTTSInQueue();
}

function pauseTTS() {
  debugLog("TTS: Pausing playback (stopping current audio, keeping queue)", "info");
  ttsCancelled = true;
  if (window.currentAudio) {
    try { window.currentAudio.stop(); } catch (e) {}
    window.currentAudio = null;
  }
  isCurrentlySpeaking = false;
}

function stopTTS() {
  debugLog("TTS: Stopping all playback and clearing queue", "info");
  ttsCancelled = true;
  ttsQueue = [];
  if (window.TTSPreloader) window.TTSPreloader.clear();
  if (window.currentAudio) {
    try {
      window.currentAudio.stop();
    } catch (e) {
      debugLog("TTS: Error stopping current audio source: " + e, "warn");
    }
    window.currentAudio = null;
  }
  isCurrentlySpeaking = false;
  // Clear any active highlights
  const highlighted = document.querySelectorAll('.sentence-highlight');
  highlighted.forEach(el => el.classList.remove('sentence-highlight'));
}

// Export functions to window for global access
window.playTTS = playTTS;
window.pauseTTS = pauseTTS;
window.stopTTS = stopTTS;
window.processNextTTSInQueue = processNextTTSInQueue;