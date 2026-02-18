/**
 * audio.js — Czech pronunciation
 * Primary: Google TTS via <audio> element (works great on mobile).
 * Fallback: Web Speech API for PC browsers where Google TTS is blocked.
 */
const Audio = (() => {
  let audioEl = null;
  let voices = [];
  let czechVoice = null;
  let googleBlocked = false; // remember if Google TTS failed

  function init() {
    // Persistent audio element
    audioEl = document.createElement('audio');
    audioEl.id = 'ttsAudio';
    audioEl.style.display = 'none';
    document.body.appendChild(audioEl);

    // Pre-load SpeechSynthesis voices for fallback
    if ('speechSynthesis' in window) {
      const loadV = () => {
        voices = speechSynthesis.getVoices();
        czechVoice = voices.find(v => v.lang === 'cs-CZ' && /online|neural|zuzana|iveta/i.test(v.name))
          || voices.find(v => v.lang === 'cs-CZ')
          || voices.find(v => v.lang.startsWith('cs'))
          || null;
      };
      loadV();
      speechSynthesis.onvoiceschanged = loadV;
      setTimeout(loadV, 250);
      setTimeout(loadV, 1000);
    }
  }

  function speak(text) {
    if (!text) return;

    // If we already know Google is blocked on this device, skip straight to synth
    if (googleBlocked) {
      speakSynth(text);
      return;
    }

    // Try Google TTS
    const url = 'https://translate.googleapis.com/translate_tts'
      + '?ie=UTF-8&tl=cs&client=gtx&q=' + encodeURIComponent(text);

    // Stop any current playback
    audioEl.pause();
    audioEl.currentTime = 0;

    audioEl.onerror = () => {
      googleBlocked = true;
      speakSynth(text);
    };

    // Set src and play immediately (must stay in user gesture context for iOS)
    audioEl.src = url;
    const p = audioEl.play();
    if (p && p.catch) {
      p.catch(() => {
        googleBlocked = true;
        speakSynth(text);
      });
    }
  }

  function speakSynth(text) {
    if (!('speechSynthesis' in window)) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    setTimeout(() => {
      // Refresh voices if needed
      if (!voices.length) {
        voices = synth.getVoices();
        czechVoice = voices.find(v => v.lang === 'cs-CZ')
          || voices.find(v => v.lang.startsWith('cs'))
          || null;
      }

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'cs-CZ';
      utter.rate = 0.85;
      utter.pitch = 1;
      if (czechVoice) utter.voice = czechVoice;

      synth.speak(utter);

      // Chrome resume workaround
      const timer = setInterval(() => {
        if (!synth.speaking) clearInterval(timer);
        else synth.resume();
      }, 5000);
      utter.onend = () => clearInterval(timer);
      utter.onerror = () => clearInterval(timer);
    }, 120);
  }

  function isAvailable() {
    return true;
  }

  return { init, speak, isAvailable };
})();
