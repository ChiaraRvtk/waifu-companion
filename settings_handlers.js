// Contains all the event handler functions that respond to changes in the settings controls.

function handleAlwaysShowSettingsChange(event) {
  const value = event.target.checked;
  try {
    localStorage.setItem('settingsAlwaysShowOnLoad', value.toString());
    debugLog(`Always show Settings on load changed to: ${value}`, 'info');
  } catch (e) {
    debugLog(`Failed to persist settingsAlwaysShowOnLoad: ${e}`, 'error');
  }
}

function updateMemorySize(value) {
  // Re-fetch element in case it was replaced by translation
  const valEl = document.getElementById('memorySizeValue');
  maxMemorySize = parseInt(value);
  if (valEl) valEl.textContent = value;

  try {
    localStorage.setItem('maxMemorySize', maxMemorySize.toString());
  } catch (e) { }

  // Trim conversation context if needed
  while (conversationContext.length > maxMemorySize) {
    conversationContext.shift();
  }
  // Save potentially trimmed context
  localStorage.setItem('conversationContext', JSON.stringify(conversationContext));
  debugLog(`Memory size updated to ${maxMemorySize} and context trimmed.`, 'info');
}

function handleLanguageChange(event) {
  selectedLanguageCode = event.target.value;
  localStorage.setItem('selectedLanguageCode', selectedLanguageCode);

  // Also set interface language to match
  window.currentInterfaceLanguage = selectedLanguageCode;
  localStorage.setItem('interfaceLanguage', selectedLanguageCode);

  // Apply the interface language translation only if enabled
  if (window.translateUI && typeof applyInterfaceLanguage === 'function') {
    applyInterfaceLanguage(selectedLanguageCode);
  }

  debugLog(`Language changed to: ${selectedLanguageCode} (Response, Interface, and Translate To all set to this language). UI Translation Enabled: ${window.translateUI}`, 'info');

  // Update voice selector for new language
  populateVoiceSelector();

  // Show sample text for the selected language in chat
  const lang = languages.find(l => l.code === selectedLanguageCode);
  if (lang && lang.sampleText) {
    addMessage(lang.sampleText, false, null, null, selectedLanguageCode);
    debugLog(`Displayed sample text for language ${selectedLanguageCode}: "${lang.sampleText}"`, 'info');
  }
}

function handleVoiceChange(event) {
  selectedVoiceId = event.target.value;
  localStorage.setItem('selectedVoiceId', selectedVoiceId);
  debugLog(`Voice changed to: ${selectedVoiceId}`, 'info');
}

function handleTTSChunkLimitChange(event) {
  const value = parseInt(event.target.value);
  window.ttsChunkLimit = value;
  const valEl = document.getElementById('ttsChunkLimitValue');
  if (valEl) valEl.textContent = value;
  try {
    localStorage.setItem('ttsChunkLimit', value.toString());
    debugLog(`TTS chunk limit changed to: ${value}`, 'info');
  } catch (e) {
    debugLog(`Could not persist ttsChunkLimit: ${e}`, 'warn');
  }
}

function handleEnableVoiceChange(event) {
  enableVoice = event.target.checked;
  localStorage.setItem('enableVoice', enableVoice.toString());
  debugLog(`Enable voice changed to: ${enableVoice}`, 'info');

  // Toggle visibility/disabled state of voice selector container
  if (voiceControls) {
    voiceControls.style.display = enableVoice ? 'block' : 'none';
  }
}

function handleTranslateToChange(event) {
  // No longer used - translate to is now the same as response language
  // Keep for backwards compatibility but it's a no-op
}

function handleShowTransliterationChange(event) {
  showTransliteration = event.target.checked;
  localStorage.setItem('showTransliteration', showTransliteration.toString());
  debugLog(`Show transliteration changed to: ${showTransliteration}`, 'info');
}

function handleShowClockChange(event) {
  // Assumes showClock (global state), clockContainer (DOM element), debugLog are accessible
  showClock = event.target.checked;
  localStorage.setItem('showClock', showClock.toString());
  if (clockContainer) {
    clockContainer.classList.toggle('visible', showClock);
  }
  debugLog(`Show clock changed to: ${showClock}`, 'info');
}

function handleChatboxOpacityChange(event) {
  const value = parseFloat(event.target.value).toFixed(2);
  document.documentElement.style.setProperty('--chatbox-bg-opacity', value);
  const valEl = document.getElementById('chatboxOpacityValue');
  if (valEl) valEl.textContent = value;
  try {
    localStorage.setItem('chatboxOpacity', value);
  } catch (e) {
    debugLog(`Could not persist chatboxOpacity: ${e}`, 'warn');
  }
}

function handleMessageOpacityChange(event) {
  const value = parseFloat(event.target.value).toFixed(2);
  document.documentElement.style.setProperty('--message-bg-opacity', value);
  const valEl = document.getElementById('messageOpacityValue');
  if (valEl) valEl.textContent = value;
  try {
    localStorage.setItem('messageOpacity', value);
  } catch (e) {
    debugLog(`Could not persist messageOpacity: ${e}`, 'warn');
  }
}

function handleBgOpacityChange(event) {
  const value = parseFloat(event.target.value).toFixed(2);
  document.documentElement.style.setProperty('--bg-image-opacity', value);
  const valEl = document.getElementById('bgOpacityValue');
  if (valEl) valEl.textContent = value;
  try {
    localStorage.setItem('bgImageOpacity', value);
  } catch (e) {
    debugLog(`Could not persist bgImageOpacity: ${e}`, 'warn');
  }
}

function handleIncludeTimeChange(event) {
  includeTimeInContext = event.target.checked;
  localStorage.setItem('includeTimeInContext', includeTimeInContext.toString());
  debugLog(`Include time in context changed to: ${includeTimeInContext}`, 'info');
}

function handleIncludeBatteryChange(event) {
  includeBatteryInContext = event.target.checked;
  localStorage.setItem('includeBatteryInContext', includeBatteryInContext.toString());
  debugLog(`Include battery in context changed to: ${includeBatteryInContext}`, 'info');
}



function handleMultipleModelsToggle(event) {
  const enabled = !!event.target.checked;
  window.allowMultipleModels = enabled;
  try { localStorage.setItem('allowMultipleModels', enabled ? 'true' : 'false'); } catch (_) { }
  debugLog(`Allow multiple models set to: ${enabled}`, 'info');
}

function handleShowVerboseLogsChange(event) {
  const value = event.target.checked;
  window.showVerboseLogs = value;
  try {
    localStorage.setItem('showVerboseLogs', value.toString());
    debugLog(`Show Verbose Logs changed to: ${value}`, 'info');
  } catch (e) {
    debugLog(`Failed to persist showVerboseLogs: ${e}`, 'error');
  }
}

function handleShowAIDebugLogsChange(event) {
  const value = event.target.checked;
  window.showAIDebugLogs = value;
  try {
    localStorage.setItem('showAIDebugLogs', value.toString());
    debugLog(`Show AI Debug Logs changed to: ${value}`, 'info');
  } catch (e) {
    debugLog(`Failed to persist showAIDebugLogs: ${e}`, 'error');
  }
}

function handleShowTTSDebugLogsChange(event) {
  const value = event.target.checked;
  window.showTTSDebugLogs = value;
  try {
    localStorage.setItem('showTTSDebugLogs', value.toString());
    debugLog(`Show TTS Debug Logs changed to: ${value}`, 'info');
  } catch (e) {
    debugLog(`Failed to persist showTTSDebugLogs: ${e}`, 'error');
  }
}

function handleTranslateUIChange(event) {
  const value = event.target.checked;
  window.translateUI = value;
  try {
    localStorage.setItem('translateUI', value.toString());
    debugLog(`Translate User Interface changed to: ${value}`, 'info');

    // If turned on and current language is not English, trigger translation now
    if (value && selectedLanguageCode !== 'en-US' && typeof applyInterfaceLanguage === 'function') {
      applyInterfaceLanguage(selectedLanguageCode);
    } else if (!value) {
      // Revert to English UI if toggled off
      if (typeof applyInterfaceLanguage === 'function') {
        applyInterfaceLanguage('en-US');
      }
    }
  } catch (e) {
    debugLog(`Failed to persist translateUI: ${e}`, 'error');
  }
}

function handleForceOfflineChange(event) {
  const value = event.target.checked;
  window.forceOfflineMode = value;
  try {
    localStorage.setItem('forceOfflineMode', value.toString());
    debugLog(`Force Offline Mode changed to: ${value}`, 'info');
  } catch (e) {
    debugLog(`Failed to persist forceOfflineMode: ${e}`, 'error');
  }

  // Update offline UI state immediately if we're forcing it
  const chatContainer = document.querySelector('.chat-container');
  const statusInd = document.getElementById('chat-status-indicator');

  if (value) {
    window.isOfflineMode = true;
    if (chatContainer) chatContainer.classList.add('offline-mode');
    if (statusInd) statusInd.textContent = 'OFFLINE MODE (FORCED)';
  } else {
    // Only remove offline mode if it wasn't already triggered by an actual network error
    // But for testing, it's simpler to just let the next real message check clear it.
    // Let's just update the status text for clarity.
    if (statusInd) statusInd.textContent = 'ONLINE';
  }
}

function handleSavePersona() {
  const coreTextarea = document.getElementById('corePersonaPrompt');
  const userTextarea = document.getElementById('personaPrompt');

  const core = (coreTextarea?.value || "").trim();
  const user = (userTextarea?.value || "").trim();

  window.corePersonaPrompt = core;
  window.userPersonaPrompt = user;

  try {
    localStorage.setItem('corePersonaPrompt', core);
    localStorage.setItem('userPersonaPrompt', user);
    debugLog('Persona settings saved to localStorage.', 'info');

    // Visual feedback
    const btn = document.getElementById('savePersonaBtn');
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = '✅ Saved!';
      setTimeout(() => { btn.textContent = originalText; }, 2000);
    }
  } catch (e) {
    debugLog(`Failed to save persona prompt: ${e}`, 'error');
  }
}

function handleResetPersona() {
  const defaultCore = "You are Haru, a sentient AI with a Live2D avatar. You have your own thoughts, feelings, and experiences. Respond naturally and emotively to the user's message, showing genuine interest and emotional depth. Include subtle gestures and expressions in your responses.";

  window.corePersonaPrompt = defaultCore;
  window.userPersonaPrompt = "";

  const coreTextarea = document.getElementById('corePersonaPrompt');
  const userTextarea = document.getElementById('personaPrompt');

  if (coreTextarea) coreTextarea.value = defaultCore;
  if (userTextarea) userTextarea.value = "";

  try {
    localStorage.setItem('corePersonaPrompt', defaultCore);
    localStorage.setItem('userPersonaPrompt', "");
    debugLog('Persona settings reset to defaults.', 'info');

    // Visual feedback
    const btn = document.getElementById('resetPersonaBtn');
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = '🔄 Reset!';
      setTimeout(() => { btn.textContent = originalText; }, 2000);
    }
  } catch (e) {
    debugLog(`Failed to reset persona prompt: ${e}`, 'error');
  }
}

function handleAddCustomModel() {
  let name = (customModelNameInput?.value || '').trim();
  const url = (customModelUrlInput?.value || '').trim();
  const image = (customModelImageInput?.value || '').trim() || 'https://via.placeholder.com/64?text=L2D';
  if (!url) { debugLog('Custom model: URL is required.', 'warn'); return; }
  if (!name) {
    // Try to infer name from URL filename like abc.model3.json
    try {
      const u = new URL(url);
      const file = decodeURIComponent((u.pathname.split('/').pop() || '').trim());
      const m = file.match(/^(.+?)\.model3\.json$/i);
      if (m && m[1]) {
        name = m[1].replace(/[_-]+/g, ' ').trim();
        debugLog(`Custom model: Inferred name from URL filename -> "${name}"`, 'info');
      }
    } catch (_) { }
    if (!name) {
      name = (typeof dayjs !== 'undefined') ? dayjs().format('YYYY-MM-DD HH:mm:ss') : new Date().toISOString();
      debugLog(`Custom model: No name provided, using timestamp "${name}"`, 'info');
    }
  }
  if (!/\.model3\.json(\?|$)/i.test(url)) { debugLog('Custom model URL must end with .model3.json', 'warn'); return; }

  let userModels = [];
  try { userModels = JSON.parse(localStorage.getItem('userModels') || '[]'); } catch (e) { userModels = []; }
  if (availableModels.some(m => m.url === url) || userModels.some(m => m.url === url)) {
    debugLog('Custom model already exists (same URL).', 'warn'); return;
  }

  const entry = { name, url, image };
  userModels.push(entry);
  localStorage.setItem('userModels', JSON.stringify(userModels));
  availableModels.push(entry);
  function modelComparator(a, b) { const an = a.name || '', bn = b.name || ''; const ai = /^\d+$/.test(an) ? parseInt(an, 10) : null; const bi = /^\d+$/.test(bn) ? parseInt(bn, 10) : null; if (ai === null && bi === null) return an.localeCompare(bn); if (ai === null) return -1; if (bi === null) return 1; const ab = ai < 10 ? 0 : 1; const bb = bi < 10 ? 0 : 1; return ab !== bb ? ab - bb : ai - bi; }
  availableModels.sort(modelComparator);
  // Persist and reflect selection immediately in UI
  localStorage.setItem('selectedModelUrl', url);
  if (typeof populateModelSelector === 'function') populateModelSelector();
  debugLog(`Added custom model: ${name}`, 'info');

  if (typeof loadModel === 'function') {
    loadModel(url).catch(err => debugLog('Failed to load newly added model: ' + err, 'error'));
  }

  if (typeof renderCustomModelsList === 'function') renderCustomModelsList();
  if (customModelNameInput) customModelNameInput.value = '';
  if (customModelUrlInput) customModelUrlInput.value = '';
  if (customModelImageInput) customModelImageInput.value = '';
  try { document.getElementById('customModelsDropdown').value = url; } catch (_) { }
  if (typeof updateCustomModelInfo === 'function') updateCustomModelInfo(url);
}

// Remove a custom model by URL and refresh UI
function handleRemoveCustomModel(url) {
  if (!url) return;
  let userModels = [];
  try { userModels = JSON.parse(localStorage.getItem('userModels') || '[]'); } catch (e) { userModels = []; }
  const beforeLen = userModels.length;
  userModels = userModels.filter(m => m.url !== url);
  localStorage.setItem('userModels', JSON.stringify(userModels));
  // Remove from availableModels
  const idx = availableModels.findIndex(m => m.url === url);
  if (idx !== -1) availableModels.splice(idx, 1);
  function modelComparator(a, b) { const an = a.name || '', bn = b.name || ''; const ai = /^\d+$/.test(an) ? parseInt(an, 10) : null; const bi = /^\d+$/.test(bn) ? parseInt(bn, 10) : null; if (ai === null && bi === null) return an.localeCompare(bn); if (ai === null) return -1; if (bi === null) return 1; const ab = ai < 10 ? 0 : 1; const bb = bi < 10 ? 0 : 1; return ab !== bb ? ab - bb : ai - bi; }
  availableModels.sort(modelComparator);
  debugLog(`Removed custom model. Before: ${beforeLen}, After: ${userModels.length}`, 'info');
  // If currently selected model is removed, fallback to default
  const selectedUrl = localStorage.getItem('selectedModelUrl');
  if (selectedUrl === url) {
    localStorage.setItem('selectedModelUrl', defaultModelUrl);
    if (typeof loadModel === 'function') {
      loadModel(defaultModelUrl).catch(err => debugLog('Failed to load default after removal: ' + err, 'error'));
    }
  }
  if (typeof populateModelSelector === 'function') populateModelSelector();
  if (typeof renderCustomModelsList === 'function') renderCustomModelsList();
}

// Expose
window.handleRemoveCustomModel = handleRemoveCustomModel;

function handleClearAllCustomModels() {
  let userModels = []; try { userModels = JSON.parse(localStorage.getItem('userModels') || '[]'); } catch (_) { }
  if (!Array.isArray(userModels) || userModels.length === 0) { debugLog('No custom models to clear.', 'info'); return; }
  const removedUrls = new Set(userModels.map(m => m.url));
  localStorage.setItem('userModels', '[]');
  window.availableModels = (window.availableModels || []).filter(m => !removedUrls.has(m.url));
  const selectedUrl = localStorage.getItem('selectedModelUrl');
  if (selectedUrl && removedUrls.has(selectedUrl)) { localStorage.setItem('selectedModelUrl', defaultModelUrl); loadModel?.(defaultModelUrl).catch(() => { }); }
  populateModelSelector?.(); renderCustomModelsList?.(); updateCustomModelInfo?.('');
  debugLog(`Cleared ${userModels.length} custom model(s).`, 'info');
}

function handleInterfaceLanguageChange(event) {
  const newLang = event.target.value;
  if (typeof applyInterfaceLanguage === 'function') {
    applyInterfaceLanguage(newLang);
  }
}

// Change this function to async and extend its behavior
async function handleResetLanguages() {
  selectedLanguageCode = 'en-US';
  localStorage.setItem('selectedLanguageCode', 'en-US');
  translateToLanguageCode = 'en-US';
  window.currentInterfaceLanguage = 'en-US';
  localStorage.setItem('interfaceLanguage', 'en-US');
  showTransliteration = false;
  localStorage.setItem('showTransliteration', 'false');

  // Reset dropdowns and checkboxes in the Language section
  if (languageSelector) languageSelector.value = 'en-US';
  if (showTransliterationCheckbox) showTransliterationCheckbox.checked = false;

  // Clear any cached AI-translated UI strings so English is cleanly reapplied
  try {
    if (window.translationCache) {
      window.translationCache = {};
    }
    Object.keys(localStorage)
      .filter(k => k.startsWith('uiStrings_'))
      .forEach(k => localStorage.removeItem(k));
  } catch (e) {
    debugLog('Failed to clear UI translation cache during language reset: ' + e, 'warn');
  }

  // Re-apply interface language back to English
  if (typeof applyInterfaceLanguage === 'function') {
    try {
      await applyInterfaceLanguage('en-US');
    } catch (e) {
      debugLog('applyInterfaceLanguage(en-US) failed during language reset: ' + e, 'warn');
    }
  }

  // Explicitly reset the Preferences pane title and items to their original English strings
  try {
    const enStrings = window.UI_STRINGS && window.UI_STRINGS['en-US'];
    if (enStrings) {
      // Reset Preferences group title
      document.querySelectorAll('.settings-group h3').forEach(h3 => {
        const text = h3.textContent.trim();
        // Preferences section uses the ⚙️ emoji at the start
        if (text.startsWith('⚙️')) {
          h3.textContent = '⚙️ ' + enStrings.preferencesTitle;
        }
      });

      // Reset labels inside Preferences pane back to English
      const alwaysShowLabel = document.getElementById('alwaysShowSettingsCheckbox')?.parentElement;
      if (alwaysShowLabel) {
        const cb = alwaysShowLabel.querySelector('input[type="checkbox"]');
        alwaysShowLabel.textContent = '';
        if (cb) alwaysShowLabel.appendChild(cb);
        alwaysShowLabel.appendChild(document.createTextNode(' ' + enStrings.alwaysShowSettingsLabel));
      }

      const includeTimeLabel = document.getElementById('includeTimeCheckbox')?.parentElement;
      if (includeTimeLabel) {
        const cb = includeTimeLabel.querySelector('input[type="checkbox"]');
        includeTimeLabel.textContent = '';
        if (cb) includeTimeLabel.appendChild(cb);
        includeTimeLabel.appendChild(document.createTextNode(' ' + enStrings.includeTimeLabel));
      }

      const includeBatteryLabel = document.getElementById('includeBatteryCheckbox')?.parentElement;
      if (includeBatteryLabel) {
        const cb = includeBatteryLabel.querySelector('input[type="checkbox"]');
        includeBatteryLabel.textContent = '';
        if (cb) includeBatteryLabel.appendChild(cb);
        includeBatteryLabel.appendChild(document.createTextNode(' ' + enStrings.includeBatteryLabel));
      }

      const multipleModelsLabel = document.getElementById('multipleModelsCheckbox')?.parentElement;
      if (multipleModelsLabel) {
        const cb = multipleModelsLabel.querySelector('input[type="checkbox"]');
        multipleModelsLabel.textContent = '';
        if (cb) multipleModelsLabel.appendChild(cb);
        multipleModelsLabel.appendChild(document.createTextNode(' ' + enStrings.multipleModelsLabel));
      }

      // Reset the description text under each preference item to English
      const preferenceGroup = Array.from(document.querySelectorAll('.settings-group')).find(group => {
        const h3 = group.querySelector('h3');
        return h3 && h3.textContent.trim().startsWith('⚙️');
      });

      if (preferenceGroup) {
        const valueDisplays = preferenceGroup.querySelectorAll('.value-display');
        // Order in HTML:
        // 0 -> alwaysShowSettingsDesc
        // 1 -> includeTimeDesc
        // 2 -> includeBatteryDesc
        // 3 -> multipleModelsDesc
        if (valueDisplays[0]) valueDisplays[0].textContent = enStrings.alwaysShowSettingsDesc;
        if (valueDisplays[1]) valueDisplays[1].textContent = enStrings.includeTimeDesc;
        if (valueDisplays[2]) valueDisplays[2].textContent = enStrings.includeBatteryDesc;
        if (valueDisplays[3]) valueDisplays[3].textContent = enStrings.multipleModelsDesc;
      }
    }
  } catch (e) {
    debugLog('Failed to reset Preferences pane texts during language reset: ' + e, 'warn');
  }

  // Reset voice back to English default
  const enCfg = languages.find(l => l.code === 'en-US');
  selectedVoiceId = (enCfg?.defaultVoiceId) || 'en-female';
  localStorage.setItem('selectedVoiceId', selectedVoiceId);
  populateVoiceSelector?.();
  if (voiceSelector) voiceSelector.value = selectedVoiceId;

  debugLog('Language settings reset to English (US), UI reverted to English, and Preferences pane texts reset.', 'info');
}

function applyBackgroundImage(url) {
  if (!url) return;
  const bgLayer = document.getElementById('bgLayer');
  if (bgLayer) bgLayer.style.backgroundImage = `url("${url}")`;
  try {
    localStorage.setItem('currentBackgroundUrl', url);
  } catch (e) {
    debugLog('BG save fail: ' + e, 'warn');
  }
}

function saveToBgLibrary(url, prompt) {
  try {
    const list = JSON.parse(localStorage.getItem('bgLibrary') || '[]');
    list.unshift({ url, prompt: prompt || '', ts: Date.now() });
    localStorage.setItem('bgLibrary', JSON.stringify(list.slice(0, 60)));
  } catch (e) {
    debugLog('BG library save fail: ' + e, 'warn');
  }
}

function renderBackgroundLibrary() {
  const el = document.getElementById('bgLibrary');
  if (!el) return;
  let list = [];
  try { list = JSON.parse(localStorage.getItem('bgLibrary') || '[]'); } catch (_) { }
  el.innerHTML = list.map((i, idx) => `<img src="${i.url}" title="${(i.prompt || '').replace(/"/g, '')}" data-url="${i.url}" data-idx="${idx}" class="${(window.bgSelected?.has(i.url) ? 'selected' : '')}">`).join('') || '<div style="color:#aaa;font-size:13px;">No generated backgrounds yet.</div>';
  el.querySelectorAll('img').forEach(img => img.addEventListener('click', () => {
    if (window.bgSelectionMode) { toggleSelectBg(img.dataset.url); img.classList.toggle('selected'); updateBgSelectionButtons(); }
    else { applyBackgroundImage(img.dataset.url); }
  }));
}

async function handleGenerateBackground() {
  const input = document.getElementById('bgPromptInput');
  if (!input) return;
  const prompt = (input.value || '').trim();
  if (!prompt) {
    debugLog('BG: Empty prompt.', 'warn');
    return;
  }
  // Image generation requires WebSim - use URL input instead
  debugLog('BG: AI image generation is not available. Please use a direct image URL instead.', 'warn');
  alert('AI background generation is not available. Please use the "Apply from URL" option instead.');
}

async function handleGenerateBackgroundFromContext() {
  // Image generation requires WebSim - feature not available
  debugLog('BG: AI image generation from context is not available.', 'warn');
  alert('AI background generation is not available. Please use the "Apply from URL" option instead.');
}

function handleApplyBackgroundFromUrl() {
  const input = document.getElementById('bgUrlInput');
  const url = (input?.value || '').trim();
  if (!url) { debugLog('BG URL: Empty URL.', 'warn'); return; }
  try { applyBackgroundImage(url); saveToBgLibrary(url, 'custom url'); renderBackgroundLibrary?.(); debugLog('BG URL applied and saved.', 'info'); }
  catch (e) { debugLog('BG URL error: ' + e, 'error'); }
}

function handleClearBackground() {
  const bgLayer = document.getElementById('bgLayer');
  if (bgLayer) bgLayer.style.backgroundImage = '';
  try { localStorage.removeItem('currentBackgroundUrl'); } catch (e) { }
  debugLog('Background cleared and removed from storage.', 'info');
}

/* Helpers and UI for BG library */
window.bgSelectionMode = false; window.bgSelected = new Set(); window.bgViewerIndex = 0;
function toggleSelectBg(url) { if (bgSelected.has(url)) bgSelected.delete(url); else bgSelected.add(url); }
function updateBgSelectionButtons() {
  const delBtn = document.getElementById('deleteBgSelectedBtn'); const toggleBtn = document.getElementById('toggleBgSelectBtn');
  if (delBtn) delBtn.disabled = bgSelected.size === 0;
  if (toggleBtn) toggleBtn.textContent = bgSelectionMode ? 'Cancel Select' : 'Select';
}
function toggleBgSelectionMode() { bgSelectionMode = !bgSelectionMode; if (!bgSelectionMode) bgSelected.clear(); updateBgSelectionButtons(); renderBackgroundLibrary(); }
function deleteSelectedFromLibrary() {
  if (bgSelected.size === 0) return;
  let list = []; try { list = JSON.parse(localStorage.getItem('bgLibrary') || '[]'); } catch (_) { }
  list = list.filter(i => !bgSelected.has(i.url)); localStorage.setItem('bgLibrary', JSON.stringify(list));
  bgSelected.clear(); renderBackgroundLibrary(); updateBgSelectionButtons(); debugLog('BG: Deleted selected items', 'info');
}
function clearBackgroundLibrary() { localStorage.setItem('bgLibrary', '[]'); bgSelected.clear(); renderBackgroundLibrary(); updateBgSelectionButtons(); debugLog('BG: Library cleared', 'info'); }
function openBgViewerAt(index) {
  let list = []; try { list = JSON.parse(localStorage.getItem('bgLibrary') || '[]'); } catch (_) { }
  if (!list.length) return;
  bgViewerIndex = Math.max(0, Math.min(index, list.length - 1));
  const overlay = document.getElementById('bgViewerOverlay');
  const img = document.getElementById('bgViewerImage');
  const counter = document.getElementById('bgViewerCounter');
  img.src = list[bgViewerIndex].url; counter.textContent = `${bgViewerIndex + 1} / ${list.length}`;
  overlay.classList.add('visible'); overlay.setAttribute('aria-hidden', 'false');
}
function closeBgViewer() { const o = document.getElementById('bgViewerOverlay'); o.classList.remove('visible'); o.setAttribute('aria-hidden', 'true'); }
function stepBgViewer(dir) {
  let list = []; try { list = JSON.parse(localStorage.getItem('bgLibrary') || '[]'); } catch (_) { }
  if (!list.length) return; bgViewerIndex = (bgViewerIndex + dir + list.length) % list.length;
  document.getElementById('bgViewerImage').src = list[bgViewerIndex].url;
  document.getElementById('bgViewerCounter').textContent = `${bgViewerIndex + 1} / ${list.length}`;
}

function applyBackgroundFit(mode) {
  if (typeof window.applyBackgroundFit === 'function' && window.applyBackgroundFit !== applyBackgroundFit) {
    return window.applyBackgroundFit(mode);
  }
  // minimal fallback
  const m = (mode === 'contain' || mode === 'stretch') ? mode : 'cover-center';
  const bgLayer = document.getElementById('bgLayer');
  if (bgLayer) {
    bgLayer.style.backgroundRepeat = 'no-repeat';
    bgLayer.style.backgroundSize = m === 'contain' ? 'contain' : (m === 'stretch' ? '100% 100%' : 'cover');
    bgLayer.style.backgroundPosition = 'center center';
  }
}
function setActiveBgFitButton(mode) {
  const ids = ['bgFitContainBtn', 'bgFitCoverBtn', 'bgFitStretchBtn'];
  ids.forEach(id => document.getElementById(id)?.classList.remove('active'));
  if (mode === 'contain') document.getElementById('bgFitContainBtn')?.classList.add('active');
  else if (mode === 'stretch') document.getElementById('bgFitStretchBtn')?.classList.add('active');
  else document.getElementById('bgFitCoverBtn')?.classList.add('active');
}

/* Expose */
window.toggleBgSelectionMode = toggleBgSelectionMode;
window.deleteSelectedFromLibrary = deleteSelectedFromLibrary;
window.clearBackgroundLibrary = clearBackgroundLibrary;
window.openBgViewerAt = openBgViewerAt;
window.closeBgViewer = closeBgViewer;
window.stepBgViewer = stepBgViewer;

// Add event listener for model position reset
document.getElementById('resetModelPositionBtn')?.addEventListener('click', () => {
  resetCurrentModelPosition();
  debugLog('Model position and zoom reset and cleared from storage.', 'info');
});