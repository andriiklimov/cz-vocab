/**
 * app.js — Main application logic
 */
const App = (() => {
  let words = [];
  let currentMode = 'all'; // all | favorites | category | reverse
  let currentCategory = null;

  let currentCardIndex = 0;
  let gridVisible = false;

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
    renderFlashcard();
    renderCards();
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
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
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
      case 'favorites':
        filtered = filtered.filter(w => Storage.isFavorite(w.id));
        break;
      case 'category':
        if (currentCategory) {
          filtered = filtered.filter(w => w.tags.includes(currentCategory));
        }
        break;
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

    renderCards();
    renderFlashcard();
  }

  function buildCategoryFilters() {
    const row = document.getElementById('categoryFilters');
    if (!row) return;

    const allTags = new Set();
    words.forEach(w => w.tags.forEach(t => allTags.add(t)));

    const categoryLabels = {
      greetings: 'Привітання',
      polite: 'Ввічливість',
      food: 'Їжа',
      animals: 'Тварини',
      numbers: 'Числа',
      verbs: 'Дієслова',
      adjectives: 'Прикметники',
      phrases: 'Фрази',
      professions: 'Професії',
      countries: 'Країни',
      phonetics: 'Фонетика',
      everyday: 'Побут',
      nature: 'Природа',
      basic: 'Базові',
    };

    allTags.forEach(tag => {
      if (tag === 'basic') return; // skip basic, it's a cross-cutting tag
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.category = tag;
      btn.textContent = categoryLabels[tag] || tag;
      btn.addEventListener('click', () => setMode('category', tag));
      row.appendChild(btn);
    });
  }

  /* ---------- Single Flashcard Mode ---------- */

  function renderFlashcard(direction) {
    const area = document.getElementById('flashcardArea');
    const counter = document.getElementById('flashcardCounter');
    if (!area) return;

    const filtered = getFilteredWords();
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

  /* ---------- Render Cards ---------- */

  function renderCards() {
    const grid = document.getElementById('cardGrid');
    if (!grid) return;

    const filtered = getFilteredWords();
    grid.innerHTML = '';

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text">Немає карток для відображення</div>
        </div>`;
      return;
    }

    filtered.forEach(word => {
      grid.appendChild(createCardElement(word));
    });

    updateStats();
  }

  function createCardElement(word) {
    const container = document.createElement('div');
    container.className = 'card-container';
    container.dataset.wordId = word.id;

    const box = SpacedRepetition.getBox(word.id);
    const isFav = Storage.isFavorite(word.id);

    // Box pips
    const pips = Array.from({ length: 5 }, (_, i) =>
      `<span class="box-pip ${i < box ? 'filled' : ''}"></span>`
    ).join('');

    // Gender label
    const genderMap = { m: 'муж.', f: 'жін.', n: 'сер.' };
    const genderLabel = word.gender ? `<span class="card-gender">${genderMap[word.gender] || ''}</span>` : '';

    container.innerHTML = `
      <div class="card-split">
        <div class="card-left">
          <div class="card-top-actions">
            <button class="card-action-btn speak-btn" data-czech="${word.czech}" title="Вимова">🔊</button>
            <button class="card-action-btn fav-btn ${isFav ? 'fav-active' : ''}" data-word-id="${word.id}" title="Обране">
              ${isFav ? '❤️' : '🤍'}
            </button>
          </div>
          <div class="card-czech">${word.czech}</div>
          <div class="card-type">${word.type} ${genderLabel}</div>
          <div class="card-example-row">
            <span class="card-example">${word.example}</span>
            <button class="card-action-btn speak-example-btn" data-czech="${word.example}" title="Вимова прикладу">🔊</button>
          </div>
          <div class="card-box-indicator">${pips}</div>
        </div>
        <div class="card-right" data-revealed="false">
          <div class="card-answer-hidden">
            <div class="reveal-placeholder">?</div>
            <div class="reveal-hint">натисни щоб побачити</div>
          </div>
          <div class="card-answer-revealed">
            <div class="card-transcription">[${word.transcription}]</div>
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
    rightPanel.addEventListener('click', (e) => {
      if (e.target.closest('.review-btn')) return;
      rightPanel.dataset.revealed = 'true';
    });

    // Favorite toggle
    container.querySelector('.fav-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const added = Storage.toggleFavorite(word.id);
      const btn = e.currentTarget;
      btn.classList.toggle('fav-active', added);
      btn.textContent = added ? '❤️' : '🤍';
      showToast(added ? 'Додано до обраного' : 'Видалено з обраного');
      if (currentMode === 'favorites') {
        renderFlashcard();
        if (gridVisible) renderCards();
      }
    });

    // Speak buttons (word + example)
    container.querySelectorAll('.speak-btn, .speak-example-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Audio.speak(btn.dataset.czech);
      });
    });

    // Review buttons
    container.querySelector('.review-btn.correct').addEventListener('click', (e) => {
      e.stopPropagation();
      const result = SpacedRepetition.onCorrect(word.id);
      showToast(`✓ Коробка ${result.box} з 5`);
      renderFlashcard();
      if (gridVisible) renderCards();
    });

    container.querySelector('.review-btn.wrong').addEventListener('click', (e) => {
      e.stopPropagation();
      SpacedRepetition.onWrong(word.id);
      showToast('✗ Повернено до коробки 1');
      renderFlashcard();
      if (gridVisible) renderCards();
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
    const pct = total > 0 ? Math.round((learned / total) * 100) : 0;

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

    // Show all toggle
    document.getElementById('showAllBtn')?.addEventListener('click', () => {
      const grid = document.getElementById('cardGrid');
      const btn = document.getElementById('showAllBtn');
      if (!grid || !btn) return;
      gridVisible = !gridVisible;
      grid.classList.toggle('hidden', !gridVisible);
      btn.textContent = gridVisible ? '🔼 Сховати всі слова' : '📋 Показати всі слова';
      if (gridVisible) renderCards();
    });

    // Swipe gestures for flashcard area
    const flashArea = document.getElementById('flashcardArea');
    if (flashArea) {
      let touchStartX = 0;
      let touchStartY = 0;
      let touchEndX = 0;

      flashArea.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      }, { passive: true });

      flashArea.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        const diffX = touchStartX - touchEndX;
        const diffY = Math.abs(touchStartY - touchEndY);

        // Only swipe if horizontal movement > 50px and greater than vertical
        if (Math.abs(diffX) > 50 && Math.abs(diffX) > diffY) {
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
