/* TANGO-CHO2 — automatically register every newly generated 5 WORDS set once */
(() => {
  'use strict';

  const PREFIX = 'tangoCho2DailyFiveWords:v1:';
  const REGISTER_MARK_PREFIX = 'tangoCho2AutoRegistered:v2:';
  let busy = false;

  const normalize = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const nowIso = () => new Date().toISOString();

  function currentLessonInfo() {
    const level = document.getElementById('tc2FiveLevel')?.value || '';
    const dateText = document.getElementById('tc2FiveDate')?.textContent || '';
    const date = dateText.trim().replaceAll('/', '-');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !level) return null;
    try {
      const raw = localStorage.getItem(`${PREFIX}${date}:${level}`);
      if (!raw) return null;
      const lesson = JSON.parse(raw);
      if (!Array.isArray(lesson?.words) || lesson.words.length !== 5) return null;
      return { lesson, date, level };
    } catch (_) {
      return null;
    }
  }

  function lessonFingerprint(lesson) {
    return (lesson?.words || []).map(w => normalize(w?.word)).filter(Boolean).join('|');
  }

  function registrationMarkKey(date, level) {
    return `${REGISTER_MARK_PREFIX}${date}:${level}`;
  }

  async function registerLesson(lesson) {
    if (busy || !lesson || typeof loadWords !== 'function' || typeof saveWords !== 'function') return 0;
    busy = true;
    try {
      const all = loadWords() || [];
      const existing = new Set(all.map(x => normalize(x?.word)).filter(Boolean));
      const baseTime = Date.now();
      let added = 0;

      for (let i = 0; i < lesson.words.length; i++) {
        const item = lesson.words[i] || {};
        const word = String(item.word || '').trim();
        const key = normalize(word);
        if (!word || !key || existing.has(key)) continue;

        let posCandidates;
        try {
          if (typeof __inferPosCandidates === 'function') posCandidates = await __inferPosCandidates(word);
        } catch (_) {}

        all.push({
          id: `${baseTime + i}-5words-${Math.random().toString(36).slice(2, 8)}`,
          word,
          meaning: String(item.meaning || '').trim(),
          status: 'default',
          example: String(lesson.sentence || '').trim(),
          memo: String(item.note || '').trim(),
          tags: '5WORDS',
          synonyms: '',
          source: '5words-auto',
          createdAt: nowIso(),
          ...(Array.isArray(posCandidates) && posCandidates.length ? { posCandidates } : {})
        });
        existing.add(key);
        added++;
      }

      if (added > 0 && saveWords(all)) {
        try { if (typeof renderWordList === 'function') renderWordList(); } catch (_) {}
        try { document.dispatchEvent(new CustomEvent('tangocho2:auto-registered', { detail: { added } })); } catch (_) {}
      }
      markCardsRegistered(existing);
      return added;
    } finally {
      busy = false;
    }
  }

  function currentWordSet() {
    try {
      return new Set((loadWords() || []).map(x => normalize(x?.word)).filter(Boolean));
    } catch (_) {
      return new Set();
    }
  }

  function markCardsRegistered(existingSet) {
    const existing = existingSet || currentWordSet();
    document.querySelectorAll('#tc2FiveResult .tc2-word').forEach(card => {
      const word = normalize(card.querySelector('strong')?.textContent);
      const pick = card.querySelector('.tc2-pick');
      const isRegistered = !!word && existing.has(word);

      if (isRegistered) {
        card.dataset.registered = '1';
        if (pick && pick.textContent !== '単語帳に登録済み') pick.textContent = '単語帳に登録済み';
      } else {
        delete card.dataset.registered;
        if (pick && pick.textContent !== 'TANGO-CHOへ拾う →') pick.textContent = 'TANGO-CHOへ拾う →';
      }
    });
  }

  function updateStatus(lesson, added = null) {
    const status = document.getElementById('tc2FiveStatus');
    if (!status || !lesson) return;
    const existing = currentWordSet();
    const registeredCount = (lesson.words || []).filter(w => existing.has(normalize(w?.word))).length;

    if (added != null && added > 0) {
      status.textContent = `5語を単語帳へ自動登録しました（新規 ${added}語）。🔊で発音も確認できます。`;
    } else if (registeredCount === 5) {
      status.textContent = '5語はすべて単語帳に登録済みです。🔊で発音を確認できます。';
    } else {
      status.textContent = `単語帳には現在 ${registeredCount}/5語が登録されています。削除した語は自動では復活しません。`;
    }
  }

  async function syncFromVisibleLesson() {
    const info = currentLessonInfo();
    if (!info) return;

    const { lesson, date, level } = info;
    const fingerprint = lessonFingerprint(lesson);
    const markKey = registrationMarkKey(date, level);
    let alreadyAutoRegistered = false;
    try { alreadyAutoRegistered = localStorage.getItem(markKey) === fingerprint; } catch (_) {}

    if (!alreadyAutoRegistered) {
      const added = await registerLesson(lesson);
      try { localStorage.setItem(markKey, fingerprint); } catch (_) {}
      markCardsRegistered();
      updateStatus(lesson, added);
      return;
    }

    // This lesson was already auto-registered once. Respect later manual deletions.
    markCardsRegistered();
    updateStatus(lesson, null);
  }

  function refreshAfterPossibleDelete(ev) {
    const target = ev.target;
    if (!(target instanceof Element) || !target.closest('.delete-btn')) return;
    setTimeout(() => {
      const info = currentLessonInfo();
      markCardsRegistered();
      if (info) updateStatus(info.lesson, null);
    }, 120);
  }

  document.addEventListener('click', refreshAfterPossibleDelete, true);
  window.addEventListener('storage', () => {
    markCardsRegistered();
    const info = currentLessonInfo();
    if (info) updateStatus(info.lesson, null);
  });

  document.addEventListener('DOMContentLoaded', () => {
    const attach = () => {
      const root = document.getElementById('fortuneSection');
      if (!root) return false;
      let timer = 0;
      new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(syncFromVisibleLesson, 80);
      }).observe(root, { childList: true, subtree: true, characterData: true });
      setTimeout(syncFromVisibleLesson, 180);
      return true;
    };

    if (!attach()) {
      let tries = 0;
      const id = setInterval(() => {
        tries++;
        if (attach() || tries > 30) clearInterval(id);
      }, 100);
    }
  });
})();