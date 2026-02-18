/**
 * audio.js — Czech pronunciation via Web Speech API
 */
const Audio = (() => {
  let voices = [];
  let czechVoice = null;
  let ready = false;

  function init() {
    if (!('speechSynthesis' in window)) return;

    const synth = window.speechSynthesis;

    function loadVoices() {
      voices = synth.getVoices();
      // Pick best Czech voice: prefer Online/Neural voices
      czechVoice = voices.find(v => v.lang === 'cs-CZ' && /online|neural/i.test(v.name))
        || voices.find(v => v.lang === 'cs-CZ')
        || voices.find(v => v.lang.startsWith('cs'))
        || null;
      ready = voices.length > 0;
    }

    loadVoices();
    synth.onvoiceschanged = loadVoices;

    // Chrome/Edge sometimes need a dummy call to activate
    setTimeout(loadVoices, 100);
    setTimeout(loadVoices, 500);
  }

  function speak(text) {
    if (!text || !('speechSynthesis' in window)) return;

    const synth = window.speechSynthesis;

    // Chrome bug: synth gets stuck, cancel first
    synth.cancel();

    // Reload voices if not loaded yet
    if (!ready) {
      voices = synth.getVoices();
      czechVoice = voices.find(v => v.lang === 'cs-CZ')
        || voices.find(v => v.lang.startsWith('cs'))
        || null;
    }

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'cs-CZ';
    utter.rate = 0.9;
    utter.pitch = 1;
    if (czechVoice) utter.voice = czechVoice;

    synth.speak(utter);

    // Chrome bug workaround: long texts get cut off
    let resumeTimer = setInterval(() => {
      if (!synth.speaking) {
        clearInterval(resumeTimer);
      } else {
        synth.resume();
      }
    }, 5000);

    utter.onend = () => clearInterval(resumeTimer);
    utter.onerror = () => clearInterval(resumeTimer);
  }

  function isAvailable() {
    return 'speechSynthesis' in window;
  }

  return { init, speak, isAvailable };
})();
