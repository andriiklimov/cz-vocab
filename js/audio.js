/**
 * audio.js — Czech pronunciation
 * Strategy: try Google TTS via hidden <audio> element first,
 * fallback to Web Speech API with delay workarounds.
 */
const Audio = (() => {
  let audioEl = null;
  let voices = [];
  let czechVoice = null;

  function init() {
    // Create a persistent audio element in the DOM
    audioEl = document.createElement('audio');
    audioEl.id = 'ttsAudio';
    audioEl.style.display = 'none';
    document.body.appendChild(audioEl);

    // Pre-load SpeechSynthesis voices as fallback
    if ('speechSynthesis' in window) {
      const loadV = () => {
        voices = speechSynthesis.getVoices();
        czechVoice = voices.find(v => v.lang === 'cs-CZ' && /online|neural/i.test(v.name))
          || voices.find(v => v.lang === 'cs-CZ')
          || voices.find(v => v.lang.startsWith('cs'))
          || null;
      };
      loadV();
      speechSynthesis.onvoiceschanged = loadV;
      setTimeout(loadV, 200);
      setTimeout(loadV, 1000);
    }
  }

  function speak(text) {
    if (!text) return;

    // Try Google TTS first — works in most browsers
    const url = 'https://translate.googleapis.com/translate_tts'
      + '?ie=UTF-8&tl=cs&client=gtx&q=' + encodeURIComponent(text);

    audioEl.src = url;
    const playPromise = audioEl.play();

    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Google TTS blocked (tracking prevention etc.) — fallback to SpeechSynthesis
        speakFallback(text);
      });
    }
  }

  function speakFallback(text) {
    if (!('speechSynthesis' in window)) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    // Small delay after cancel() to avoid Chrome/Edge silent-speak bug
    setTimeout(() => {
      if (!voices.length) {
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

      // Chrome resume workaround
      const timer = setInterval(() => {
        if (!synth.speaking) clearInterval(timer);
        else synth.resume();
      }, 5000);
      utter.onend = () => clearInterval(timer);
      utter.onerror = () => clearInterval(timer);
    }, 100);
  }

  function isAvailable() {
    return true; // always available — we have multiple strategies
  }

  return { init, speak, isAvailable };
})();
