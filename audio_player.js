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
      const smoothingFactor = 0.3; 

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
        const vocalRange = dataArray.slice(10, 100); 
        const volume = vocalRange.reduce((acc, val) => acc + val, 0) / vocalRange.length;
        const smoothedVolume = lastVolume + (volume - lastVolume) * smoothingFactor;
        lastVolume = smoothedVolume;
        const normalizedVolume = Math.min(smoothedVolume / 128, 1); 

        currentModel.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", normalizedVolume * 1.5);
        currentModel.internalModel.coreModel.setParameterValueById("ParamMouthForm", normalizedVolume * 0.5 - 0.25);
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
          currentModel.internalModel.coreModel.setParameterValueById("ParamMouthForm", 0);
        }
        try {
          if (source && (source.playbackState === source.PLAYING_STATE || source.playbackState === source.SCHEDULED_STATE)) {
            source.stop();
          }
        } catch(e) {
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
          currentModel.internalModel.coreModel.setParameterValueById("ParamMouthForm", 0);
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
  const provider = voiceConfig ? voiceConfig.provider : 'websim';
  const audioContext = getTTSAudioContext();

  if (provider === 'websim') {
    const result = await websim.textToSpeech({ text: textChunk, voice: voiceId });
    if (!result.url) throw new Error('Websim TTS no URL returned');
    const response = await fetch(result.url);
    if (!response.ok) {
      const err = new Error(`Websim TTS fetch error! status: ${response.status}`);
      err.status = response.status;
      throw err;
    }
    const arrayBuffer = await response.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
  }
  throw new Error(`Unsupported provider: ${provider}`);
}
window.fetchTTSBuffer = fetchTTSBuffer;

async function tryPlaySingleChunk(textChunk, voiceId, attempt = 0, preloadedBuffer = null) {
    const MAX_SPLIT_ATTEMPTS = 5;
    if (attempt > MAX_SPLIT_ATTEMPTS) {
        debugLog(`TTS: Chunk too long after splits: "${textChunk.substring(0,30)}..."`, 'error');
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
            const smoothingFactor = 0.3; 

            const updateMouth = () => {
                // Check if this specific source is still the one playing AND the model exists
                if (currentAudio !== source || !currentModel) { 
                    cancelAnimationFrame(animationFrameId);
                    // Optionally reset mouth here if this was the active source
                    if (currentModel && source.buffer) { // Check source.buffer to ensure it was a playing source
                         // Check if this was the last playing audio for this model instance
                        if (!currentAudio || currentAudio.context.state === 'closed') {
                           currentModel.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", 0);
                           currentModel.internalModel.coreModel.setParameterValueById("ParamMouthForm", 0);
                        }
                    }
                    return;
                }
                analyserNode.getByteFrequencyData(dataArray);
                const vocalRange = dataArray.slice(10, 100); 
                const volume = vocalRange.reduce((acc, val) => acc + val, 0) / vocalRange.length;
                const smoothedVolume = lastVolume + (volume - lastVolume) * smoothingFactor;
                lastVolume = smoothedVolume;
                const normalizedVolume = Math.min(smoothedVolume / 128, 1); 

                currentModel.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", normalizedVolume * 1.5);
                currentModel.internalModel.coreModel.setParameterValueById("ParamMouthForm", normalizedVolume * 0.5 - 0.25);
                animationFrameId = requestAnimationFrame(updateMouth);
            };
            updateMouth(); 
        } else {
            audioBufferSource.connect(audioContext.destination); // Connect directly if no model for analysis
        }
        
        await new Promise((resolve, reject) => {
            const audioDurationMs = audioBuffer.duration * 1000; // duration is in seconds
            const timeoutMs = Math.max(8000, audioDurationMs + 4000); 

            const timeoutId = setTimeout(() => {
                debugLog(`TTS: Playback timeout for chunk after ${timeoutMs.toFixed(0)}ms. Stopping source. Chunk: "${textChunk.substring(0,30)}..."`, 'warn');
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                
                if (currentModel && currentAudio === source) { 
                    currentModel.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", 0);
                    currentModel.internalModel.coreModel.setParameterValueById("ParamMouthForm", 0);
                }
                try {
                  if (source && (source.playbackState === source.PLAYING_STATE || source.playbackState === source.SCHEDULED_STATE)) {
                    source.stop();
                  }
                } catch(e) {
                  debugLog("TTS: Error stopping source on timeout: " + e, "warn");
                }
                source.onended = null; // Prevent late firing of onended
                // currentAudio is cleared in finally
                reject(new Error(`TTS playback timeout for chunk: ${textChunk.substring(0,30)}...`));
            }, timeoutMs);

            audioBufferSource.onended = () => {
                clearTimeout(timeoutId);
                debugLog(`TTS: Playback of chunk finished (onended): "${textChunk.substring(0,30)}..."`, 'info');
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                if (currentModel && currentAudio === source) { 
                    currentModel.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", 0);
                    currentModel.internalModel.coreModel.setParameterValueById("ParamMouthForm", 0);
                }
                // currentAudio is cleared in the finally block after this promise resolves
                resolve();
            };
            audioBufferSource.start();
            debugLog(`TTS: Playback of chunk started. Estimated duration: ${audioDurationMs.toFixed(0)}ms. Timeout set for ${timeoutMs.toFixed(0)}ms. Chunk: "${textChunk.substring(0,30)}..."`, 'info');
        });

    } catch (err) {
        debugLog(`TTS: Error playing chunk "${textChunk.substring(0,50)}...": ${err.message}`, 'error');
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
            if (source) { try { source.disconnect(); } catch(e){} }
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