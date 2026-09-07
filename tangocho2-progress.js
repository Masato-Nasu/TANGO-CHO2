/* TANGO-CHO2 — 5WORDS-style progress summary */
(() => {
  'use strict';

  const LESSON_PREFIX = 'tangoCho2DailyFiveWords:v1:';
  const LEVEL_KEY = 'tangoCho2FiveWordsLevel';
  const START_DATE_KEY = 'tangoCho2StudyStartDate';

  const LEVEL_LABELS = {
    jhs: '中学生',
    hs: '高校・大学受験',
    adult: '大人 / TOEIC 800+'
  };

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

  function addYears(dateKey, years) {
    const d = parseDate(dateKey);
    const month = d.getMonth();
    d.setFullYear(d.getFullYear() + years);
    // 2/29 -> 2/28 on non-leap target years.
    if (d.getMonth() !== month) d.setDate(0);
    return localDateKey(d);
  }

  function daysBetween(a, b) {
    return Math.max(0, Math.round((parseDate(b) - parseDate(a)) / 86400000));
  }

  function currentLevel() {
    const select = document.getElementById('tc2FiveLevel');
    if (select && LEVEL_LABELS[select.value]) return select.value;
    try {
      const saved = localStorage.getItem(LEVEL_KEY);
      if (saved && LEVEL_LABELS[saved]) return saved;
    } catch (_) {}
    return 'adult';
  }

  function currentLevelLabel() {
    return LEVEL_LABELS[currentLevel()] || LEVEL_LABELS.adult;
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

  function studyStartDate(history) {
    try {
      const saved = localStorage.getItem(START_DATE_KEY);
      if (/^\d{4}-\d{2}-\d{2}$/.test(saved || '')) return saved;
    } catch (_) {}

    const dates = Array.from(history.keys()).sort();
    if (!dates.length) return localDateKey();

    const start = dates[0];
    try { localStorage.setItem(START_DATE_KEY, start); } catch (_) {}
    return start;
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

    const startDate = studyStartDate(history);
    const goalDate = addYears(startDate, 3);

    return {
      learned: unique.size,
      stickers: history.size,
      startDate,
      goalDate,
      daysLeft: daysBetween(localDateKey(), goalDate)
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
    if (left) {
      left.textContent = c.daysLeft.toLocaleString();
      left.title = `開始 ${c.startDate} / ゴール ${c.goalDate}`;
    }
    if (phase) phase.textContent = currentLevelLabel();
  }

  function bindLevelSelector() {
    const select = document.getElementById('tc2FiveLevel');
    if (!select || select.dataset.tc2ProgressBound === '1') return;
    select.dataset.tc2ProgressBound = '1';
    select.addEventListener('change', () => setTimeout(update, 0));
  }

  function init() {
    update();
    bindLevelSelector();

    const fortune = document.getElementById('fortuneSection');
    if (fortune) {
      let timer = 0;
      new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          bindLevelSelector();
          update();
        }, 80);
      }).observe(fortune, { childList: true, subtree: true, characterData: true });
    }

    document.addEventListener('change', (event) => {
      if (event.target && event.target.id === 'tc2FiveLevel') setTimeout(update, 0);
    }, true);
    document.addEventListener('click', () => setTimeout(update, 500), true);
    window.addEventListener('storage', update);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
