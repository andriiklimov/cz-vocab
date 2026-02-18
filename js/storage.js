/**
 * storage.js — localStorage wrapper for user progress
 */
const Storage = (() => {
  const KEYS = {
    PROGRESS: 'czvocab_progress',
    FAVORITES: 'czvocab_favorites',
    THEME: 'czvocab_theme',
    STREAK: 'czvocab_streak',
  };

  function _get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('localStorage write failed', e);
    }
  }

  /* ---------- Progress (Leitner boxes) ---------- */

  /**
   * Returns progress map: { wordId: { box: 1-5, nextReview: ISO string } }
   */
  function getProgress() {
    return _get(KEYS.PROGRESS) || {};
  }

  function getWordProgress(wordId) {
    const all = getProgress();
    return all[wordId] || { box: 1, nextReview: new Date().toISOString() };
  }

  function setWordProgress(wordId, data) {
    const all = getProgress();
    all[wordId] = data;
    _set(KEYS.PROGRESS, all);
  }

  function resetProgress() {
    _set(KEYS.PROGRESS, {});
  }

  /* ---------- Favorites ---------- */

  function getFavorites() {
    return _get(KEYS.FAVORITES) || [];
  }

  function toggleFavorite(wordId) {
    const favs = getFavorites();
    const idx = favs.indexOf(wordId);
    if (idx === -1) {
      favs.push(wordId);
    } else {
      favs.splice(idx, 1);
    }
    _set(KEYS.FAVORITES, favs);
    return idx === -1; // returns true if added
  }

  function isFavorite(wordId) {
    return getFavorites().includes(wordId);
  }

  /* ---------- Theme ---------- */

  function getTheme() {
    const saved = _get(KEYS.THEME);
    if (saved) return saved;
    // Auto-detect: device preference or time-based
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    const hour = new Date().getHours();
    return (hour >= 20 || hour < 7) ? 'dark' : 'light';
  }

  function setTheme(theme) {
    _set(KEYS.THEME, theme);
  }

  /* ---------- Streak ---------- */

  function getStreak() {
    return _get(KEYS.STREAK) || { count: 0, lastDate: null };
  }

  function updateStreak() {
    const streak = getStreak();
    const today = new Date().toISOString().slice(0, 10);

    if (streak.lastDate === today) return streak;

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (streak.lastDate === yesterday) {
      streak.count += 1;
    } else {
      streak.count = 1;
    }
    streak.lastDate = today;
    _set(KEYS.STREAK, streak);
    return streak;
  }

  return {
    getProgress,
    getWordProgress,
    setWordProgress,
    resetProgress,
    getTheme,
    setTheme,
    getStreak,
    updateStreak,
  };
})();
