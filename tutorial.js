// Simple step-by-step tutorial modal
(function () {
  const steps = [
    {
      title: "👋 Welcome",
      body: "This app pairs a Live2D character 🎭 with a chat 🗨️ powered by an AI model 🤖. You can move 🖱️ and zoom 🔍 the character, chat 💬, and even listen to radio 🎶 while using TTS 🔊."
    },
    {
      title: "💬 Chat",
      body: "Type your message ⌨️ and press Enter ↩️ or Send 📨. The conversation history is saved locally 💾. Use Reset Chat 🗑️ to clear it."
    },
    {
      title: "🧩 Models",
      body: "Open Settings ⚙️ → Model Settings 🧩 to switch the Live2D model. You can add your own model via a .model3.json URL 🔗 and optional thumbnail 🖼️."
    },
    {
      title: "🖼️ Backgrounds",
      body: "In Settings ⚙️ → Background Image 🖼️ you can generate a background from a typed prompt 💡 or from the current conversation 🗣️, and manage the Background Library 📚: open a fullscreen viewer 🖥️, select multiple to delete 🗑️, or clear the library 🧹. The active background image is saved automatically 💾 so your scene ✨ is ready next time."
    },
    {
      title: "🌐 Languages",
      body: "Response Language 🗣️ sets the AI reply language 🌍. Translate Response To 🔁 shows an extra translated line 📝. Transliteration 🔤 helps with Japanese/Korean 🇯🇵🇰🇷 so you can read the pronunciation more easily 😊."
    },
    {
      title: "🔊 Voice (TTS)",
      body: "Enable Voice 🔈 toggles TTS playback 🎧. Choose a voice 🎙️ per language. If no voice exists, select None 🚫 to disable for that language. WebSim voices are available for many languages (for example English, Japanese, German, Portuguese, Spanish, French, Chinese (Simplified/Traditional), Filipino, Italian, Russian, Hindi) 🌎; you can pick a different WebSim voice per language in Voice Settings 🎛️."
    },
    {
      title: "📻 Audio / Radio",
      body: "Use the radio controls to play/pause ▶️⏸️ the anime radio stream and adjust volume 🔉 with the slider."
    },
    {
      title: "🖥️ Display & Controls",
      body: "Toggle the clock ⏰ and navigation controls 🎮. Use the buttons to move ↕️↔️ / zoom 🔍 the model. You can also drag the model 🖱️ and use mouse wheel to zoom 🌀."
    },
    {
      title: "⚙️ Opacity & Preferences",
      body: "Adjust chatbox 🪟 and message bubble 💬 opacities to your taste 🎨. Choose whether to always show Settings on load ✨ and whether to include time ⏱️ / battery 🔋 in AI context for more context-aware replies 🧠."
    },
    {
      title: "🐞 Debug Panel",
      body: "Enable Debug Panel 🧰 to see logs 📋, useful for troubleshooting 🛠️. Logs appear on the left ◀️. Clear Log 🧹 removes them."
    },
    {
      title: "🖱️ Drag & Resize",
      body: "Drag the Chat window by its header 🪟 and resize from its edges ↔️↕️. Positions and sizes are saved automatically 💾 so your layout stays how you like it 👍."
    },
    {
      title: "💡 Tips",
      body: "If audio doesn't play 🔇, interact with the page (click 🖱️ or tap 👆) to allow audio. If a model fails to load ⚠️, try another model 🎭 or your own URL 🔗. You can always reset chat 🗑️ or tweak settings ⚙️ if something feels off."
    }
  ];

  let idx = 0;

  const overlay = document.getElementById("tutorialOverlay");
  const titleEl = document.getElementById("tutorialTitle");
  const bodyEl = document.getElementById("tutorialBody");
  const prevBtn = document.getElementById("tutorialPrevBtn");
  const nextBtn = document.getElementById("tutorialNextBtn");
  const closeBtn = document.getElementById("tutorialCloseBtn");
  const launchBtn = document.getElementById("launchTutorialBtn");

  // Cache for the translated second half
  let cachedSecondHalf = null;

  async function render() {
    const langCode = window.currentInterfaceLanguage || "en-US";

    // Title is localized elsewhere via ui_strings/ui_translator
    titleEl.textContent = "App Guide";

    // Translate steps if language is not English
    let displaySteps = steps;
    if (langCode !== "en-US") {
      // Use loading state if translating
      bodyEl.innerHTML = '<div style="text-align:center; padding: 40px; color: #aaa;">Translating guide... ⏳</div>';
      displaySteps = await translateTutorialSteps(steps, langCode);
    }

    // Get the second half content (translated)
    let secondHalf = cachedSecondHalf;
    const lastLang = window.lastTutorialLang;

    if (!secondHalf || lastLang !== langCode) {
      secondHalf = await translateTutorialSecondHalf(langCode);
      cachedSecondHalf = secondHalf;
      window.lastTutorialLang = langCode;
    }

    const stepsHtml = displaySteps
      .map(step => `<div class="tutorial-step-card"><h4>${step.title}</h4><p>${step.body}</p></div>`)
      .join("");

    bodyEl.innerHTML = stepsHtml + `<div style="margin-top: 40px; opacity: 0.8; font-size: 0.95em;">${secondHalf}</div>`;

    // Single-page style: hide prev/next buttons
    if (prevBtn) prevBtn.style.display = "none";
    if (nextBtn) nextBtn.style.display = "none";
  }

  async function open() {
    overlay.classList.add("visible");
    overlay.setAttribute("aria-hidden", "false");
    await render();
    overlay.classList.add("visible");
    overlay.setAttribute("aria-hidden", "false");
    bodyEl.scrollTop = 0;
    if (closeBtn) closeBtn.focus();
  }

  function close() {
    overlay.classList.remove("visible");
    overlay.setAttribute("aria-hidden", "true");
  }

  // Legacy step navigation (kept for compatibility, but hidden in UI)
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (idx > 0) {
        idx -= 1;
        render();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (idx < steps.length - 1) {
        idx += 1;
        render();
      } else {
        close();
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", close);
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener("keydown", (e) => {
    if (overlay.classList.contains("visible") && e.key === "Escape") {
      close();
    }
  });

  if (launchBtn) {
    launchBtn.addEventListener("click", open);
  }

  // Expose for programmatic access
  window.showTutorial = open;
  window.rerenderTutorial = render;
})();