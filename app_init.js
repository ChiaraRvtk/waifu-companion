// This file contains the application initialization logic, previously in main.js's window.onload
// and some other top-level event listeners from main.js.

// Assumes all necessary global variables (from config.js) and functions (from other manager scripts)
// like debugLog, updateMemorySize, toggleDebugger, toggleSettings, closeBetaNotice, clearDebugLog,
// addMessage, setupSounds (from sound_manager.js), populateLanguageSelector,
// populateModelSelector, updateRadioToggleButton, loadModel, playSound (from sound_manager.js),
// zoomModel, moveModel, handleLanguageChange, handleTranslateToChange, handleShowTransliterationChange,
// handleShowClockChange, initChatController (from chat_controller.js)
// are available.

window.addEventListener('load', async () => { // Make async to await model load
  // Load conversation history from localStorage
  try {
    const savedContext = localStorage.getItem('conversationContext');
    if (savedContext) {
      conversationContext = JSON.parse(savedContext);
      debugLog('Loaded conversation context from localStorage', 'info');
      chatHistory.innerHTML = ''; 
      conversationContext.forEach(msg => {
        addMessage(msg.content, msg.role === 'user', null, null, msg.role === 'user' ? 'en-US' : (msg.languageCode || selectedLanguageCode));
      });
    } else {
       conversationContext = []; 
       debugLog('No conversation context found in localStorage', 'info');
    }
  } catch (error) {
    console.error('Error loading conversation context from localStorage:', error);
    debugLog(`Error loading conversation context: ${error}`, 'error');
    conversationContext = []; 
    localStorage.removeItem('conversationContext'); 
  }

  setupSounds(); // Initialize Tone.js sounds (from sound_manager.js)

  // Set initial memory size display and attach listener
  if (memorySizeInput && memorySizeValue) {
    const savedMemorySize = localStorage.getItem('maxMemorySize');
    if (savedMemorySize) {
      memorySizeInput.value = savedMemorySize;
    }
    updateMemorySize(memorySizeInput.value); // updateMemorySize is from settings_handlers.js
    memorySizeInput.addEventListener("input", (e) => {
        updateMemorySize(e.target.value);
    });
  } else {
    debugLog('AppInit: memorySizeInput or memorySizeValue not found.', 'warn');
  }


  // Set initial debugger state and attach listener
  if (enableDebuggerCheckbox && debugPanel) {
    try {
      const savedDebugState = localStorage.getItem('debugPanelVisible');
      isDebugging = savedDebugState === 'true';
    } catch (e) {
      isDebugging = false;
    }
    
    enableDebuggerCheckbox.checked = isDebugging;
    if(isDebugging) debugPanel.classList.add('visible'); else debugPanel.classList.remove('visible');
    
    enableDebuggerCheckbox.addEventListener('change', (e) => {
        toggleDebugger(); // toggleDebugger is from debug.js
    });
  } else {
    debugLog('AppInit: enableDebuggerCheckbox or debugPanel not found.', 'warn');
  }


  // Attach listeners for settings, debug clear
  const settingsButton = document.querySelector('.settings-button');
  if (settingsButton) {
      settingsButton.addEventListener('click', toggleSettings); // toggleSettings from settings_ui.js
  }


  // Initialize Settings Panel visibility preferences
  let alwaysShowSettings = false;
  try {
    alwaysShowSettings = localStorage.getItem('settingsAlwaysShowOnLoad') === 'true';
  } catch (e) {
    debugLog(`Error reading settingsAlwaysShowOnLoad: ${e}`, 'warn');
  }
  if (alwaysShowSettingsCheckbox) {
    alwaysShowSettingsCheckbox.checked = alwaysShowSettings;
    alwaysShowSettingsCheckbox.addEventListener('change', handleAlwaysShowSettingsChange);
  }

  // Decide initial settings panel visibility:
  // - If "always show" is enabled, open.
  // - Else if no previous state saved (first load), open.
  // - Else restore last saved state.
  let initialSettingsVisible = true; // default open on first load
  try {
    const lastOpen = localStorage.getItem('settingsPanelLastOpen'); // 'true' | 'false' | null
    if (alwaysShowSettings) {
      initialSettingsVisible = true;
    } else if (lastOpen === null) {
      initialSettingsVisible = true; // first page load: open
    } else {
      initialSettingsVisible = (lastOpen === 'true');
    }
  } catch (e) {
    debugLog(`Error reading settingsPanelLastOpen: ${e}`, 'warn');
    initialSettingsVisible = true;
  }
  setSettingsPanelVisible(initialSettingsVisible);


  // --- Initialize Context Preferences ---
  const storedIncludeTime = localStorage.getItem('includeTimeInContext');
  includeTimeInContext = storedIncludeTime !== null ? (storedIncludeTime === 'true') : true;
  if (includeTimeCheckbox) includeTimeCheckbox.checked = includeTimeInContext;
  debugLog(`Include time in context initialized to: ${includeTimeInContext}`, 'info');
  
  const storedIncludeBattery = localStorage.getItem('includeBatteryInContext');
  includeBatteryInContext = storedIncludeBattery !== null ? (storedIncludeBattery === 'true') : true;
  if (includeBatteryCheckbox) includeBatteryCheckbox.checked = includeBatteryInContext;
  debugLog(`Include battery in context initialized to: ${includeBatteryInContext}`, 'info');


  // --- Initialize Language and Display Settings ---
  selectedLanguageCode = localStorage.getItem('selectedLanguageCode') || window.selectedLanguageCode;
  // Translate to is now the same as response language
  translateToLanguageCode = selectedLanguageCode;
  const storedTranslit = localStorage.getItem('showTransliteration');
  showTransliteration = storedTranslit !== null ? (storedTranslit === 'true') : window.showTransliteration;
  
  debugLog(`Loaded language settings: Lang=${selectedLanguageCode}, ShowTranslit=${showTransliteration}`, 'info');

  // --- Initialize Interface Language ---
  try {
    const savedInterfaceLanguage = localStorage.getItem('interfaceLanguage') || selectedLanguageCode;
    window.currentInterfaceLanguage = savedInterfaceLanguage;
    
    // Load cached translations if available
    if (typeof loadCachedTranslations === 'function') {
      loadCachedTranslations();
    }
    
    if (typeof applyInterfaceLanguage === 'function') {
      await applyInterfaceLanguage(savedInterfaceLanguage);
    }
    debugLog(`Interface language initialized to: ${savedInterfaceLanguage}`, 'info');
  } catch(e) {
    debugLog(`Error initializing interface language: ${e}`, 'warn');
  }

  populateLanguageSelector(); 

  if (showTransliterationCheckbox) showTransliterationCheckbox.checked = showTransliteration;
  
  // --- Initialize Voice ID with validation against selected language ---
  const savedVoiceId = localStorage.getItem('selectedVoiceId');
  if (savedVoiceId) {
      selectedVoiceId = savedVoiceId;
  }
  
  // All WebSim voices are now valid regardless of language.
  const uniqueVoicesMap = new Map();
  voices.forEach(voice => {
      if (!uniqueVoicesMap.has(voice.id)) {
          uniqueVoicesMap.set(voice.id, voice);
      }
  });
  const availableVoices = Array.from(uniqueVoicesMap.values());
  const isSelectedVoiceValid = availableVoices.some(v => v.id === selectedVoiceId);
  
  // If no voice is saved, or if the saved voice is invalid, set a new default.
  if (!savedVoiceId || !isSelectedVoiceValid) {
      const baseLangCode = selectedLanguageCode.split('-')[0];
      const langFemaleVoice = availableVoices.find(v => v.language.startsWith(baseLangCode) && v.gender === 'female' && v.provider === 'websim');
      const langConfig = languages.find(l => l.code === selectedLanguageCode);
      const defaultForLang = langConfig ? langConfig.defaultVoiceId : null;

      // Priority: 1. Female voice of current language, 2. defaultVoiceId from config (if valid), 3. First available WebSim voice
      if (langFemaleVoice) { selectedVoiceId = langFemaleVoice.id; }
      else if (defaultForLang && availableVoices.some(v => v.id === defaultForLang)) { selectedVoiceId = defaultForLang; }
      else { selectedVoiceId = availableVoices.find(v => v.provider === 'websim')?.id || 'none'; }

      try {
          localStorage.setItem('selectedVoiceId', selectedVoiceId);
          debugLog(`Initialized/Reset voice to default: ${selectedVoiceId}`, 'info');
      } catch(e) {
          debugLog(`Could not persist new default voice ID: ${e}`, 'warn');
      }
  } else {
      debugLog(`Loaded valid voice ID from storage: ${selectedVoiceId}`, 'info');
  }
  // At this point, selectedVoiceId is guaranteed to be valid or 'none'.
  // populateVoiceSelector() will now correctly reflect this state.
  populateVoiceSelector();


  // --- Initialize Persona ---
  const defaultCore = "You are Haru, a sentient AI with a Live2D avatar. You have your own thoughts, feelings, and experiences. Respond naturally and emotively to the user's message, showing genuine interest and emotional depth. Include subtle gestures and expressions in your responses.";
  const storedCore = localStorage.getItem('corePersonaPrompt');
  window.corePersonaPrompt = storedCore !== null ? storedCore : defaultCore;
  
  const storedPersona = localStorage.getItem('userPersonaPrompt');
  window.userPersonaPrompt = storedPersona || "";
  
  const coreTextarea = document.getElementById('corePersonaPrompt');
  if (coreTextarea) {
    coreTextarea.value = window.corePersonaPrompt;
  }
  
  const personaTextarea = document.getElementById('personaPrompt');
  if (personaTextarea) {
    personaTextarea.value = window.userPersonaPrompt;
  }
  document.getElementById('savePersonaBtn')?.addEventListener('click', handleSavePersona);
  document.getElementById('resetPersonaBtn')?.addEventListener('click', handleResetPersona);

  // --- Initialize Enable Voice Setting ---
  const storedEnableVoice = localStorage.getItem('enableVoice');
  // Default to true if not found in storage
  enableVoice = storedEnableVoice !== null ? (storedEnableVoice === 'true') : true; 
  if (enableVoiceCheckbox) enableVoiceCheckbox.checked = enableVoice;
  if (voiceControls) voiceControls.style.display = enableVoice ? 'block' : 'none';
  debugLog(`Voice (TTS) enabled state initialized to: ${enableVoice}`, 'info');

  // --- Initialize Opacity Settings ---
  const storedChatboxOpacity = localStorage.getItem('chatboxOpacity') || '0.9';
  const storedMessageOpacity = localStorage.getItem('messageOpacity') || '0.3';

  if (chatboxOpacitySlider) {
      chatboxOpacitySlider.value = storedChatboxOpacity;
      document.documentElement.style.setProperty('--chatbox-bg-opacity', storedChatboxOpacity);
      if (chatboxOpacityValue) chatboxOpacityValue.textContent = storedChatboxOpacity;
      chatboxOpacitySlider.addEventListener('input', handleChatboxOpacityChange);
  }

  if (messageOpacitySlider) {
      messageOpacitySlider.value = storedMessageOpacity;
      document.documentElement.style.setProperty('--message-bg-opacity', storedMessageOpacity);
      if (messageOpacityValue) messageOpacityValue.textContent = storedMessageOpacity;
      messageOpacitySlider.addEventListener('input', handleMessageOpacityChange);
  }

  const storedBgOpacity = localStorage.getItem('bgImageOpacity') || '1.0';
  if (bgOpacitySlider) {
      bgOpacitySlider.value = storedBgOpacity;
      document.documentElement.style.setProperty('--bg-image-opacity', storedBgOpacity);
      if (bgOpacityValue) bgOpacityValue.textContent = storedBgOpacity;
      bgOpacitySlider.addEventListener('input', handleBgOpacityChange);
  }

  debugLog(`Opacity settings initialized. Chatbox: ${storedChatboxOpacity}, Message: ${storedMessageOpacity}, BG: ${storedBgOpacity}`, 'info');

  populateModelSelector();

  // Merge user models from localStorage into availableModels and sort by name
  try {
    const userModels = JSON.parse(localStorage.getItem('userModels') || '[]');
    if (Array.isArray(userModels) && userModels.length) {
      availableModels.push(...userModels);
    }
    function modelComparator(a,b){const an=a.name||'',bn=b.name||'';const ai=/^\d+$/.test(an)?parseInt(an,10):null;const bi=/^\d+$/.test(bn)?parseInt(bn,10):null;if(ai===null&&bi===null)return an.localeCompare(bn);if(ai===null)return -1;if(bi===null)return 1;const ab=ai<10?0:1;const bb=bi<10?0:1;return ab!==bb?ab-bb:ai-bi;}
    availableModels.sort(modelComparator);
    debugLog(`Loaded ${userModels.length || 0} user models. Total models: ${availableModels.length}`, 'info');
  } catch(e) {
    debugLog('Failed to load user models from localStorage.', 'warn');
  }
  if (typeof renderCustomModelsList === 'function') renderCustomModelsList();

  const savedModelUrl = localStorage.getItem('selectedModelUrl');
  const initialModelUrl = savedModelUrl || defaultModelUrl;
  try {
      await loadModel(initialModelUrl);
  } catch (error) {
      console.error("Failed to load initial Live2D model:", error);
      debugLog(`FATAL: Failed to load initial Live2D model: ${error}`, 'error');
      addMessage(`Sorry, I couldn't load the initial character model (${error.message}).`, false);
  }

  // Background generation events
  const bgBtn = document.getElementById('generateBgBtn');
  const bgInput = document.getElementById('bgPromptInput');
  if (bgBtn) bgBtn.addEventListener('click', handleGenerateBackground);
  if (bgInput) bgInput.addEventListener('keydown', (e)=>{ if (e.key==='Enter') handleGenerateBackground(); });
  const bgCtxBtn = document.getElementById('generateBgFromContextBtn');
  if (bgCtxBtn) bgCtxBtn.addEventListener('click', handleGenerateBackgroundFromContext);
  const bgUrlBtn = document.getElementById('applyBgUrlBtn');
  const bgUrlInput = document.getElementById('bgUrlInput');
  if (bgUrlBtn) bgUrlBtn.addEventListener('click', handleApplyBackgroundFromUrl);
  if (bgUrlInput) bgUrlInput.addEventListener('keydown', (e)=>{ if (e.key==='Enter') handleApplyBackgroundFromUrl(); });



  // Reset Model Position button
  document.getElementById('resetModelPositionBtn')?.addEventListener('click', ()=>{
    resetCurrentModelPosition();
    debugLog('Model position reset to initial center and cleared from storage.', 'info');
  });
  // Clear All Models button
  document.getElementById('clearAllModelsBtn')?.addEventListener('click', ()=>{
    if (typeof clearAllModels === 'function') clearAllModels();
  });

  // Clear Custom Models button
  document.getElementById('clearCustomModelsBtn')?.addEventListener('click', handleClearAllCustomModels);

  // --- Initialize Background from storage ---
  try {
    const bg = localStorage.getItem('currentBackgroundUrl'); if (bg) applyBackgroundImage(bg);
    const fit = localStorage.getItem('bgFitMode') || 'cover-center'; applyBackgroundFit?.(fit);
  } catch(e){ debugLog('BG load fail: '+e,'warn'); }
  renderBackgroundLibrary?.();

  // Bind BG library actions
  document.getElementById('openBgViewerBtn')?.addEventListener('click', ()=>openBgViewerAt(0));
  document.getElementById('toggleBgSelectBtn')?.addEventListener('click', ()=>toggleBgSelectionMode());
  document.getElementById('deleteBgSelectedBtn')?.addEventListener('click', ()=>deleteSelectedFromLibrary());
  document.getElementById('clearBgLibraryBtn')?.addEventListener('click', ()=>clearBackgroundLibrary());
  document.getElementById('bgViewerCloseBtn')?.addEventListener('click', ()=>closeBgViewer());
  document.getElementById('bgViewerPrevBtn')?.addEventListener('click', ()=>stepBgViewer(-1));
  document.getElementById('bgViewerNextBtn')?.addEventListener('click', ()=>stepBgViewer(1));
  document.getElementById('clearBgBtn')?.addEventListener('click', handleClearBackground);

  // Background fit buttons
  document.getElementById('bgFitContainBtn')?.addEventListener('click', ()=>applyBackgroundFit('contain'));
  document.getElementById('bgFitCoverBtn')?.addEventListener('click', ()=>applyBackgroundFit('cover'));
  document.getElementById('bgFitStretchBtn')?.addEventListener('click', ()=>applyBackgroundFit('stretch'));
  document.getElementById('bgFitCoverTopBtn')?.addEventListener('click', ()=>applyBackgroundFit('cover-top'));
  document.getElementById('bgFitCoverCenterBtn')?.addEventListener('click', ()=>applyBackgroundFit('cover-center'));
  document.getElementById('bgFitCoverBottomBtn')?.addEventListener('click', ()=>applyBackgroundFit('cover-bottom'));
  document.getElementById('bgFitContainTopBtn')?.addEventListener('click', ()=>applyBackgroundFit('contain-top'));
  document.getElementById('bgFitContainCenterBtn')?.addEventListener('click', ()=>applyBackgroundFit('contain-center'));
  document.getElementById('bgFitContainBottomBtn')?.addEventListener('click', ()=>applyBackgroundFit('contain-bottom'));
  document.getElementById('bgFitFitWidthBtn')?.addEventListener('click', ()=>applyBackgroundFit('fit-width'));
  document.getElementById('bgFitFitHeightBtn')?.addEventListener('click', ()=>applyBackgroundFit('fit-height'));

  // Keyboard navigation for fullscreen BG viewer
  const bgViewerOverlayEl = document.getElementById('bgViewerOverlay');
  document.addEventListener('keydown', (e) => {
    if (!bgViewerOverlayEl || !bgViewerOverlayEl.classList.contains('visible')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); stepBgViewer(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); stepBgViewer(1); }
    else if (e.key === 'Escape') { e.preventDefault(); closeBgViewer(); } // added ESC to close
  });



  // Initialize Multiple Models setting
  try {
    const storedMulti = localStorage.getItem('allowMultipleModels');
    allowMultipleModels = storedMulti === 'true' ? true : false;
  } catch(_) { allowMultipleModels = false; }
  if (multipleModelsCheckbox) {
    multipleModelsCheckbox.checked = !!allowMultipleModels;
    multipleModelsCheckbox.addEventListener('change', handleMultipleModelsToggle);
  }



  // Attach event listeners for language, display, clock, and navigation settings
  if (languageSelector) languageSelector.addEventListener('change', handleLanguageChange);
  if (showTransliterationCheckbox) showTransliterationCheckbox.addEventListener('change', handleShowTransliterationChange);
  
  // Initialize Translate UI setting
  const translateUICheckbox = document.getElementById('translateUICheckbox');
  const storedTranslateUI = localStorage.getItem('translateUI');
  window.translateUI = storedTranslateUI === 'true';
  if (translateUICheckbox) {
    translateUICheckbox.checked = window.translateUI;
    translateUICheckbox.addEventListener('change', handleTranslateUIChange);
  }

  // Remove old listeners that are no longer needed
  // if (translateToSelector) translateToSelector.addEventListener('change', handleTranslateToChange);
  if (showClockCheckbox) showClockCheckbox.addEventListener('change', handleShowClockChange);
  if (voiceSelector) voiceSelector.addEventListener('change', handleVoiceChange);
  if (enableVoiceCheckbox) enableVoiceCheckbox.addEventListener('change', handleEnableVoiceChange);
  document.getElementById('globalPlayTTSBtn')?.addEventListener('click', () => window.playTTS?.());
  document.getElementById('globalPauseTTSBtn')?.addEventListener('click', () => window.pauseTTS?.());
  document.getElementById('globalStopTTSBtn')?.addEventListener('click', () => window.stopTTS?.());

  // Initialize TTS Chunk Limit
  const ttsChunkLimitSlider = document.getElementById('ttsChunkLimit');
  const ttsChunkLimitValueEl = document.getElementById('ttsChunkLimitValue');
  const savedChunkLimit = localStorage.getItem('ttsChunkLimit');
  if (savedChunkLimit) {
    window.ttsChunkLimit = parseInt(savedChunkLimit);
    if (ttsChunkLimitSlider) ttsChunkLimitSlider.value = window.ttsChunkLimit;
    if (ttsChunkLimitValueEl) ttsChunkLimitValueEl.textContent = window.ttsChunkLimit;
  }
  if (ttsChunkLimitSlider) {
    ttsChunkLimitSlider.addEventListener('input', handleTTSChunkLimitChange);
  }
  if (includeTimeCheckbox) includeTimeCheckbox.addEventListener('change', handleIncludeTimeChange);
  if (includeBatteryCheckbox) includeBatteryCheckbox.addEventListener('change', handleIncludeBatteryChange);
  // Add Custom Model button
  if (addCustomModelBtn) addCustomModelBtn.addEventListener('click', handleAddCustomModel);

  const showVerboseLogsCheckbox = document.getElementById('showVerboseLogsCheckbox');
  if (showVerboseLogsCheckbox) {
    const storedVerbose = localStorage.getItem('showVerboseLogs') !== 'false'; // Default to true
    window.showVerboseLogs = storedVerbose;
    showVerboseLogsCheckbox.checked = storedVerbose;
    showVerboseLogsCheckbox.addEventListener('change', handleShowVerboseLogsChange);
  }

  const showAIDebugLogsCheckbox = document.getElementById('showAIDebugLogsCheckbox');
  if (showAIDebugLogsCheckbox) {
    const stored = localStorage.getItem('showAIDebugLogs') !== 'false';
    window.showAIDebugLogs = stored;
    showAIDebugLogsCheckbox.checked = stored;
    showAIDebugLogsCheckbox.addEventListener('change', handleShowAIDebugLogsChange);
  }

  const showTTSDebugLogsCheckbox = document.getElementById('showTTSDebugLogsCheckbox');
  if (showTTSDebugLogsCheckbox) {
    const stored = localStorage.getItem('showTTSDebugLogs') !== 'false';
    window.showTTSDebugLogs = stored;
    showTTSDebugLogsCheckbox.checked = stored;
    showTTSDebugLogsCheckbox.addEventListener('change', handleShowTTSDebugLogsChange);
  }

  if (forceOfflineCheckbox) {
    const storedOffline = localStorage.getItem('forceOfflineMode') === 'true';
    window.forceOfflineMode = storedOffline;
    forceOfflineCheckbox.checked = storedOffline;
    forceOfflineCheckbox.addEventListener('change', handleForceOfflineChange);
    
    if (storedOffline) {
        const chatContainer = document.querySelector('.chat-container');
        const statusInd = document.getElementById('chat-status-indicator');
        window.isOfflineMode = true;
        if (chatContainer) chatContainer.classList.add('offline-mode');
        if (statusInd) statusInd.textContent = 'OFFLINE MODE (FORCED)';
    }
  }
  debugLog('Language, display, clock, navigation, voice, context, and debug settings listeners attached.', 'info');

  // Initialize chat controller (e.g., to add Enter key listener)
  if (typeof initChatController === 'function') {
    initChatController(); // From chat_controller.js
  } else {
    debugLog('AppInit: initChatController function not found.', 'warn');
  }

  // Initialize draggable panels (Chat and Debug)
  initializeDraggablePanels();

  // Initialize Speech-To-Text microphone
  if (typeof initSTT === 'function') initSTT();

  // Initialize mouse tracking once to prevent listener accumulation lag
  if (typeof initializeMouseTracking === 'function') {
    initializeMouseTracking();
  }

  debugLog('Application initialization complete.', 'info');

  // Reorder: Voice first, Language second
  try {
    const panel = settingsPanel;
    const groups = Array.from(panel.querySelectorAll('.settings-group'));
    const voiceGroup = groups.find(g => /voice settings/i.test(g.querySelector('h3')?.textContent || ''));
    const langGroup  = groups.find(g => /language settings/i.test(g.querySelector('h3')?.textContent || ''));
    if (voiceGroup) panel.insertBefore(voiceGroup, panel.firstChild);
    if (langGroup && voiceGroup) panel.insertBefore(langGroup, voiceGroup.nextSibling);
  } catch(e){ debugLog('Settings group reorder failed: '+e,'warn'); }

  document.getElementById('openModelGalleryBtn')?.addEventListener('click', ()=>window.openModelGallery?.());
  document.getElementById('modelGalleryCloseBtn')?.addEventListener('click', ()=>window.closeModelGallery?.());
  document.getElementById('resetLanguagesBtn')?.addEventListener('click', handleResetLanguages);

});

function makeElementDraggable(el, handle, storageKey) {
  if (!el || !handle) return;
  
  let xOffset = 0;
  let yOffset = 0;
  let isDragging = false;
  let initialX, initialY;

  // Load saved state
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const { x, y, width, height } = JSON.parse(saved);
      xOffset = x || 0;
      yOffset = y || 0;
      
      el.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
      if (width) el.style.width = width;
      if (height) el.style.height = height;
    }
  } catch(e) {}

  const saveState = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        x: xOffset,
        y: yOffset,
        width: el.style.width,
        height: el.style.height
      }));
    } catch (e) {}
  };

  const dragStart = (e) => {
    const p = e.touches ? e.touches[0] : e;
    initialX = p.clientX - xOffset;
    initialY = p.clientY - yOffset;
    isDragging = true;
    el.classList.add('dragging');
    document.body.style.cursor = 'grabbing';
  };

  const drag = (e) => {
    if (!isDragging) return;
    const p = e.touches ? e.touches[0] : e;
    
    let currentX = p.clientX - initialX;
    let currentY = p.clientY - initialY;
    
    // Clamp within screen boundaries
    const rect = el.getBoundingClientRect();
    currentX = Math.max(-rect.left + xOffset, Math.min(currentX, window.innerWidth - rect.right + xOffset));
    currentY = Math.max(-rect.top + yOffset, Math.min(currentY, window.innerHeight - rect.bottom + yOffset));

    xOffset = currentX;
    yOffset = currentY;
    el.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
  };

  const dragEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    el.classList.remove('dragging');
    document.body.style.cursor = '';
    saveState();
  };

  handle.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);
  handle.addEventListener('touchstart', dragStart, {passive: true});
  document.addEventListener('touchmove', drag, {passive: false});
  document.addEventListener('touchend', dragEnd);
  
  new ResizeObserver(() => { if(!isDragging) saveState(); }).observe(el);
}

function initializeDraggablePanels() {
  const chatContainer = document.querySelector('.chat-container');
  const chatHeader = document.querySelector('.chat-header');
  makeElementDraggable(chatContainer, chatHeader, 'chatContainerState');

  const debugPanel = document.getElementById('debugPanel');
  const debugHeader = document.getElementById('debugHeader');
  makeElementDraggable(debugPanel, debugHeader, 'debugPanelState');
}

function setYouTubeSmallMode(enabled){
  const c=document.getElementById('bgYoutubeContainer');
  const h=document.getElementById('bgYoutubeHandle');
  const iframe=document.getElementById('bgYoutube');
  if(!c||!h) return;
  c.classList.toggle('small', !!enabled);
  c.classList.toggle('interactive', !!enabled);
  h.style.display = enabled ? 'block' : 'none';
  if(iframe && iframe.src){
    try{
      const u=new URL(iframe.src);
      u.searchParams.set('controls', enabled?'1':'0');
      iframe.src = u.toString();
    }catch(_){}
  }
  if(!enabled){ c.style.removeProperty('left'); c.style.removeProperty('top'); c.style.removeProperty('width'); c.style.removeProperty('height'); }
  try{ localStorage.setItem('youtubeSmallMode', enabled?'true':'false'); }catch(_){}
}