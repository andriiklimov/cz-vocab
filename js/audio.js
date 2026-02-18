/**
 * audio.js — Czech pronunciation via Google Translate TTS
 * Falls back to Web Speech API if unavailable
 */
const Audio = (() => {
  let currentAudio = null;
  let voicesLoaded = false;

  function init() {
    // Pre-load voices for fallback
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
        voicesLoaded = true;
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }

  /**
   * Speak Czech text — tries Google TTS first, then SpeechSynthesis
   */
  function speak(text) {
    if (!text) return;

    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Try Google Translate TTS
    const encoded = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=cs&client=gtx&q=${encoded}`;

    const audio = new window.Audio();
    audio.crossOrigin = 'anonymous';
    currentAudio = audio;

    audio.oncanplaythrough = () => {
      audio.play().catch(() => _speakFallback(text));
    };

    audio.onerror = () => {
      _speakFallback(text);
    };

    // Timeout — if audio doesn't load in 3s, use fallback
    const timeout = setTimeout(() => {
      if (audio.readyState < 3) {
        audio.src = '';
        _speakFallback(text);
      }
    }, 3000);

    audio.onended = () => clearTimeout(timeout);
    audio.src = url;
    audio.load();
  }

  /**
   * Web Speech API fallback
   */
  function _speakFallback(text) {
    if (!('speechSynthesis' in window)) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'cs-CZ';
    utterance.rate = 0.85;
    utterance.pitch = 1;

    // Try to find the best Czech voice
    const voices = synth.getVoices();
    const czechVoice = voices.find(v => v.lang === 'cs-CZ')
      || voices.find(v => v.lang.startsWith('cs'));
    if (czechVoice) utterance.voice = czechVoice;

    synth.speak(utterance);
  }

  function isAvailable() {
    return typeof window.Audio === 'function' || 'speechSynthesis' in window;
  }

  return { init, speak, isAvailable };
})();
