/**
 * audio.js — Czech pronunciation
 * Primary: Google TTS via translate.googleapis.com
 * Fallback: Web Speech API
 */
const Audio = (() => {
  let currentAudio = null;

  function init() {
    // Pre-load voices for SpeechSynthesis fallback
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
  }

  function speak(text) {
    if (!text) return;

    // Stop anything currently playing
    _stop();

    // Try Google TTS
    try {
      const encoded = encodeURIComponent(text);
      const url = 'https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=cs&client=gtx&q=' + encoded;

      const audio = new window.Audio(url);
      currentAudio = audio;

      // Simple timeout fallback
      const fallbackTimer = setTimeout(() => {
        _stop();
        _speakSynthesis(text);
      }, 4000);

      audio.addEventListener('ended', () => clearTimeout(fallbackTimer));
      audio.addEventListener('error', () => {
        clearTimeout(fallbackTimer);
        _speakSynthesis(text);
      });

      audio.play().catch(() => {
        clearTimeout(fallbackTimer);
        _speakSynthesis(text);
      });
    } catch (e) {
      _speakSynthesis(text);
    }
  }

  function _stop() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  function _speakSynthesis(text) {
    if (!('speechSynthesis' in window)) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'cs-CZ';
    utter.rate = 0.85;

    const voices = synth.getVoices();
    // Prefer online/neural Czech voice
    const czech = voices.find(v => v.lang === 'cs-CZ' && v.name.includes('Online'))
      || voices.find(v => v.lang === 'cs-CZ')
      || voices.find(v => v.lang.startsWith('cs'));
    if (czech) utter.voice = czech;

    synth.speak(utter);
  }

  function isAvailable() {
    return typeof window.Audio === 'function' || 'speechSynthesis' in window;
  }

  return { init, speak, isAvailable };
})();
