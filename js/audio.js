/**
 * audio.js — Czech pronunciation
 * Strategy: Google TTS via <audio> with error/timeout fallback to SpeechSynthesis.
 * On PC browsers (Edge/Chrome) Google TTS is often blocked by tracking prevention,
 * so we detect failure quickly and fall back to SpeechSynthesis.
 */
const Audio = (() => {
  let audioEl = null;
  let voices = [];
  let czechVoice = null;
  let synthReady = false;

  function init() {
    // Create a persistent audio element in the DOM
    audioEl = document.createElement('audio');
    audioEl.id = 'ttsAudio';
    audioEl.style.display = 'none';
    document.body.appendChild(audioEl);

    // Pre-load SpeechSynthesis voices
    if ('speechSynthesis' in window) {
      const loadV = () => {
        voices = speechSynthesis.getVoices();
        czechVoice = voices.find(v => v.lang === 'cs-CZ' && /online|neural/i.test(v.name))
          || voices.find(v => v.lang === 'cs-CZ')
          || voices.find(v => v.lang.startsWith('cs'))
          || null;
        synthReady = voices.length > 0;
      };
      loadV();
      speechSynthesis.onvoiceschanged = loadV;
      setTimeout(loadV, 200);
      setTimeout(loadV, 1000);
    }
  }

  function speak(text) {
    if (!text) return;

    // Try Google TTS first via <audio> element
    const url = 'https://translate.googleapis.com/translate_tts'
      + '?ie=UTF-8&tl=cs&client=gtx&q=' + encodeURIComponent(text);

    // Set a timeout: if audio doesn't start playing within 1.5s, use fallback
    let resolved = false;
    const fallbackTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        audioEl.pause();
        audioEl.removeAttribute('src');
        speakSynth(text);
      }
    }, 1500);

    // On successful play
    const onPlaying = () => {
      resolved = true;
      clearTimeout(fallbackTimer);
      cleanup();
    };

    // On any error
    const onError = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(fallbackTimer);
        cleanup();
        speakSynth(text);
      }
    };

    function cleanup() {
      audioEl.removeEventListener('playing', onPlaying);
      audioEl.removeEventListener('error', onError);
    }

    audioEl.addEventListener('playing', onPlaying, { once: true });
    audioEl.addEventListener('error', onError, { once: true });

    audioEl.src = url;
    const p = audioEl.play();
    if (p && p.catch) p.catch(onError);
  }

  function speakSynth(text) {
    if (!('speechSynthesis' in window)) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    // Delay after cancel to avoid Chrome silent-speak bug
    setTimeout(() => {
      // Re-check voices
      if (!synthReady) {
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

      // Chrome resume workaround for long utterances
      const timer = setInterval(() => {
        if (!synth.speaking) clearInterval(timer);
        else synth.resume();
      }, 5000);
      utter.onend = () => clearInterval(timer);
      utter.onerror = () => clearInterval(timer);
    }, 150);
  }

  function isAvailable() {
    return true;
  }

  return { init, speak, isAvailable };
})();
