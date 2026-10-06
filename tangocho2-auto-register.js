/* TANGO-CHO2 — show manual registration status; never write vocabulary. */
(() => {
  'use strict';
  const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

  let lastSignature = "";
  function refresh() {
    const result = document.getElementById('tc2FiveResult');
    if (!result || typeof loadWords !== 'function') return;
    const existing = new Set((loadWords() || []).map(item => normalize(item.word)));
    const cards = [...result.querySelectorAll('.tc2-word')];
    if (!cards.length) return;
    let registered = 0;
    cards.forEach(card => {
      const known = existing.has(normalize(card.querySelector('strong')?.textContent));
      if (known) { registered++; if (card.dataset.registered !== '1') card.dataset.registered = '1'; }
      else if (card.dataset.registered) delete card.dataset.registered;
      const pick = card.querySelector('.tc2-pick');
      const text = known ? '単語帳に登録済み' : '単語帳へ移す →';
      if (pick && pick.textContent !== text) pick.textContent = text;
    });
    const status = document.getElementById('tc2FiveStatus');
    // Keep generation progress/errors visible while a new set is being requested.
    if (!status || document.getElementById('tc2FiveGenerate')?.disabled) return;
    const signature = JSON.stringify([result.dataset.setId, cards.map(card => normalize(card.querySelector('strong')?.textContent)), registered]);
    if (signature === lastSignature) return;
    lastSignature = signature;
    const text = registered === cards.length ? 'すべて単語帳に登録済みです。' :
      '自動登録はしません。必要な語を選び、追加画面で「単語帳に保存」を押してください。';
    if (status.textContent !== text) status.textContent = text;
  }

  document.addEventListener('DOMContentLoaded', () => {
    let timer;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 80);
    });
    for (const id of ['fortuneSection', 'wordList']) {
      const section = document.getElementById(id);
      if (section) observer.observe(section, {childList:true,subtree:true,characterData:true});
    }
    document.querySelector('[data-section="fortuneSection"]')?.addEventListener('click', refresh);
    window.addEventListener('storage', refresh);
    setTimeout(refresh, 180);
  });
})();
