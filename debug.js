function debugLog(message, type = 'log', isVerbose = false) {
  if (isVerbose && !window.showVerboseLogs) return;

  // Filter AI and TTS logs based on user preference
  const isAI = /AI|completion|completions/i.test(message);
  const isTTS = /TTS|preload|speech/i.test(message);

  if (isAI && window.showAIDebugLogs === false) return;
  if (isTTS && window.showTTSDebugLogs === false) return;

  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    message,
    type
  };
  
  // Assumes debugHistory is accessible (defined in config.js or passed as argument)
  debugHistory.push(logEntry); 
  
  // Assumes isDebugging and debugLogElement are accessible
  if (isDebugging) {
    const logElement = document.createElement('div');
    logElement.className = `debug-log ${type}`;
    logElement.textContent = `[${timestamp}] ${message}`;
    debugLogElement.appendChild(logElement); // Assumes debugLogElement is defined
    
    // Assumes autoScrollCheckbox is defined
    if (autoScrollCheckbox.checked) { 
      logElement.scrollIntoView();
    }
  }
}

function toggleDebugger() {
  // Assumes isDebugging, debugPanel, enableDebuggerCheckbox are accessible
  isDebugging = !isDebugging; 
  debugPanel.classList.toggle('visible'); 
  enableDebuggerCheckbox.checked = isDebugging; 

  try {
    localStorage.setItem('debugPanelVisible', isDebugging.toString());
  } catch (e) {
    debugLog(`Failed to persist debugPanelVisible: ${e}`, 'error');
  }
}

function clearDebugLog() {
  // Assumes debugHistory and debugLogElement are accessible
  debugHistory = []; 
  debugLogElement.innerHTML = ''; 
}