/* TANGO-CHO2 — 5WORDS-style progress summary */
(() => {
  'use strict';

  const START = '2026-08-09';
  const GOAL = '2028-09-30';
  const LESSON_PREFIX = 'tangoCho2DailyFiveWords:v1:';

  function localDateKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function parseDate(k) {
    const [y,m,d] = String(k).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  function daysBetween(a, b) {
    return Math.max(0, Math.round((parseDate(b) - parseDate(a)) / 86400000));
  }

  function phaseFor(k) {
    if (k < '2027-04-01') return '高1 基礎';
    if (k < '2028-04-01') return '高2 標準';
    return '高3 実戦';
  }

  function validLesson(raw) {
    try {
      const x = JSON.parse(raw);
      return x && Array.isArray(x.words) && x.words.length === 5 ? x : null;
    } catch (_) {
      return null;
    }
  }

  function lessonHistory() {
    const byDate = new Map();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(LESSON_PREFIX)) continue;
        const rest = key.slice(LESSON_PREFIX.length);
        const date = rest.slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        const lesson = validLesson(localStorage.getItem(key));
        if (lesson) byDate.set(date, lesson);
      }
    } catch (_) {}
    return byDate;
  }

  function counts() {
    const history = lessonHistory();
    const unique = new Set();
    history.forEach(lesson => {
      (lesson.words || []).forEach(w => {
        const word = String(w?.word || '').trim().toLowerCase();
        if (word) unique.add(word);
      });
    });
    return {
      learned: unique.size,
      stickers: history.size,
      daysLeft: daysBetween(localDateKey(), GOAL)
    };
  }

  function ensureUi() {
    const header = document.querySelector('.app-header');
    const nav = document.querySelector('.tab-bar');
    if (!header || !nav) return false;

    if (!document.getElementById('tc2PhasePill')) {
      const pill = document.createElement('div');
      pill.id = 'tc2PhasePill';
      pill.className = 'pill tc2-phase-pill';
      header.appendChild(pill);
    }

    if (!document.getElementById('tc2ProgressHero')) {
      const hero = document.createElement('div');
      hero.id = 'tc2ProgressHero';
      hero.className = 'tc2-progress-hero';
      hero.innerHTML = `
        <div class="tc2-progress-eyebrow">TODAY'S SMALL STEP</div>
        <h2>今日も、5語だけ。</h2>
        <p>毎日の5語を積み重ねて、自分の単語帳を育てていきます。</p>
        <div class="tc2-progress-stats">
          <div class="tc2-progress-stat"><b id="tc2LearnedCount">0</b><span>覚えた新出語</span></div>
          <div class="tc2-progress-stat"><b id="tc2StickerCount">0</b><span>シール</span></div>
          <div class="tc2-progress-stat"><b id="tc2DaysLeft">—</b><span>ゴールまで</span></div>
        </div>`;
      nav.parentNode.insertBefore(hero, nav);
    }
    return true;
  }

  function update() {
    if (!ensureUi()) return;
    const c = counts();
    const learned = document.getElementById('tc2LearnedCount');
    const stickers = document.getElementById('tc2StickerCount');
    const left = document.getElementById('tc2DaysLeft');
    const phase = document.getElementById('tc2PhasePill');
    if (learned) learned.textContent = c.learned.toLocaleString();
    if (stickers) stickers.textContent = c.stickers.toLocaleString();
    if (left) left.textContent = c.daysLeft.toLocaleString();
    if (phase) phase.textContent = phaseFor(localDateKey());
  }

  document.addEventListener('DOMContentLoaded', () => {
    update();
    const fortune = document.getElementById('fortuneSection');
    if (fortune) {
      let timer = 0;
      new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(update, 80);
      }).observe(fortune, { childList: true, subtree: true, characterData: true });
    }
    document.addEventListener('click', () => setTimeout(update, 500), true);
    window.addEventListener('storage', update);
  });
})();
