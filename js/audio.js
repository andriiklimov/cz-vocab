/**
 * audio.js — Czech pronunciation via Web Speech API
 */
const Audio = (() => {
  let synth = null;

  function init() {
    synth = window.speechSynthesis;
  }

  /**
   * Speak a Czech text string
   * @param {string} text - text to pronounce
   * @param {string} lang - BCP47 language tag (default 'cs-CZ')
   */
  function speak(text, lang = 'cs-CZ') {
    if (!synth) init();
    if (!synth) return;

    // Cancel any ongoing speech
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // Try to find a Czech voice
    const voices = synth.getVoices();
    const czechVoice = voices.find(v => v.lang.startsWith('cs'));
    if (czechVoice) {
      utterance.voice = czechVoice;
    }

    synth.speak(utterance);
  }

  /**
   * Check if speech synthesis is available
   */
  function isAvailable() {
    return 'speechSynthesis' in window;
  }

  return { init, speak, isAvailable };
})();
