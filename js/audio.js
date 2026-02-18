/**
 * audio.js — Czech pronunciation via Google Translate TTS
 * Falls back to Web Speech API if Google TTS is unavailable
 */
const Audio = (() => {
  let currentAudio = null;

  function init() {
    // Nothing to initialize for Google TTS
  }

  /**
   * Build Google Translate TTS URL for Czech text
   */
  function _buildGoogleTTSUrl(text) {
    const encoded = encodeURIComponent(text);
    return `https://translate.google.com/translate_tts?ie=UTF-8&tl=cs&client=tw-ob&q=${encoded}`;
  }

  /**
   * Speak a Czech text string via Google Translate TTS
   * @param {string} text - text to pronounce
   */
  function speak(text) {
    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    const audio = new window.Audio(_buildGoogleTTSUrl(text));
    currentAudio = audio;

    audio.play().catch(() => {
      // Fallback to Web Speech API if Google TTS fails
      _speakFallback(text);
    });
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

    const voices = synth.getVoices();
    const czechVoice = voices.find(v => v.lang.startsWith('cs'));
    if (czechVoice) utterance.voice = czechVoice;

    synth.speak(utterance);
  }

  /**
   * Check if audio playback is available
   */
  function isAvailable() {
    return typeof window.Audio === 'function' || 'speechSynthesis' in window;
  }

  return { init, speak, isAvailable };
})();
