// Manages the UI and functionality of the radio stream player.

function updateRadioToggleButton() {
    // Assumes radioPlayer, radioPlayIcon, radioPauseIcon are accessible
    if (!radioPlayer || !radioPlayIcon || !radioPauseIcon) return;

    if (radioPlayer.paused) {
        radioPlayIcon.classList.remove('hidden');
        radioPauseIcon.classList.add('hidden');
    } else {
        radioPlayIcon.classList.add('hidden');
        radioPauseIcon.classList.remove('hidden');
    }
}

// Add event listener for the custom radio toggle button
// Check if radioToggleBtn exists before adding the listener
if (radioToggleBtn) {
    radioToggleBtn.addEventListener('click', () => {
        // Assumes radioPlayer is accessible
        if (radioPlayer.paused) {
            // Ensure audio context is started on user interaction if using Tone.js for this
            // (Though this specific audio element doesn't use Tone directly)
            // For standard audio element, play() call is sufficient and requires user gesture.
            radioPlayer.play().catch(error => {
                debugLog(`Error attempting to play radio: ${error}`, 'error');
                console.error("Radio playback error:", error);
                // Optionally show a user-friendly error message
                addMessage("Sorry, I couldn't start the radio stream. Your browser might require another click or interaction.", false);
            });
        } else {
            radioPlayer.pause();
        }
    });

    // Listen for audio events to keep button state in sync
    radioPlayer.addEventListener('play', updateRadioToggleButton);
    radioPlayer.addEventListener('pause', updateRadioToggleButton);
    radioPlayer.addEventListener('ended', updateRadioToggleButton); // Handle when stream ends
}

// Add event listener for the volume slider
if (radioVolumeSlider) {
    radioVolumeSlider.addEventListener('input', (e) => {
        // Assumes radioPlayer is accessible
        if (radioPlayer) {
            radioPlayer.volume = parseFloat(e.target.value);
            debugLog(`Radio volume set to: ${radioPlayer.volume.toFixed(2)}`, 'info');
        }
    });
}