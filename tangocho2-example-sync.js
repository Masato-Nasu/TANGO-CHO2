/* TANGO-CHO2 — shared example sentence sync
 * The first generated example for a word becomes its canonical example.
 * 5 WORDS picks and AI Assist both reuse that same sentence afterwards.
 */
(() => {
  'use strict';

  const PREFIX = 'tangoCho2CanonicalExample:v1:';

  function normalizeWord(word) {
    return String(word || '').trim().toLowerCase();
  }

  function keyFor(word) {
    const w = normalizeWord(word);
    return w ? `${PREFIX}${encodeURIComponent(w)}` : '';
  }

  function readCanonical(word) {
    const key = keyFor(word);
    if (!key) return '';
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.example === 'string') return parsed.example.trim();
      return '';
    } catch (_) {
      return '';
    }
  }

  function rememberCanonical(word, example, source) {
    const key = keyFor(word);
    const text = String(example || '').trim();
    if (!key || !text) return '';

    const existing = readCanonical(word);
    if (existing) return existing;

    try {
      localStorage.setItem(key, JSON.stringify({
        example: text,
        source: String(source || 'unknown'),
        savedAt: new Date().toISOString()
      }));
    } catch (_) {}
    return text;
  }

  function currentWord() {
    return String(document.getElementById('word')?.value || '').trim();
  }

  function exampleField() {
    return document.getElementById('example');
  }

  function syncFiveWordsPick(button) {
    const word = String(button.querySelector('strong')?.textContent || '').trim();
    const sentence = String(document.querySelector('#tc2FiveResult .tc2-sentence')?.textContent || '').trim();
    if (!word || !sentence) return;

    // First source wins. If AI Assist already created a canonical sentence,
    // keep it; otherwise this 5 WORDS sentence becomes canonical.
    const canonical = readCanonical(word) || rememberCanonical(word, sentence, '5WORDS');

    // TANGO-CHO2's normal 5 WORDS click handler runs after this capture handler
    // and moves to the Add tab. Apply the canonical sentence just after that.
    requestAnimationFrame(() => {
      const field = exampleField();
      const selected = currentWord();
      if (!field || normalizeWord(selected) !== normalizeWord(word)) return;
      field.value = canonical;
      const ja = document.getElementById('exampleTranslation');
      if (ja) ja.value = canonical === sentence ? String(document.querySelector('#tc2FiveResult .tc2-translation')?.textContent || '').trim() : '';
    });
  }

  function syncAiAssist() {
    const word = currentWord();
    const field = exampleField();
    if (!word || !field) return;

    const canonical = readCanonical(word);
    if (canonical && !field.value.trim()) {
      // Pre-fill before TANGO-CHO's existing AI Assist handler runs.
      // The core handler only fills blank fields, so it leaves this sentence intact.
      field.value = canonical;
      return;
    }

    // No canonical example yet. Let the existing AI Assist create one,
    // then remember exactly what appeared in the Example field.
    const started = Date.now();
    const watch = () => {
      const nowWord = currentWord();
      const nowField = exampleField();
      if (normalizeWord(nowWord) !== normalizeWord(word) || !nowField) return;

      const text = String(nowField.value || '').trim();
      if (text) {
        rememberCanonical(word, text, 'AI_ASSIST');
        return;
      }
      if (Date.now() - started < 60000) setTimeout(watch, 250);
    };
    setTimeout(watch, 250);
  }

  // Capture phase is intentional: it lets us establish/reuse the canonical
  // example before the existing button handlers run.
  document.addEventListener('click', (ev) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;

    const fiveWordButton = target.closest('.tc2-word');
    if (fiveWordButton) {
      syncFiveWordsPick(fiveWordButton);
      return;
    }

    const assistButton = target.closest('#aiAssistBtn');
    if (assistButton) syncAiAssist();
  }, true);
})();
