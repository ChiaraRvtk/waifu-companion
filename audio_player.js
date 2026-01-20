// Modified to play from cached buffer
async function playCachedAudioBuffer(audioBuffer, text) {
  if (!audioBuffer || !text) return;

  debugLog(`TTS: Playing cached audio for: "${text.substring(0, 50)}..."`, 'info');

  const audioContext = getTTSAudioContext();
  let source = null;

  try {
    source = audioContext.createBufferSource();
    currentAudio = source; // Store current source for external stop capability

    const audioBufferSource = source;
    audioBufferSource.buffer = audioBuffer;

    let animationFrameId = null;
    if (currentModel) {
      const analyserNode = getTTSAnalyser();
      audioBufferSource.connect(analyserNode);

      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let lastVolume = 0;
      const smoothingFactor = 0.8;

      const updateMouth = () => {
        if (currentAudio !== source || !currentModel) {
          cancelAnimationFrame(animationFrameId);
          if (currentModel && source.buffer) {
            if (!currentAudio || currentAudio.context.state === 'closed') {
              currentModel.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", 0);
              currentModel.internalModel.coreModel.setParameterValueById("ParamMouthForm", 0);
            }
          }
          return;
        }
        analyserNode.getByteFrequencyData(dataArray);

        // Broader speech range: index 2 to 40 (roughly 100Hz to 2kHz)
        const speechRange = dataArray.slice(45, 50);
        let average = speechRange.reduce((acc, val) => acc + val, 0) / speechRange.length;

        // Stable noise floor threshold
        const threshold = 50;
        if (average < threshold) average = 0;
        else average -= threshold;

        const volume = average;
        const smoothedVolume = lastVolume + (volume - lastVolume) * smoothingFactor;
        lastVolume = smoothedVolume;

        // Safe normalization: ensures 0.0 to 1.0 range
        const normalizedVolume = Math.min(smoothedVolume / 120, 1.0);

        currentModel.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", normalizedVolume);
        currentModel.internalModel.coreModel.setParameterValueById("ParamMouthForm", normalizedVolume * 0.4);
        animationFrameId = requestAnimationFrame(updateMouth);
      };
      updateMouth();
    } else {
      audioBufferSource.connect(audioContext.destination);
    }

    await new Promise((resolve, reject) => {
      const audioDurationMs = audioBuffer.duration * 1000;
      const timeoutMs = Math.max(8000, audioDurationMs + 4000);

      const timeoutId = setTimeout(() => {
        debugLog(`TTS: Playback timeout for cached audio after ${timeoutMs.toFixed(0)}ms`, 'warn');
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        if (currentModel && currentAudio === source) {
          currentModel.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", 0);
          currentModel.internalModel.coreModel.setParameterValueById("ParamMouthForm", 1);
        }
        try {
          if (source && (source.playbackState === source.PLAYING_STATE || source.playbackState === source.SCHEDULED_STATE)) {
            source.stop();
          }
        } catch (e) {
          debugLog("TTS: Error stopping source on timeout: " + e, "warn");
        }
        source.onended = null;
        reject(new Error(`TTS playback timeout for cached audio`));
      }, timeoutMs);

      audioBufferSource.onended = () => {
        clearTimeout(timeoutId);
        debugLog(`TTS: Cached audio playback finished`, 'info');
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (currentModel && currentAudio === source) {
          currentModel.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", 0);
          currentModel.internalModel.coreModel.setParameterValueById("ParamMouthForm", 1);
        }
        resolve();
      };
      audioBufferSource.start();
      debugLog(`TTS: Cached audio playback started. Duration: ${audioDurationMs.toFixed(0)}ms`, 'info');
    });

  } catch (err) {
    debugLog(`TTS: Error playing cached audio: ${err.message}`, 'error');
  } finally {
    if (currentAudio === source) {
      currentAudio = null;
    }
    if (source) {
      try { source.disconnect(); } catch (e) { /* ignore */ }
    }
  }
}

async function fetchTTSBuffer(textChunk, voiceId) {
  if (!textChunk.trim()) return null;

  const voiceConfig = voices.find(v => v.id === voiceId);
  const audioContext = getTTSAudioContext();

  // Get TTS configuration from voice_config.js
  const config = window.TTS_CONFIG || {};
  const TTS_API_URL = config.apiUrl || 'http://localhost:8004/tts';
  const settings = config.defaultSettings || {};

  // Detect language from current settings or default to English
  const langCode = window.selectedLanguageCode || 'en-US';
  const language = langCode.split('-')[0]; // Get just 'en', 'pt', 'ja', etc.

  debugLog(`TTS: Using Custom TTS API with language: ${language}`, 'info');

  if (typeof window.showTTSLoadingIndicator === 'function') {
    window.showTTSLoadingIndicator(true);
  }

  try {
    debugLog(`TTS: Fetching buffer for text chunk (${textChunk.length} chars): "${textChunk.substring(0, 30)}..."`, 'info');
    const response = await fetch(TTS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: textChunk,
        temperature: settings.temperature || 0.8,
        exaggeration: settings.exaggeration || 1.3,
        cfg_weight: settings.cfg_weight || 0.5,
        speed_factor: settings.speed_factor || 1,
        seed: settings.seed || 3000,
        language: language,
        voice_mode: settings.voice_mode || 'clone',
        split_text: settings.split_text !== false,
        chunk_size: settings.chunk_size || 240,
        output_format: settings.output_format || 'wav',
        reference_audio_filename: config.referenceAudio || 'tmpstjl0ktl.wav',
        predefined_voice_id: config.predefined_voice_id || 'Emily.wav'
        //-- KITTEN TTS
        // language: settings.language,
        // output_format: settings.output_format,
        // speed: settings.speed,
        // split_text: settings.split_text,
        // chunk_size: settings.chunk_size,
        // voice: settings.voice
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugLog(`TTS API error: ${response.status} - ${errorText}`, 'error');
      throw new Error(`Custom TTS error: ${response.status}`);
    }

    // The response is the audio file directly
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    debugLog(`TTS: Audio buffer decoded successfully (${audioBuffer.duration.toFixed(2)}s)`, 'info');

    if (typeof window.showTTSLoadingIndicator === 'function') {
      window.showTTSLoadingIndicator(false);
    }
    return audioBuffer;
  } catch (error) {
    debugLog(`TTS: Custom TTS failed: ${error.message}`, 'error');
    if (typeof window.showTTSLoadingIndicator === 'function') {
      window.showTTSLoadingIndicator(false);
    }
    // No fallback - just return null to skip TTS
    return null;
  }
}
window.fetchTTSBuffer = fetchTTSBuffer;

async function tryPlaySingleChunk(textChunk, voiceId, attempt = 0, preloadedBuffer = null) {
  const MAX_SPLIT_ATTEMPTS = 5;
  if (attempt > MAX_SPLIT_ATTEMPTS) {
    debugLog(`TTS: Chunk too long after splits: "${textChunk.substring(0, 30)}..."`, 'error');
    return;
  }

  if (!textChunk.trim()) return;

  debugLog(`TTS: Attempting to play chunk (attempt ${attempt + 1}): "${textChunk.substring(0, 100)}..." with voice ${voiceId}`, 'info');

  const audioContext = getTTSAudioContext();
  let source = null;

  try {
    let audioBuffer = preloadedBuffer;

    if (!audioBuffer) {
      audioBuffer = await fetchTTSBuffer(textChunk, voiceId);
    }

    if (!audioBuffer) {
      debugLog('TTS: No audio buffer to play (fetch failed)', 'error');
      return;
    }

    source = audioContext.createBufferSource();

    currentAudio = source; // Store current source for external stop capability



    const audioBufferSource = source;
    audioBufferSource.buffer = audioBuffer;

    let animationFrameId = null;
    if (currentModel) {
      const analyserNode = getTTSAnalyser();
      audioBufferSource.connect(analyserNode);


      // analyserNode is already connected to destination by getTTSAnalyser if it was (re)created.

      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let lastVolume = 0;
      const smoothingFactor = 0.8;

      const updateMouth = () => {
        // Check if this specific source is still the one playing AND the model exists
        // console.log(currentAudio)
        if (currentAudio !== source || !currentModel) {
          cancelAnimationFrame(animationFrameId);
          // Optionally reset mouth here if this was the active source

          if (currentModel && source.buffer) { // Check source.buffer to ensure it was a playing source
            // Check if this was the last playing audio for this model instance
            console.log("oi2")
            if (!currentAudio || currentAudio.context.state === 'closed') {
              console.log("oi3")
              currentModel.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", 0);
              currentModel.internalModel.coreModel.setParameterValueById("ParamMouthForm", 1);
            }
          }
          return;
        }
        analyserNode.getByteFrequencyData(dataArray);

        // Broader speech range: index 2 to 40
        const speechRange = dataArray.slice(45, 50);
        let average = speechRange.reduce((acc, val) => acc + val, 0) / speechRange.length;

        // Stable noise floor threshold
        const threshold = 50;
        if (average < threshold) average = 0;
        else average -= threshold;

        const volume = average;
        const smoothedVolume = lastVolume + (volume - lastVolume) * smoothingFactor;
        lastVolume = smoothedVolume;

        const normalizedVolume = Math.min(smoothedVolume / 120, 1.2);

        currentModel.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", normalizedVolume);
        // currentModel.internalModel.coreModel.setParameterValueById("ParamMouthForm", normalizedVolume * 5.4);
        animationFrameId = requestAnimationFrame(updateMouth);
        // currentModel.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", 0);
        // currentModel.internalModel.coreModel.setParameterValueById("ParamMouthForm", 1);
      };
      updateMouth();


    } else {
      audioBufferSource.connect(audioContext.destination); // Connect directly if no model for analysis
    }

    await new Promise((resolve, reject) => {
      const audioDurationMs = audioBuffer.duration * 1000; // duration is in seconds
      const timeoutMs = Math.max(8000, audioDurationMs + 4000);

      const timeoutId = setTimeout(() => {
        debugLog(`TTS: Playback timeout for chunk after ${timeoutMs.toFixed(0)}ms. Stopping source. Chunk: "${textChunk.substring(0, 30)}..."`, 'warn');
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        if (currentModel && currentAudio === source) {
          currentModel.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", 0);
          currentModel.internalModel.coreModel.setParameterValueById("ParamMouthForm", 1);
        }
        try {
          if (source && (source.playbackState === source.PLAYING_STATE || source.playbackState === source.SCHEDULED_STATE)) {
            source.stop();
          }
        } catch (e) {
          debugLog("TTS: Error stopping source on timeout: " + e, "warn");
        }
        source.onended = null; // Prevent late firing of onended
        // currentAudio is cleared in finally
        reject(new Error(`TTS playback timeout for chunk: ${textChunk.substring(0, 30)}...`));
      }, timeoutMs);

      audioBufferSource.onended = () => {
        clearTimeout(timeoutId);
        debugLog(`TTS: Playback of chunk finished (onended): "${textChunk.substring(0, 30)}..."`, 'info');
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (currentModel && currentAudio === source) {
          currentModel.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", 0);
          currentModel.internalModel.coreModel.setParameterValueById("ParamMouthForm", 1);
        }
        // currentAudio is cleared in the finally block after this promise resolves
        resolve();
      };
      audioBufferSource.start();
      debugLog(`TTS: Playback of chunk started. Estimated duration: ${audioDurationMs.toFixed(0)}ms. Timeout set for ${timeoutMs.toFixed(0)}ms. Chunk: "${textChunk.substring(0, 30)}..."`, 'info');
    });

  } catch (err) {
    debugLog(`TTS: Error playing chunk "${textChunk.substring(0, 50)}...": ${err.message}`, 'error');
    // Check if error is due to text length and we haven't exhausted attempts
    // This specific check for "text too long" in err.message is a fallback, 
    // primary check is via API response status 500 earlier.
    if (err.message && err.message.toLowerCase().includes("text too long") && attempt < MAX_SPLIT_ATTEMPTS) {
      debugLog(`TTS: Caught 'Text too long' error during processing. Splitting chunk. Attempt ${attempt + 1}`, 'warn');
      const halfPoint = Math.floor(textChunk.length / 2);
      let splitPoint = textChunk.lastIndexOf(' ', halfPoint);
      if (splitPoint === -1 || splitPoint === 0) splitPoint = halfPoint;

      const firstHalf = textChunk.substring(0, splitPoint);
      const secondHalf = textChunk.substring(splitPoint).trim();

      // Clean up current source before recursive call if it exists
      if (source) { try { source.disconnect(); } catch (e) { } }
      if (currentAudio === source) currentAudio = null;


      if (firstHalf) await tryPlaySingleChunk(firstHalf, voiceId, attempt + 1);
      if (secondHalf) await tryPlaySingleChunk(secondHalf, voiceId, attempt + 1);
      return;
    }
    // For other errors or if max attempts reached, the error propagates up allowing playTTS to continue
  } finally {
    if (currentAudio === source) {
      currentAudio = null;
    }
    if (source) { // Disconnect the source node as it's one-time use
      try { source.disconnect(); } catch (e) { /* ignore */ }
    }
    // Do not close the shared audioContext here
  }
}

// Export functions to window for global access
window.playCachedAudioBuffer = playCachedAudioBuffer;
window.tryPlaySingleChunk = tryPlaySingleChunk;