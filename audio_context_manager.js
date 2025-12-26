// --- Global AudioContext and Analyser for TTS ---
let ttsAudioContext = null;
let ttsAnalyser = null;

function getTTSAudioContext() {
    if (!ttsAudioContext || ttsAudioContext.state === 'closed') {
        if (ttsAudioContext) {
             debugLog("TTS: Previous AudioContext was closed. Recreating.", "info");
        }
        ttsAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        debugLog("TTS: New AudioContext created/recreated.", "info");
        // If context is recreated, analyser also needs to be recreated.
        if (ttsAnalyser) {
            try { ttsAnalyser.disconnect(); } catch(e) { /* ignore */ }
            ttsAnalyser = null; 
        }
    }
    // Attempt to resume if suspended (e.g., due to browser autoplay policies)
    if (ttsAudioContext.state === 'suspended') {
        ttsAudioContext.resume().then(() => {
            debugLog("TTS: AudioContext resumed.", "info");
        }).catch(e => debugLog("TTS: Error resuming AudioContext: " + e, "error"));
    }
    return ttsAudioContext;
}

function getTTSAnalyser() {
    const context = getTTSAudioContext(); // Ensures context is live
    if (!ttsAnalyser || ttsAnalyser.context !== context) { 
        if (ttsAnalyser) { // Disconnect old analyser if it exists and context changed
            try { ttsAnalyser.disconnect(); } catch(e) { /* ignore */ }
        }
        ttsAnalyser = context.createAnalyser();
        ttsAnalyser.fftSize = 1024; 
        ttsAnalyser.connect(context.destination); // Connect new analyser to destination
        debugLog("TTS: Analyser (re)created and connected to destination.", "info");
    }
    return ttsAnalyser;
}

// Export functions to window for global access
window.getTTSAudioContext = getTTSAudioContext;
window.getTTSAnalyser = getTTSAnalyser;