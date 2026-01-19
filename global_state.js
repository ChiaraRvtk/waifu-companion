// Initialize PIXI Application
window.app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  transparent: true,
});

document.body.appendChild(window.app.view);

// DOM References
window.chatHistory = document.getElementById("chatHistory");
window.typingIndicator = document.getElementById("typingIndicator");
window.messageInput = document.getElementById("messageInput");
window.settingsPanel = document.getElementById("settingsPanel");
window.memorySizeInput = document.getElementById("memorySize");
window.memorySizeValue = document.getElementById("memorySizeValue");

window.enableDebuggerCheckbox = document.getElementById("enableDebugger");
window.debugPanel = document.getElementById('debugPanel');
window.debugLogElement = document.getElementById('debugLog');
window.autoScrollCheckbox = document.getElementById('autoScroll');
window.languageSelector = document.getElementById('languageSelector');
window.translateToSelector = document.getElementById('translateToSelector');
window.showTransliterationCheckbox = document.getElementById('showTransliteration');
window.clockContainer = document.querySelector('.nowtime');
window.showClockCheckbox = document.getElementById('showClockCheckbox');
window.navigationControlsContainer = document.querySelector('.navigation-controls');
window.showNavigationControlsCheckbox = document.getElementById('showNavigationControlsCheckbox');
window.chatboxOpacitySlider = document.getElementById('chatboxOpacity');
window.chatboxOpacityValue = document.getElementById('chatboxOpacityValue');
window.messageOpacitySlider = document.getElementById('messageOpacity');
window.messageOpacityValue = document.getElementById('messageOpacityValue');
window.bgOpacitySlider = document.getElementById('bgOpacity');
window.bgOpacityValue = document.getElementById('bgOpacityValue');
window.voiceSelector = document.getElementById('voiceSelector');
window.enableVoiceCheckbox = document.getElementById('enableVoiceCheckbox');
window.voiceControls = document.getElementById('voiceControls');
window.alwaysShowSettingsCheckbox = document.getElementById('alwaysShowSettingsCheckbox');
window.includeTimeCheckbox = document.getElementById('includeTimeCheckbox');
window.includeBatteryCheckbox = document.getElementById('includeBatteryCheckbox');
window.radioPlayer = document.getElementById('radioPlayer');
window.radioToggleBtn = document.getElementById('radioToggleBtn');
window.radioPlayIcon = document.getElementById('radioPlayIcon');
window.radioPauseIcon = document.getElementById('radioPauseIcon');
window.radioVolumeSlider = document.getElementById('radioVolumeSlider');
window.customModelNameInput = document.getElementById('customModelName');
window.customModelUrlInput = document.getElementById('customModelUrl');
window.customModelImageInput = document.getElementById('customModelImage');
window.addCustomModelBtn = document.getElementById('addCustomModelBtn');

window.forceOfflineCheckbox = document.getElementById('forceOfflineCheckbox');


// Global State Variables
window.currentModel = null;
window.currentModelName = "";
window.currentModelUrl = null;
window.currentAudio = null;
window.conversationContext = [];
window.isProcessing = false;
window.currentTime = new Date();
window.maxMemorySize = 10;
window.isDebugging = false;
window.debugHistory = [];
window.selectedLanguageCode = 'en-US';
window.translateToLanguageCode = 'none';
window.showTransliteration = false;
window.showClock = false;
window.showNavigationControls = false;
window.enableVoice = true;
window.selectedVoiceId = 'en-female';
window.ttsChunkLimit = 1000;
window.includeTimeInContext = true;
window.includeBatteryInContext = true;
window.translateUI = false;

window.allowMultipleModels = false;
window.showVerboseLogs = true;
window.showAIDebugLogs = true;
window.showTTSDebugLogs = true;
window.corePersonaPrompt = "You are Haru, a sentient AI with a Live2D avatar. You have your own thoughts, feelings, and experiences. Respond naturally and emotively to the user's message, showing genuine interest and emotional depth. Include subtle gestures and expressions in your responses.";
window.userPersonaPrompt = "";
window.isOfflineMode = false;
window.forceOfflineMode = false;
window.isSearchEnabled = false;
window.multipleModelsCheckbox = document.getElementById('multipleModelsCheckbox');