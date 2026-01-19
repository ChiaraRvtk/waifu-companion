// Manages the UI aspects of the settings panel, including visibility and populating selectors.

function toggleSettings() {
  // Assumes settingsPanel is accessible
  const willShow = !settingsPanel.classList.contains("visible");
  setSettingsPanelVisible(willShow);
}

function setSettingsPanelVisible(visible) {
  settingsPanel.classList.toggle("visible", visible);
  try {
    localStorage.setItem('settingsPanelLastOpen', visible.toString());
  } catch (e) {
    debugLog(`Could not persist settingsPanelLastOpen: ${e}`, 'warn');
  }
}

function populateModelSelector() {
  // Use the container inside the settings panel instead of the separate one
  const container = document.getElementById('modelSelectorContainer');

  if (!container || !availableModels) {
    console.error("Model selector container or available models list not found.");
    return;
  }

  // Clear previous content
  container.innerHTML = '';

  // Create the display area for the selected model
  const selectedDisplay = document.createElement('div');
  selectedDisplay.className = 'model-selector-selected';
  selectedDisplay.innerHTML = `
    <img src="" alt="Selected model" class="model-selector-selected-img">
    <span class="model-selector-selected-name">Select Model</span>
    <span class="model-selector-arrow">▼</span>
  `;
  container.appendChild(selectedDisplay);

  // Create the dropdown list
  const dropdownList = document.createElement('ul');
  dropdownList.className = 'model-selector-dropdown';
  container.appendChild(dropdownList);

  // Make container position relative for absolute positioning of dropdown
  container.style.position = 'relative';

  // Populate the dropdown list
  availableModels.forEach(model => {
    const listItem = document.createElement('li');
    listItem.dataset.value = model.url; // Store URL in data attribute
    listItem.dataset.image = model.image; // Store image path
    listItem.dataset.name = model.name; // Store name
    listItem.innerHTML = `
      <img src="${model.image}" alt="${model.name}" class="model-selector-option-img">
      <span>${model.name}</span>
    `;
    dropdownList.appendChild(listItem);

    // Add click listener to each item
    listItem.addEventListener('click', (e) => {
      const selectedUrl = e.currentTarget.dataset.value;
      const selectedImage = e.currentTarget.dataset.image;
      const selectedName = e.currentTarget.dataset.name;

      // Update the display
      selectedDisplay.querySelector('.model-selector-selected-img').src = selectedImage;
      selectedDisplay.querySelector('.model-selector-selected-name').textContent = selectedName;

      // Trigger the model load (similar to the original change event)
      // We'll need to ensure the loadModel function is accessible or trigger an event
      if (loadModel) {
        debugLog(`Model selection changed to: ${selectedUrl}`, 'info');
        loadModel(selectedUrl)
          .then(() => localStorage.setItem('selectedModelUrl', selectedUrl))
          .catch(error => {
            console.error("Failed to load selected Live2D model:", error);
            debugLog(`ERROR: Failed to load selected Live2D model: ${error}`, 'error');
            addMessage(`Sorry, I couldn't load that model (${error.message}).`, false);
            // Optionally revert display?
          });
      } else {
        console.error("loadModel function not found.");
      }

      // Close the dropdown
      dropdownList.style.display = 'none';
      selectedDisplay.classList.remove('open');
    });
  });

  // Add click listener to the display area to toggle the dropdown
  selectedDisplay.addEventListener('click', () => {
    const isOpen = dropdownList.style.display === 'block';
    dropdownList.style.display = isOpen ? 'none' : 'block';
    selectedDisplay.classList.toggle('open', !isOpen);
  });

  // Close dropdown if clicking outside - update selector for settings panel context
  document.addEventListener('click', (event) => {
    if (!container.contains(event.target)) {
      dropdownList.style.display = 'none';
      selectedDisplay.classList.remove('open');
    }
  });

  // Set initial selected display (using saved or default)
  const initialModelUrl = localStorage.getItem('selectedModelUrl') || defaultModelUrl;
  const initialModel = availableModels.find(m => m.url === initialModelUrl) || availableModels[0];
  if (initialModel) {
    selectedDisplay.querySelector('.model-selector-selected-img').src = initialModel.image;
    selectedDisplay.querySelector('.model-selector-selected-name').textContent = initialModel.name;
  }
  // Render the custom models list after selector is ready
  if (typeof renderCustomModelsList === 'function') renderCustomModelsList();
}

// Populate Custom Models dropdown and bind change to load selected model
function renderCustomModelsList() {
  const dropdown = document.getElementById('customModelsDropdown');
  if (!dropdown) return;
  let userModels = [];
  try { userModels = JSON.parse(localStorage.getItem('userModels') || '[]'); } catch (e) { userModels = []; }
  dropdown.innerHTML = '';
  if (!Array.isArray(userModels) || userModels.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'No custom models added';
    opt.disabled = true; opt.selected = true; opt.value = '';
    dropdown.appendChild(opt);
    return;
  }
  const placeholder = document.createElement('option');
  placeholder.textContent = 'Select a custom model';
  placeholder.disabled = true; placeholder.selected = true; placeholder.value = '';
  dropdown.appendChild(placeholder);
  userModels.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.url; opt.textContent = m.name || m.url;
    dropdown.appendChild(opt);
  });
  dropdown.onchange = (e) => {
    const url = e.target.value;
    const model = (window.availableModels || []).find(m => m.url === url);
    if (!url || !model) {
      updateCustomModelInfo('');
      return;
    }
    const selector = document.getElementById('modelSelectorContainer');
    const imgEl = selector?.querySelector('.model-selector-selected-img');
    const nameEl = selector?.querySelector('.model-selector-selected-name');
    if (imgEl) imgEl.src = model.image || 'https://via.placeholder.com/64?text=L2D';
    if (nameEl) nameEl.textContent = model.name || 'Custom Model';
    if (typeof loadModel === 'function') {
      loadModel(url)
        .then(() => { try { localStorage.setItem('selectedModelUrl', url); } catch (_) { } })
        .catch(err => debugLog('Failed to load custom model from dropdown: ' + err, 'error'));
    }
    updateCustomModelInfo(url);
  };
  updateCustomModelInfo('');
}

function updateCustomModelInfo(url) {
  const wrap = document.getElementById('customModelInfo'); if (!wrap) return;
  if (!url) { wrap.innerHTML = ''; return; }
  let userModels = []; try { userModels = JSON.parse(localStorage.getItem('userModels') || '[]'); } catch (_) { }
  const m = userModels.find(x => x.url === url); if (!m) { wrap.innerHTML = ''; return; }
  const img = m.image || 'https://via.placeholder.com/64?text=L2D';
  wrap.innerHTML = `<div class="custom-model-info"><img src="${img}" alt="${m.name || 'Custom Model'}"><div class="meta"><div class="name">${m.name || 'Custom Model'}</div><a class="url" href="${m.url}" target="_blank" rel="noopener">${m.url}</a></div><button class="remove-btn" data-url="${m.url}">Remove</button></div>`;
  wrap.querySelector('.remove-btn')?.addEventListener('click', () => {
    const u = m.url; if (typeof handleRemoveCustomModel === 'function') handleRemoveCustomModel(u);
    renderCustomModelsList(); updateCustomModelInfo('');
    const dd = document.getElementById('customModelsDropdown'); if (dd) dd.value = '';
  });
}
window.updateCustomModelInfo = updateCustomModelInfo;

function populateLanguageSelector() {
  // Assumes languageSelector (dropdown element) and languages (config array) are accessible
  // Also assumes selectedLanguageCode (global) has been initialized from localStorage or default
  if (!languageSelector || !languages) {
    debugLog('populateLanguageSelector: languageSelector or languages array not found. Cannot populate.', 'error');
    return;
  }
  languageSelector.innerHTML = ''; // Clear existing options

  if (languages.length === 0) {
    debugLog('populateLanguageSelector: languages array is empty. Dropdown will be empty.', 'warn');
    return; // No languages to add
  }

  // Show all languages now - AI will translate any language
  languages.forEach(lang => {
    const option = document.createElement('option');
    option.value = lang.code;
    option.textContent = `${lang.englishName} (${lang.nativeName})`;
    languageSelector.appendChild(option);
  });

  // Set current selection based on the global selectedLanguageCode
  languageSelector.value = selectedLanguageCode;

  // Fallback if the selectedLanguageCode from localStorage isn't a valid option anymore
  if (languageSelector.selectedIndex === -1 && languages.length > 0) {
    debugLog(`Warning: selectedLanguageCode '${selectedLanguageCode}' not found in dropdown. Defaulting to first option: '${languages[0].code}'.`, 'warn');
    languageSelector.value = languages[0].code;
    selectedLanguageCode = languages[0].code; // Update global state
    localStorage.setItem('selectedLanguageCode', selectedLanguageCode); // Persist fallback
  }
  debugLog(`Language selector populated with all ${languages.length} languages. Current selected: ${selectedLanguageCode}. Dropdown actual value: ${languageSelector.value}`, 'info');

  // Update voice selector when language selector is populated
  populateVoiceSelector();
}

function populateVoiceSelector() {
  if (!voiceSelector || !voices) {
    debugLog('populateVoiceSelector: voiceSelector or voices array not found. Cannot populate.', 'error');
    return;
  }

  voiceSelector.innerHTML = ''; // Clear existing options

  // Add "None" option first
  const noneOption = document.createElement('option');
  noneOption.value = 'none';
  noneOption.textContent = 'None (Disable TTS)';
  voiceSelector.appendChild(noneOption);

  // Add all Pollinations voices
  voices.forEach(voice => {
    const option = document.createElement('option');
    option.value = voice.id;
    const genderIcon = voice.gender === 'female' ? '👩' : voice.gender === 'male' ? '👨' : '🎭';
    option.textContent = `${genderIcon} ${voice.name}`;
    voiceSelector.appendChild(option);
  });

  // Handle legacy voice IDs from old WebSim config
  let savedVoiceId = localStorage.getItem('selectedVoiceId');
  if (savedVoiceId && window.legacyVoiceMap && window.legacyVoiceMap[savedVoiceId]) {
    savedVoiceId = window.legacyVoiceMap[savedVoiceId];
    localStorage.setItem('selectedVoiceId', savedVoiceId);
  }

  // Set the selected voice
  if (savedVoiceId === 'none') {
    selectedVoiceId = 'none';
  } else if (savedVoiceId && voices.some(v => v.id === savedVoiceId)) {
    selectedVoiceId = savedVoiceId;
  } else {
    // Default to 'nova' (friendly female voice)
    selectedVoiceId = window.defaultVoiceId || 'nova';
    localStorage.setItem('selectedVoiceId', selectedVoiceId);
  }

  voiceSelector.value = selectedVoiceId;
  updateVoiceDescription(selectedVoiceId);

  // Add change handler to update description (only once)
  if (!voiceSelector.dataset.descListenerAttached) {
    voiceSelector.dataset.descListenerAttached = 'true';
    voiceSelector.addEventListener('change', (e) => {
      updateVoiceDescription(e.target.value);
    });
  }

  debugLog(`Voice selector populated with ${voices.length} Pollinations voices. Selected: ${selectedVoiceId}`, 'info');

  // Setup test voice button
  setupTestVoiceButton();
}

function updateVoiceDescription(voiceId) {
  const descEl = document.getElementById('voiceDescription');
  if (!descEl) return;

  if (voiceId === 'none') {
    descEl.textContent = 'TTS disabled - no voice will be played';
    return;
  }

  const voice = voices.find(v => v.id === voiceId);
  if (voice && voice.description) {
    descEl.textContent = voice.description;
  } else {
    descEl.textContent = 'High-quality voice powered by Pollinations AI';
  }
}

function setupTestVoiceButton() {
  const testBtn = document.getElementById('testVoiceBtn');
  const testInput = document.getElementById('testVoiceText');

  if (!testBtn || !testInput) return;

  // Prevent adding duplicate listeners
  if (testBtn.dataset.listenerAttached === 'true') return;
  testBtn.dataset.listenerAttached = 'true';

  testBtn.addEventListener('click', async () => {
    const text = testInput.value.trim();
    if (!text) {
      debugLog('TTS Test: No text to speak', 'warn');
      return;
    }

    const voiceId = voiceSelector.value;
    if (voiceId === 'none') {
      debugLog('TTS Test: Voice is set to None', 'warn');
      alert('Please select a voice first');
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = '🔄 Testing...';

    try {
      debugLog(`TTS Test: Testing voice "${voiceId}" with text: "${text}"`, 'info');

      // Call the TTS function directly
      if (typeof fetchTTSBuffer === 'function' && typeof tryPlaySingleChunk === 'function') {
        await tryPlaySingleChunk(text, voiceId);
        debugLog('TTS Test: Playback completed', 'info');
      } else {
        throw new Error('TTS functions not available');
      }
    } catch (error) {
      debugLog(`TTS Test failed: ${error.message}`, 'error');
      alert(`Voice test failed: ${error.message}`);
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = '▶️ Test';
    }
  });
}



function applyBackgroundFit(mode) {
  const m = String(mode || '').toLowerCase();
  const bgLayer = document.getElementById('bgLayer');
  if (!bgLayer) return;

  // defaults
  bgLayer.style.backgroundRepeat = 'no-repeat';
  switch (m) {
    case 'contain':
    case 'contain-center':
      bgLayer.style.backgroundSize = 'contain';
      bgLayer.style.backgroundPosition = 'center center';
      break;
    case 'contain-top':
      bgLayer.style.backgroundSize = 'contain';
      bgLayer.style.backgroundPosition = 'center top';
      break;
    case 'contain-bottom':
      bgLayer.style.backgroundSize = 'contain';
      bgLayer.style.backgroundPosition = 'center bottom';
      break;
    case 'cover':
    case 'cover-center':
      bgLayer.style.backgroundSize = 'cover';
      bgLayer.style.backgroundPosition = 'center center';
      break;
    case 'cover-top':
      bgLayer.style.backgroundSize = 'cover';
      bgLayer.style.backgroundPosition = 'center top';
      break;
    case 'cover-bottom':
      bgLayer.style.backgroundSize = 'cover';
      bgLayer.style.backgroundPosition = 'center bottom';
      break;
    case 'fit-width':
      bgLayer.style.backgroundSize = '100% auto';
      bgLayer.style.backgroundPosition = 'center center';
      break;
    case 'fit-height':
      bgLayer.style.backgroundSize = 'auto 100%';
      bgLayer.style.backgroundPosition = 'center center';
      break;
    case 'stretch':
      bgLayer.style.backgroundSize = '100% 100%';
      bgLayer.style.backgroundPosition = 'center center';
      break;
    default:
      bgLayer.style.backgroundSize = 'cover';
      bgLayer.style.backgroundPosition = 'center center';
  }
  try { localStorage.setItem('bgFitMode', m || 'cover'); } catch (_) { }
  setActiveBgFitButton(m || 'cover');
}

function setActiveBgFitButton(mode) {
  const ids = [
    'bgFitContainBtn', 'bgFitCoverBtn', 'bgFitStretchBtn',
    'bgFitCoverTopBtn', 'bgFitCoverCenterBtn', 'bgFitCoverBottomBtn',
    'bgFitContainTopBtn', 'bgFitContainCenterBtn', 'bgFitContainBottomBtn',
    'bgFitFitWidthBtn', 'bgFitFitHeightBtn'
  ];
  ids.forEach(id => document.getElementById(id)?.classList.remove('active'));
  const map = {
    'contain': 'bgFitContainBtn', 'contain-center': 'bgFitContainCenterBtn', 'contain-top': 'bgFitContainTopBtn', 'contain-bottom': 'bgFitContainBottomBtn',
    'cover': 'bgFitCoverBtn', 'cover-center': 'bgFitCoverCenterBtn', 'cover-top': 'bgFitCoverTopBtn', 'cover-bottom': 'bgFitCoverBottomBtn',
    'fit-width': 'bgFitFitWidthBtn', 'fit-height': 'bgFitFitHeightBtn', 'stretch': 'bgFitStretchBtn'
  };
  const targetId = map[mode] || map['cover'];
  document.getElementById(targetId)?.classList.add('active');
}