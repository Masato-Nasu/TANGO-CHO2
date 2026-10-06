/* TANGO-CHO2 — 5 WORDS discovery tab
 * Reuses TANGO-CHO's existing BYOK OpenAI client and Add flow.
 */
(() => {
  'use strict';

  function loadTangoCho2Extras() {
    try {
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) themeMeta.setAttribute('content', '#fffaf2');

      if (!document.querySelector('link[data-tc2-theme]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = './tangocho2-theme.css?v=0.3.0';
        link.dataset.tc2Theme = '1';
        document.head.appendChild(link);
      }

      [
        './tangocho2-example-sync.js?v=0.3.0',
        './tangocho2-behavior.js?v=0.3.1',
        './tangocho2-progress.js?v=0.5.0'
      ].forEach(src => {
        if (document.querySelector(`script[data-tc2-extra="${src}"]`)) return;
        const script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.dataset.tc2Extra = src;
        document.head.appendChild(script);
      });
    } catch (_) {}
  }

  loadTangoCho2Extras();

  const LESSON_PREFIX = 'tangoCho2FiveWordsSet:v2:';
  const LATEST_PREFIX = 'tangoCho2FiveWordsLatest:v2:';
  const LEVEL_KEY = 'tangoCho2FiveWordsLevel';

  const levelGuidance = {
    jhs: 'Japanese junior-high learner level. Prefer high-frequency, broadly useful words, but do not choose words that are too elementary.',
    hs: 'Japanese high-school to university-entrance level. Prefer useful reading vocabulary, abstract words, and common academic vocabulary.',
    adult: 'Advanced adult Japanese learner / TOEIC 800+ level. Prefer useful but not obscure words seen in journalism, business, essays, and general nonfiction.'
  };

  const esc = (s = '') => String(s).replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));



  function getPreferredLevel() {
    const saved = localStorage.getItem(LEVEL_KEY);
    if (saved && levelGuidance[saved]) return saved;
    try {
      if (typeof getAiLevel === 'function') {
        const current = getAiLevel();
        if (levelGuidance[current]) return current;
      }
    } catch (_) {}
    return 'adult';
  }

  function savedLesson(level) {
    try {
      const id = localStorage.getItem(`${LATEST_PREFIX}${level}`);
      if (id) {
        const lesson = JSON.parse(localStorage.getItem(`${LESSON_PREFIX}${id}`));
        if (isValidLesson(lesson)) return lesson;
      }
      // Restore the latest old set once, retaining its original registration mark.
      const keys = Object.keys(localStorage).filter(k => k.startsWith('tangoCho2DailyFiveWords:v1:') && k.endsWith(`:${level}`)).sort().reverse();
      for (const key of keys) {
        const lesson = JSON.parse(localStorage.getItem(key));
        if (!isValidLesson(lesson)) continue;
        lesson.legacyDate = key.slice('tangoCho2DailyFiveWords:v1:'.length, -level.length - 1);
        saveLesson(level, lesson, `legacy-${lesson.legacyDate}-${level}`);
        return lesson;
      }
    } catch (_) {}
    return null;
  }

  function saveLesson(level, lesson, id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`) {
    lesson.setId = id;
    lesson.level = level;
    lesson.generatedAt = lesson.generatedAt || new Date().toISOString();
    localStorage.setItem(`${LESSON_PREFIX}${id}`, JSON.stringify(lesson));
    localStorage.setItem(`${LATEST_PREFIX}${level}`, id);
  }

  function isValidLesson(x) {
    return !!x && Array.isArray(x.words) && x.words.length === 5 &&
      x.words.every(w => w && typeof w.word === 'string' && typeof w.meaning === 'string') &&
      typeof x.sentence === 'string' && typeof x.translation === 'string';
  }

  function currentVocabulary() {
    try {
      if (typeof loadWords !== 'function') return [];
      return loadWords()
        .map(x => String(x?.word || '').trim())
        .filter(Boolean);
    } catch (_) {
      return [];
    }
  }

  async function generateLesson(level) {
    if (typeof callOpenAiJson !== 'function') {
      throw new Error('AI機能を読み込めませんでした。');
    }

    const existing = [...new Set(currentVocabulary().map(w => w.toLowerCase()))];
    const avoid = existing.slice(-3000).join(', ') || '(none)';

    const instruction = [
      'You create a five-word English vocabulary discovery set for a Japanese learner.',
      'Return only valid JSON with no markdown.',
      'Choose exactly five distinct English words that are genuinely useful at the requested level.',
      'Do not choose obscure specialist jargon, proper nouns, abbreviations, or inflected duplicates of the same base word.',
      'Avoid every word in the provided existing-vocabulary list whenever possible.',
      'Then write ONE natural grammatical English sentence that uses all five target words in their normal senses.',
      'Do not force awkward collocations.',
      'Japanese meanings and notes must be concise and practical.',
      'Return exactly this shape: {"words":[{"word":"...","pos":"...","meaning":"...","note":"..."}],"sentence":"...","translation":"..."}.'
    ].join(' ');

    const input = [
      `Level: ${level}`,
      `Level guidance: ${levelGuidance[level]}`,
      `Existing vocabulary to avoid: ${avoid}`
    ].join('\n');

    const result = await callOpenAiJson({ instruction, input, maxOutputTokens: 1200 });
    if (!isValidLesson(result)) throw new Error('5語のデータ形式が正しくありませんでした。もう一度お試しください。');

    result.words = result.words.map(w => ({
      word: String(w.word || '').trim(),
      pos: String(w.pos || '').trim(),
      meaning: String(w.meaning || '').trim(),
      note: String(w.note || '').trim()
    }));
    result.sentence = String(result.sentence || '').trim();
    result.translation = String(result.translation || '').trim();
    return result;
  }

  function pickIntoTangoCho(item, lesson) {
    try {
      if (typeof sendWordToAdd === 'function') sendWordToAdd(item.word);
      else throw new Error('追加画面へ送れませんでした。');

      requestAnimationFrame(() => {
        const meaning = document.getElementById('meaning');
        const memo = document.getElementById('memo');
        const example = document.getElementById('example');
        const tags = document.getElementById('tags');
        const status = document.getElementById('status');

        if (status) status.value = 'default';
        if (meaning && !meaning.value.trim()) meaning.value = item.meaning || '';
        if (memo && !memo.value.trim()) memo.value = item.note || '';
        if (example && !example.value.trim()) example.value = lesson.sentence || '';
        if (tags) {
          const vals = tags.value.split(',').map(x => x.trim()).filter(Boolean);
          if (!vals.some(x => x.toLowerCase() === '5words')) vals.push('5WORDS');
          tags.value = vals.join(', ');
        }
      });
    } catch (e) {
      alert(e?.message || '単語を追加画面へ送れませんでした。');
    }
  }

  function renderLesson(root, lesson) {
    const registered = new Set(currentVocabulary().map(w => w.toLowerCase()));

    root.innerHTML = `
      <div class="tc2-fivewords-card">
        <div class="tc2-eyebrow">5 WORDS</div>
        <div class="tc2-word-grid">
          ${lesson.words.map((w, i) => {
            const isRegistered = registered.has(w.word.toLowerCase());
            return `
              <button class="tc2-word" type="button" data-index="${i}" ${isRegistered ? 'data-registered="1"' : ''}>
                <span class="tc2-word-top"><strong>${esc(w.word)}</strong><span>${esc(w.pos)}</span></span>
                <span class="tc2-meaning">${esc(w.meaning)}</span>
                <span class="tc2-note">${esc(w.note)}</span>
                <span class="tc2-pick">${isRegistered ? '登録済み' : '単語帳へ移す →'}</span>
              </button>`;
          }).join('')}
        </div>
      </div>

      <div class="tc2-fivewords-card">
        <div class="tc2-eyebrow">ONE SENTENCE</div>
        <div class="tc2-sentence">${esc(lesson.sentence)}</div>
        <div class="tc2-translation">${esc(lesson.translation)}</div>
      </div>`;

    root.querySelectorAll('.tc2-word').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.registered === '1') return;
        const item = lesson.words[Number(btn.dataset.index)];
        if (item) pickIntoTangoCho(item, lesson);
      });
    });
  }

  function installStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #fortuneSection .tc2-fivewords-card{background:var(--card-bg,#111);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:16px;margin-bottom:14px}
      #fortuneSection .tc2-fivewords-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;flex-wrap:wrap}
      #fortuneSection .tc2-title{margin:0;font-size:1.45rem;letter-spacing:.02em}
      #fortuneSection .tc2-sub{opacity:.7;font-size:.88rem;line-height:1.5;margin-top:4px}
      #fortuneSection .tc2-controls{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-top:14px}
      #fortuneSection .tc2-controls label{min-width:150px;flex:1}
      #fortuneSection .tc2-controls .field-label{display:block;margin-bottom:6px}
      #fortuneSection .tc2-eyebrow{font-size:.72rem;letter-spacing:.16em;opacity:.58;margin-bottom:12px}
      #fortuneSection .tc2-word-grid{display:grid;grid-template-columns:repeat(1,minmax(0,1fr));gap:9px}
      #fortuneSection .tc2-word{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.1);border-radius:13px;padding:13px;background:rgba(255,255,255,.035);color:inherit;cursor:pointer}
      #fortuneSection .tc2-word:hover{border-color:rgba(0,200,150,.6)}
      #fortuneSection .tc2-word[data-registered="1"]{opacity:.58}
      #fortuneSection .tc2-word-top{display:flex;justify-content:space-between;gap:10px;align-items:baseline}
      #fortuneSection .tc2-word-top strong{font-size:1.22rem}
      #fortuneSection .tc2-word-top span{font-size:.76rem;opacity:.6}
      #fortuneSection .tc2-meaning{display:block;margin-top:4px;font-weight:600}
      #fortuneSection .tc2-note{display:block;margin-top:5px;font-size:.84rem;opacity:.7;line-height:1.45}
      #fortuneSection .tc2-pick{display:block;margin-top:9px;font-size:.78rem;color:#00c896}
      #fortuneSection .tc2-sentence{font-size:1.08rem;line-height:1.75;font-weight:600}
      #fortuneSection .tc2-translation{margin-top:10px;line-height:1.65;opacity:.72}
      #fortuneSection .tc2-status{min-height:1.4em;margin-top:10px;font-size:.86rem;opacity:.75}
      @media(min-width:720px){#fortuneSection .tc2-word-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);
  }

  function installFiveWordsTab() {
    const section = document.getElementById('fortuneSection');
    if (!section) return;

    const tab = document.querySelector('.tab-button[data-section="fortuneSection"]');
    if (tab) tab.textContent = '5 WORDS';

    section.innerHTML = `
      <div class="tc2-fivewords-head">
        <div>
          <h2 class="tc2-title">5 WORDS × TANGO-CHO2</h2>
          <div class="tc2-sub">好きなときに5語と1つの英文を生成。5語は単語帳へ自動登録します。</div>
        </div>
      </div>

      <div class="tc2-fivewords-card">
        <div class="tc2-controls">
          <label>
            <span class="field-label">English level</span>
            <select id="tc2FiveLevel" class="select">
              <option value="jhs">中学生向き</option>
              <option value="hs">高校・大学受験</option>
              <option value="adult">大人 / TOEIC 800+</option>
            </select>
          </label>
          <button id="tc2FiveGenerate" class="primary-btn" type="button">5語を生成</button>
        </div>
        <div class="tc2-sub">すでにTANGO-CHO2にある単語はAIに避けさせます。回数制限はありません。生成セットは端末に保存されます。</div>
        <div id="tc2FiveStatus" class="tc2-status" aria-live="polite"></div>
      </div>

      <div id="tc2FiveResult"></div>`;

    const levelEl = document.getElementById('tc2FiveLevel');
    const btn = document.getElementById('tc2FiveGenerate');
    const status = document.getElementById('tc2FiveStatus');
    const result = document.getElementById('tc2FiveResult');

    levelEl.value = getPreferredLevel();

    const showCached = () => {
      const lesson = savedLesson(levelEl.value);
      result.innerHTML = '';
      delete result.dataset.setId;
      if (lesson) {
        result.dataset.setId = lesson.setId;
        renderLesson(result, lesson);
        btn.textContent = '5語を再生成';
        status.textContent = '前回生成した5語を表示しています。';
        return true;
      }
      btn.textContent = '5語を生成';
      status.textContent = '';
      return false;
    };

    levelEl.addEventListener('change', () => {
      localStorage.setItem(LEVEL_KEY, levelEl.value);
      showCached();
    });

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      levelEl.disabled = true;
      const hadCache = !!savedLesson(levelEl.value);
      btn.textContent = '5語を考えています…';
      status.textContent = hadCache ? '新しい5語を選んでいます。' : '既登録語を避けながら選んでいます。';
      try {
        const lesson = await generateLesson(levelEl.value);
        saveLesson(levelEl.value, lesson);
        result.dataset.setId = lesson.setId;
        renderLesson(result, lesson);
        btn.textContent = '5語を再生成';
        status.textContent = '🔊で発音を確認してから、必要な語を選び、追加画面で「単語帳に保存」を押してください。';
      } catch (e) {
        console.error(e);
        status.textContent = e?.message || '生成に失敗しました。';
        btn.textContent = hadCache ? '5語を再生成' : '5語を生成';
      } finally {
        btn.disabled = false;
        levelEl.disabled = false;
      }
    });

    showCached();
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      installStyles();
      installFiveWordsTab();
    }, 0);
  });
})();
