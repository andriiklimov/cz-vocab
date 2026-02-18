/**
 * app.js — Main application logic
 */
const App = (() => {
  let words = [];
  let currentMode = 'all'; // all | category | reverse
  let currentCategory = null;
  let learnFilter = 'due'; // 'all' | 'due' (due = new + not learned + due today)

  let currentCardIndex = 0;
  let cachedDeck = []; // stable shuffled deck for current filter

  /* ---------- Shuffle (Fisher-Yates) ---------- */
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Rebuild the shuffled deck — call when filters change */
  function rebuildDeck() {
    cachedDeck = shuffle(getFilteredWords());
    currentCardIndex = 0;
  }

  /* ---------- Init ---------- */

  async function init() {
    // Theme
    applyTheme(Storage.getTheme());

    // Load words
    try {
      const res = await fetch('data/words.json');
      words = await res.json();
    } catch (e) {
      console.error('Failed to load words:', e);
      words = [];
    }

    // Init audio
    Audio.init();

    // Build UI
    buildCategoryFilters();
    rebuildDeck();
    renderFlashcard();
    updateStats();
    bindEvents();

    // Register SW
    registerSW();
  }

  /* ---------- Theme ---------- */

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Storage.setTheme(theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.classList.toggle('is-dark', theme === 'dark');
  }

  function toggleTheme() {
    const current = Storage.getTheme();
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  /* ---------- Filters & Modes ---------- */

  function getFilteredWords() {
    let filtered = [...words];

    // Mode filter
    switch (currentMode) {
      case 'category':
        if (currentCategory) {
          filtered = filtered.filter(w => w.tags.includes(currentCategory));
        }
        break;
    }

    // Learn filter: show only words that are not fully learned (box < 5) or due today
    if (learnFilter === 'due') {
      filtered = filtered.filter(w => {
        const box = SpacedRepetition.getBox(w.id);
        return box < SpacedRepetition.MAX_BOX || SpacedRepetition.isDueToday(w.id);
      });
    }

    return filtered;
  }

  function setMode(mode, category = null) {
    currentMode = mode;
    currentCategory = category;

    // Update active states
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    if (mode === 'category' && category) {
      const catBtn = document.querySelector(`.filter-btn[data-category="${category}"]`);
      if (catBtn) catBtn.classList.add('active');
    } else {
      const modeBtn = document.querySelector(`.filter-btn[data-mode="${mode}"]`);
      if (modeBtn) modeBtn.classList.add('active');
    }

    rebuildDeck();
    renderFlashcard();
  }

  function buildCategoryFilters() {
    const row = document.getElementById('categoryFilters');
    if (!row) return;

    const allTags = new Set();
    words.forEach(w => w.tags.forEach(t => allTags.add(t)));

    const tagOrder = ['Привітання','Їжа','Числа','Побут','Люди','Природа','Здоров\'я','Дієслова','Опис'];
    const sorted = tagOrder.filter(t => allTags.has(t));
    // append any tags not in the predefined order
    allTags.forEach(t => { if (!sorted.includes(t)) sorted.push(t); });

    sorted.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.category = tag;
      btn.textContent = tag;
      btn.addEventListener('click', () => setMode('category', tag));
      row.appendChild(btn);
    });
  }

  /* ---------- Single Flashcard Mode ---------- */

  function renderFlashcard(direction) {
    const area = document.getElementById('flashcardArea');
    const counter = document.getElementById('flashcardCounter');
    if (!area) return;

    const filtered = cachedDeck;
    if (filtered.length === 0) {
      area.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">Немає карток</div></div>`;
      if (counter) counter.textContent = '0 / 0';
      return;
    }

    if (currentCardIndex >= filtered.length) currentCardIndex = 0;
    if (currentCardIndex < 0) currentCardIndex = filtered.length - 1;

    const newCard = createCardElement(filtered[currentCardIndex]);

    // Slide animation if direction specified
    if (direction && area.firstChild) {
      const oldCard = area.firstChild;
      const exitClass = direction === 'left' ? 'slide-out-left' : 'slide-out-right';
      const enterClass = direction === 'left' ? 'slide-in-right' : 'slide-in-left';

      oldCard.classList.add(exitClass);
      newCard.classList.add(enterClass);
      area.appendChild(newCard);

      oldCard.addEventListener('animationend', () => {
        oldCard.remove();
        newCard.classList.remove(enterClass);
      }, { once: true });
    } else {
      area.innerHTML = '';
      area.appendChild(newCard);
    }

    if (counter) counter.textContent = `${currentCardIndex + 1} / ${filtered.length}`;
  }


  function createCardElement(word) {
    const container = document.createElement('div');
    container.className = 'card-container';
    container.dataset.wordId = word.id;

    // Gender label
    const genderMap = { ma: 'Ma', mi: 'Mi', f: 'F', n: 'N' };
    const genderLabel = word.gender ? `<span class="card-gender gender-${word.gender}">${genderMap[word.gender] || ''}</span>` : '';

    container.innerHTML = `
      <div class="card-split">
        <div class="card-left">
          <div class="card-czech">${word.czech}</div>
          <div class="card-type">${word.type} ${genderLabel}</div>
          <div class="card-example-row">
            <span class="card-example">${word.example}</span>
            <button class="card-action-btn speak-btn" data-czech="${word.example}" title="Вимова фрази" aria-label="Відтворити вимову фрази"><svg class="speak-icon" viewBox="0 0 24 24" width="14" height="14"><path d="M3 9v6h4l5 5V4L7 9H3z"/><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/><path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg></button>
          </div>
          <button class="card-speak-float speak-btn" data-czech="${word.czech}" title="Вимова" aria-label="Відтворити вимову"><svg class="speak-icon" viewBox="0 0 24 24" width="28" height="28"><path d="M3 9v6h4l5 5V4L7 9H3z"/><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/><path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg></button>
        </div>
        <div class="card-right" data-revealed="false" role="button" tabindex="0" aria-label="Показати переклад">
          <div class="card-answer-hidden">
            <div class="reveal-placeholder">?</div>
            <div class="reveal-hint">натисни щоб побачити</div>
          </div>
          <div class="card-answer-revealed">
            <div class="card-transcription">[${word.transcription}]</div>
            <div class="card-transcription-cyr">[${word.transcriptionCyr}]</div>
            <div class="card-ukrainian">${word.ukrainian}</div>
            <div class="review-buttons">
              <button class="review-btn wrong" data-word-id="${word.id}" title="Не знаю">✗ Не знаю</button>
              <button class="review-btn correct" data-word-id="${word.id}" title="Знаю">✓ Знаю</button>
            </div>
          </div>
        </div>
      </div>`;

    // Reveal translation on right panel click
    const rightPanel = container.querySelector('.card-right');
    const reveal = () => {
      rightPanel.dataset.revealed = 'true';
    };

    rightPanel.addEventListener('click', (e) => {
      if (e.target.closest('.review-btn')) return;
      reveal();
    });

    rightPanel.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        reveal();
      }
    });

    // Speak buttons (word + example)
    container.querySelectorAll('.speak-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Audio.speak(btn.dataset.czech);
      });
    });

    // Review buttons
    container.querySelector('.review-btn.correct').addEventListener('click', (e) => {
      e.stopPropagation();
      SpacedRepetition.onCorrect(word.id);
      currentCardIndex++;
      renderFlashcard('left');
      updateStats();
    });

    container.querySelector('.review-btn.wrong').addEventListener('click', (e) => {
      e.stopPropagation();
      SpacedRepetition.onWrong(word.id);
      currentCardIndex++;
      renderFlashcard('left');
      updateStats();
    });

    return container;
  }

  /* ---------- Stats ---------- */

  function updateStats() {
    const totalEl = document.getElementById('statTotal');
    const learnedEl = document.getElementById('statLearned');
    const dueEl = document.getElementById('statDue');
    const dueBadge = document.getElementById('dueBadge');

    const total = words.length;
    const learned = SpacedRepetition.getLearnedCount(words);
    const dueCount = SpacedRepetition.getDueCount(words);
    const pct = SpacedRepetition.getProgressPercent(words);

    if (totalEl) totalEl.textContent = total;
    if (learnedEl) learnedEl.textContent = `${pct}%`;
    if (dueEl) dueEl.textContent = dueCount;
    if (dueBadge) {
      dueBadge.textContent = dueCount;
      dueBadge.style.display = dueCount > 0 ? 'inline' : 'none';
    }
  }

  /* ---------- Events ---------- */

  function bindEvents() {
    // Theme toggle
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

    // Learn filter toggle
    document.getElementById('learnFilterBtn')?.addEventListener('click', () => {
      const btn = document.getElementById('learnFilterBtn');
      if (learnFilter === 'due') {
        learnFilter = 'all';
        btn.textContent = '📚 Усі слова';
        btn.classList.add('active');
      } else {
        learnFilter = 'due';
        btn.textContent = '🎯 Для вивчення';
        btn.classList.remove('active');
      }
      currentCardIndex = 0;
      rebuildDeck();
      renderFlashcard();
      updateStats();
    });

    // Mode buttons
    document.querySelectorAll('.filter-btn[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    // Flashcard navigation
    document.getElementById('prevCard')?.addEventListener('click', () => {
      currentCardIndex--;
      renderFlashcard('right');
    });

    document.getElementById('nextCard')?.addEventListener('click', () => {
      currentCardIndex++;
      renderFlashcard('left');
    });

    // Reset progress
    document.getElementById('resetBtn')?.addEventListener('click', () => {
      if (confirm('Скинути весь прогрес? Це видалить усі дані вивчення.')) {
        Storage.resetProgress();
        currentCardIndex = 0;
        rebuildDeck();
        renderFlashcard();
        updateStats();
        showToast('Прогрес скинуто');
      }
    });

    // Swipe gestures for flashcard area
    const flashArea = document.getElementById('flashcardArea');
    if (flashArea) {
      let touchStartX = 0;
      let touchStartY = 0;
      let touchEndX = 0;
      let touchStartTime = 0;

      flashArea.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        touchStartTime = Date.now();
      }, { passive: true });

      flashArea.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        const diffX = touchStartX - touchEndX;
        const diffY = Math.abs(touchStartY - touchEndY);
        const elapsed = Date.now() - touchStartTime;
        const width = flashArea.clientWidth || window.innerWidth || 360;
        const threshold = Math.max(30, Math.min(90, Math.round(width * 0.18)));

        // Only swipe if horizontal movement passes threshold and is dominant
        if (Math.abs(diffX) > threshold && Math.abs(diffX) > diffY && elapsed < 700) {
          if (diffX > 0) {
            // Swipe left → next card
            currentCardIndex++;
            renderFlashcard('left');
          } else {
            // Swipe right → previous card
            currentCardIndex--;
            renderFlashcard('right');
          }
        }
      }, { passive: true });
    }

    // Set default active mode
    setMode('all');
  }

  /* ---------- Toast ---------- */

  function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), 2000);
  }

  /* ---------- Service Worker ---------- */

  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('SW registration failed:', err);
      });
    }
  }

  /* ---------- Public API ---------- */
  return { init };
})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);
