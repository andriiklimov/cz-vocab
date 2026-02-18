/**
 * spaced-repetition.js — Leitner 5-box system
 *
 * Box 1: review every day
 * Box 2: every 2 days
 * Box 3: every 5 days
 * Box 4: every 14 days
 * Box 5: every 30 days (learned)
 */
const SpacedRepetition = (() => {
  const BOX_INTERVALS = {
    1: 1,   // 1 day
    2: 2,   // 2 days
    3: 5,   // 5 days
    4: 14,  // 14 days
    5: 30,  // 30 days
  };

  const MAX_BOX = 5;

  /**
   * Get the next review date based on the box number
   */
  function getNextReview(box) {
    const days = BOX_INTERVALS[box] || 1;
    const next = new Date();
    next.setDate(next.getDate() + days);
    next.setHours(0, 0, 0, 0);
    return next.toISOString();
  }

  /**
   * Process a correct answer: move card to next box
   */
  function onCorrect(wordId) {
    const progress = Storage.getWordProgress(wordId);
    const newBox = Math.min(progress.box + 1, MAX_BOX);
    const data = {
      box: newBox,
      nextReview: getNextReview(newBox),
    };
    Storage.setWordProgress(wordId, data);
    Storage.updateStreak();
    return data;
  }

  /**
   * Process a wrong answer: move card back to box 1
   */
  function onWrong(wordId) {
    const data = {
      box: 1,
      nextReview: getNextReview(1),
    };
    Storage.setWordProgress(wordId, data);
    return data;
  }

  /**
   * Check if a word is due for review today
   */
  function isDueToday(wordId) {
    const progress = Storage.getWordProgress(wordId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reviewDate = new Date(progress.nextReview);
    reviewDate.setHours(0, 0, 0, 0);
    return reviewDate <= today;
  }

  /**
   * Get count of words due today from a word list
   */
  function getDueCount(words) {
    return words.filter(w => isDueToday(w.id)).length;
  }

  /**
   * Get words due today
   */
  function getDueWords(words) {
    return words.filter(w => isDueToday(w.id));
  }

  /**
   * Get current box for a word
   */
  function getBox(wordId) {
    return Storage.getWordProgress(wordId).box;
  }

  /**
   * Get count of learned words (box 5)
   */
  function getLearnedCount(words) {
    return words.filter(w => Storage.getWordProgress(w.id).box >= MAX_BOX).length;
  }

  /**
   * Get weighted progress percentage across all boxes (0-100)
   * Each box contributes proportionally: box 1 = 0%, box 2 = 25%, ..., box 5 = 100%
   */
  function getProgressPercent(words) {
    if (words.length === 0) return 0;
    const total = words.reduce((sum, w) => {
      const box = Storage.getWordProgress(w.id).box;
      return sum + ((box - 1) / (MAX_BOX - 1));
    }, 0);
    return Math.round((total / words.length) * 100);
  }

  return {
    onCorrect,
    onWrong,
    isDueToday,
    getDueCount,
    getDueWords,
    getBox,
    getLearnedCount,
    getProgressPercent,
    MAX_BOX,
    BOX_INTERVALS,
  };
})();
