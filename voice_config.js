// Voice configuration data for TTS using Custom Colab TTS API
// Using voice cloning with reference audio: tmpstjl0ktl.wav

window.voices = [
  // Custom Cloned Voice
  {
    id: 'clone',
    name: '🎭 Cloned Voice',
    language: 'multi',
    gender: 'female',
    provider: 'custom',
    description: 'Custom cloned voice using AI voice cloning technology'
  },
];

// Default voice ID
window.defaultVoiceId = 'clone';

// Map for legacy voice IDs (redirect all to the cloned voice)
window.legacyVoiceMap = {
  'en-female': 'clone',
  'en-male': 'clone',
  'ja-female': 'clone',
  'ja-male': 'clone',
  'de-female': 'clone',
  'de-male': 'clone',
  'pt-female': 'clone',
  'pt-male': 'clone',
  'es-female': 'clone',
  'es-male': 'clone',
  'fr-female': 'clone',
  'fr-male': 'clone',
  'zh-female': 'clone',
  'zh-male': 'clone',
  'nova': 'clone',
  'shimmer': 'clone',
  'alloy': 'clone',
  'echo': 'clone',
  'fable': 'clone',
  'onyx': 'clone',
};

// TTS API Configuration
window.TTS_CONFIG = {
  apiUrl: 'http://localhost:8004/tts',
  referenceAudio: 'tmpstjl0ktl.wav',
  defaultSettings: {
    temperature: 0.8,
    exaggeration: 1.3,
    cfg_weight: 0.5,
    speed_factor: 1,
    seed: 3000,
    voice_mode: 'clone',
    split_text: true,
    chunk_size: 240,
    output_format: 'wav',
    // predefined_voice_id: "Emily.wav"
  }
};

// No longer needed
window.voiceLanguageOverrides = {};