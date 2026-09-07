/* TANGO-CHO2 behavior refinements
 * - New/saved words use the default status
 * - Prevent duplicate word registration (case-insensitive)
 * - Add pronunciation controls to 5 WORDS before registration
 */
(() => {
  'use strict';

  const normalize = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  function words() {
    try {
      return typeof loadWords === 'function' ? (loadWords() || []) : [];
    } catch (_) {
      return [];
    }
  }

  function setMessage(text, kind = '') {
    const el = document.getElementById('msg');
    if (!el) return;
    el.textContent = text;
    el.className = `msg${kind ? ` ${kind}` : ''}`;
  }

  function editingOriginalWord() {
    const banner = document.getElementById('editBanner');
    const sub = document.getElementById('editSub');
    if (!banner || banner.style.display === 'none') return '';
    const text = String(sub?.textContent || '');
    return normalize(text.replace(/\s*を編集中\s*$/, ''));
  }

  function forceDefaultStatus() {
    const status = document.getElementById('status');
    if (status) status.value = 'default';
  }

  function duplicateForCurrentWord() {
    const current = normalize(document.getElementById('word')?.value);
    if (!current) return false;

    const original = editingOriginalWord();
    return words().some(item => {
      const existing = normalize(item?.word);
      if (!existing || existing !== current) return false;
      return !(original && original === current);
    });
  }

  function chooseEnglishVoice() {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    return voices.find(v => /^en-GB$/i.test(v.lang)) ||
      voices.find(v => /^en-US$/i.test(v.lang)) ||
      voices.find(v => /^en/i.test(v.lang)) || null;
  }

  function speakWord(word) {
    const text = String(word || '').trim();
    if (!text || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.88;
      const voice = chooseEnglishVoice();
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  }

  function addFiveWordsSpeaker(card) {
    if (!(card instanceof Element) || card.querySelector('.tc2-speak')) return;
    const top = card.querySelector('.tc2-word-top');
    const word = String(top?.querySelector('strong')?.textContent || '').trim();
    if (!top || !word) return;

    const speaker = document.createElement('span');
    speaker.className = 'tc2-speak';
    speaker.setAttribute('role', 'button');
    speaker.setAttribute('tabindex', '0');
    speaker.setAttribute('aria-label', `${word} の発音を聞く`);
    speaker.setAttribute('title', '登録前に発音を聞く');
    speaker.dataset.word = word;
    speaker.textContent = '🔊';
    top.appendChild(speaker);
  }

  function enhanceFiveWords(root = document) {
    root.querySelectorAll?.('.tc2-word').forEach(addFiveWordsSpeaker);
  }

  function simplifyAddUi() {
    forceDefaultStatus();
    const status = document.getElementById('status');
    if (status) {
      const wrap = status.parentElement;
      if (wrap) {
        wrap.style.display = 'none';
        const grid = wrap.parentElement;
        if (grid?.classList.contains('two-col')) grid.style.gridTemplateColumns = '1fr';
      }
    }
  }

  document.addEventListener('click', (ev) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;

    const speaker = target.closest('.tc2-speak');
    if (speaker) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      speakWord(speaker.dataset.word || speaker.closest('.tc2-word')?.querySelector('strong')?.textContent || '');
      return;
    }

    const fiveCard = target.closest('.tc2-word[data-registered="1"]');
    if (fiveCard) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      return;
    }

    const save = target.closest('#saveBtn');
    if (save) {
      forceDefaultStatus();
      if (duplicateForCurrentWord()) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        setMessage('この単語はすでに登録されています。重複登録はしません。', 'err');
      }
    }
  }, true);

  document.addEventListener('keydown', (ev) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;
    const speaker = target.closest('.tc2-speak');
    if (speaker && (ev.key === 'Enter' || ev.key === ' ')) {
      ev.preventDefault();
      speakWord(speaker.dataset.word || '');
    }
  });

  function init() {
    simplifyAddUi();
    enhanceFiveWords();
    const observer = new MutationObserver(() => enhanceFiveWords());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
