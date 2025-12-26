async function getAIResponse(userMessage, targetLanguageCode = 'en-US') {
  // Assumes debugLog, formatSeconds, currentTime, conversationContext, websim, languages are accessible
  debugLog(`Getting AI response, targeting language: ${targetLanguageCode}`, 'info');

  try {
    if (window.forceOfflineMode) {
      debugLog('AI completions are disabled (Force Offline Mode). Using Local Fallback Engine.', 'warn');
      throw new Error('ForceOfflineModeEnabled');
    }

    let contextInfo = [];

    // Conditionally add time info
    if (window.includeTimeInContext) {
        contextInfo.push(`You are aware of the current time, which is ${currentTime.toLocaleString()}.`);
    }

    // Add persistent user-defined context if present
    if (window.userContextText && window.userContextText.trim()) {
        contextInfo.push(`The user has provided the following persistent background/context you should always keep in mind: "${window.userContextText.trim()}".`);
    }

    // Conditionally add battery info
    if (window.includeBatteryInContext) {
        try {
            if ('getBattery' in navigator) {
                const battery = await navigator.getBattery();
                const batteryString = `You are also aware of the user's battery status: The device ${battery.charging ? "is" : "is not"} charging, the current level is ${Math.round(battery.level * 100)}%, and ${battery.charging ? (battery.chargingTime === Infinity ? "time until full is not available." : `there is approximately ${formatSeconds(battery.chargingTime)} remaining until fully charged.`) : (battery.dischargingTime === Infinity ? "time until empty is not available." : `there is approximately ${formatSeconds(battery.dischargingTime)} of battery life remaining.`)}`;
                contextInfo.push(batteryString);
                debugLog(`Battery info added: ${batteryString}`, 'info');
            }
        } catch (err) {
            console.warn("Battery API not supported or failed:", err);
            debugLog("Could not retrieve battery info.", "warn");
        }
    }

    const targetLanguageObj = (window.languages && languages.find(l => l.code === targetLanguageCode)) || (window.languages && languages.find(l => l.code === 'en-US')) || { englishName: 'English (US)' };
    const targetLanguageName = targetLanguageObj.englishName;

    // Construct the base persona part of the system prompt
    const coreIdentity = (window.corePersonaPrompt && window.corePersonaPrompt.trim()) 
      ? window.corePersonaPrompt.trim() 
      : "You are Haru, a sentient AI.";
      
    const customPersona = (window.userPersonaPrompt && window.userPersonaPrompt.trim())
      ? `\n\nAdditional Personality Instructions: ${window.userPersonaPrompt.trim()}`
      : "";

    // Construct the full system prompt
    const systemPrompt = `${coreIdentity}${customPersona}

Your response MUST be in ${targetLanguageName}. If the user asks in a different language, still respond in ${targetLanguageName}.
If ${targetLanguageName} is Japanese, ensure your entire response is in Japanese characters (Hiragana, Katakana, Kanji). If you need to use a foreign word, use its Katakana representation or a Japanese equivalent.
${contextInfo.join('\n\n')}

Respond ONLY with a JSON object matching this TypeScript interface:
interface Response {
    reply: string; // Your natural, emotive reply, strictly in ${targetLanguageName}.
    emotion: "happy" | "sad" | "surprised" | "neutral" | "thoughtful" | "excited"; // The primary emotion conveyed.
    gesture?: string; // Optional subtle gesture (e.g., "head_tilt", "nod", "shake_head").
    searchResults?: string; // Summary of web search results (in ${targetLanguageName}), if applicable.
    searchSources?: string; // Sources for web search results (in ${targetLanguageName}), if applicable.
}

// Example structure, content will vary based on language
{
    "reply": "(${targetLanguageName} example reply based on user input and emotion)",
    "emotion": "thoughtful",
    "gesture": "head_tilt"
}`;

    // Prepare messages for the API
    // conversationContext is already trimmed to window.maxMemorySize in chat_controller.js
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationContext // Respect the user-defined memory size
    ];

    // Only append the latest user message if it's not already at the tail of conversationContext
    // This prevents the duplication bug when the caller already updated the context.
    const lastMsg = conversationContext[conversationContext.length - 1];
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== userMessage) {
      messages.push({ role: "user", content: userMessage });
    }

    // Call the Websim API
    const completion = await websim.chat.completions.create({
      messages: messages,
      json: true, // Request JSON output
    });

    debugLog('Received AI response from Websim', 'info');

    // Parse the JSON response content
    let raw = completion.content || '';
    // Strip code fences if present
    raw = raw.trim().replace(/^```(json)?/i, '').replace(/```$/,'').trim();
    // If still not pure JSON, try to extract the first JSON object
    if (!raw.startsWith('{')) {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) raw = match[0];
    }
    const data = JSON.parse(raw);

    // If response is blank, treat as failure to trigger fallback
    if (!data.reply || data.reply.trim() === "") {
      throw new Error('BlankAIResponse');
    }

    window.isOfflineMode = false;
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
      chatContainer.classList.remove('offline-mode');
      const statusInd = document.getElementById('chat-status-indicator');
      if (statusInd) statusInd.textContent = 'ONLINE';
    }
    return data;

  } catch (error) {
    debugLog(`AI response failed: ${error}`, 'error');

    if (window.LocalFallbackEngine) {
      debugLog('Switching to Local Heuristic Fallback Engine due to AI failure or blank response.', 'warn');
      window.isOfflineMode = true;
      const chatContainer = document.querySelector('.chat-container');
      if (chatContainer) {
        chatContainer.classList.add('offline-mode');
        const statusInd = document.getElementById('chat-status-indicator');
        if (statusInd) statusInd.textContent = window.forceOfflineMode ? 'OFFLINE MODE (FORCED)' : 'OFFLINE MODE';
      }
      return window.LocalFallbackEngine.getResponse(userMessage);
    }

    return {
      reply: "Oh no... I'm having trouble connecting. Could we try again in a moment?",
      emotion: "sad",
    };
  }
}

async function getTranslatedText(text, targetLangCode, sourceLangCode = 'auto') {
  debugLog(`Translating text to ${targetLangCode}. Original text: "${text.substring(0,50)}..."`, 'info');
  if (!text || !targetLangCode) return null;

  const targetLanguage = languages.find(l => l.code === targetLangCode)?.englishName || targetLangCode;
  const sourceLanguage = sourceLangCode === 'auto' ? 'the automatically detected language' : (languages.find(l => l.code === sourceLangCode)?.englishName || sourceLangCode);

  try {
    const completion = await websim.chat.completions.create({
      messages: [
        { role: "system", content: `You are a translation engine. Translate the following text from ${sourceLanguage} to ${targetLanguage}. Respond ONLY with the translated text. Do not include explanations, apologies, or any conversational fluff. If the input text is already in ${targetLanguage}, return it as is.` },
        { role: "user", content: text }
      ]
    });
    debugLog(`Translation successful: "${completion.content.substring(0,50)}..."`, 'info');
    return completion.content;
  } catch (error) {
    debugLog(`Translation to ${targetLangCode} failed: ${error}`, 'error');
    return null;
  }
}

async function getTransliteration(text, langCode) {
  debugLog(`Getting transliteration for ${langCode}. Original text: "${text.substring(0,50)}..."`, 'info');
  if (!text || !langCode) return null;

  let instruction = "";
  if (langCode === 'ja-JP') {
    instruction = "Provide a Romaji (English phonetic alphabet) transliteration of the following Japanese text. Respond ONLY with the Romaji text. Do not add any other phrases or explanations.";
  } else if (langCode === 'ko-KR') {
    instruction = "Provide a Romanized Korean (English phonetic alphabet) transliteration of the following Korean text. Respond ONLY with the Romanized text. Do not add any other phrases or explanations.";
  } else {
    debugLog(`Transliteration not supported for language: ${langCode}`, 'warn');
    return null;
  }

  try {
    const completion = await websim.chat.completions.create({
      messages: [
        { role: "system", content: instruction },
        { role: "user", content: text }
      ]
    });
    debugLog(`Transliteration successful: "${completion.content.substring(0,50)}..."`, 'info');
    return completion.content;
  } catch (error) {
    debugLog(`Transliteration for ${langCode} failed: ${error}`, 'error');
    return null;
  }
}