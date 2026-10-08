/* TANGO-CHO2: cumulative foreground study time, started only by user input. */
(() => {
  'use strict';
  const KEY = 'tangoCho2ActiveStudyTime:v1';
  const IDLE_MS = 60000;
  let lastInput = -Infinity, cursor = performance.now(), pending = 0, lastWrite = cursor;
  const read = () => {
    try { const data = JSON.parse(localStorage.getItem(KEY) || '{}'); return Number.isFinite(data.totalMs) && data.totalMs >= 0 ? data.totalMs : 0; }
    catch (_) { return 0; }
  };
  const foreground = () => document.visibilityState === 'visible' && document.hasFocus() && !document.documentElement.hasAttribute('data-tc2-boot');
  const active = now => foreground() && now < lastInput + IDLE_MS;
  function tick() {
    const now = performance.now();
    // A suspended tab/system sleep must never be mistaken for study time.
    if (foreground() && now - cursor <= 5000) pending += Math.max(0, Math.min(now, lastInput + IDLE_MS) - cursor);
    cursor = now;
    if (pending && now - lastWrite >= 5000) flush();
    render();
  }
  function flush() {
    lastWrite = performance.now();
    if (!pending) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({totalMs:Math.round(read() + pending),updatedAt:new Date().toISOString()}));
      pending = 0;
    } catch (_) { /* Retain unsaved time and retry without interrupting study. */ }
  }
  function interact(event) {
    if (!event.isTrusted || !foreground()) return;
    if (event.target.closest?.('#connSettingsCard')) { pause(); return; }
    if (event.type === 'scroll' && !active(performance.now())) return;
    tick();
    lastInput = performance.now();
    render();
  }
  function pause() { tick(); flush(); lastInput = -Infinity; render(); }
  function format(ms) {
    const seconds = Math.floor(ms / 1000), hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds / 60) % 60;
    return `${hours ? `${hours}時間` : ''}${hours ? String(minutes).padStart(2,'0') : minutes}分${String(seconds % 60).padStart(2,'0')}秒`;
  }
  function render() {
    const hero = document.getElementById('tc2ProgressHero');
    if (!hero) return;
    let panel = document.getElementById('tc2StudyTime');
    if (!panel) {
      panel = document.createElement('div'); panel.id = 'tc2StudyTime';
      panel.style.cssText = 'position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line,#e6e0d7)';
      panel.title = '操作後に計測します。別の画面へ移った時間・1分以上操作のない時間は加算しません。';
      panel.innerHTML = '<div><span style="display:block;font-size:13px;color:var(--muted,#77736d)">累計学習時間</span><strong id="tc2StudyTotal" style="display:block;font-size:22px;margin-top:4px"></strong></div><span id="tc2StudyState" style="font-size:12px;color:var(--muted,#77736d)"></span>';
      hero.appendChild(panel);
    }
    const total = document.getElementById('tc2StudyTotal'), status = document.getElementById('tc2StudyState');
    const text = format(read() + pending), state = active(performance.now()) ? '計測中' : '停止中';
    if (total.textContent !== text) total.textContent = text;
    if (status.textContent !== state) status.textContent = state;
  }
  window.tc2FlushStudyTime = () => { tick(); flush(); };
  ['pointerdown','keydown','wheel','touchstart','scroll','input'].forEach(type => document.addEventListener(type,interact,{capture:true,passive:true}));
  document.addEventListener('visibilitychange', pause);
  window.addEventListener('blur', pause);
  window.addEventListener('pagehide', pause);
  window.addEventListener('pageshow', () => {cursor = performance.now();lastInput = -Infinity;render();});
  window.addEventListener('storage', event => {if(event.key === KEY)render();});
  const observer = new MutationObserver(() => {
    if (!document.getElementById('tc2ProgressHero')) return;
    render(); observer.disconnect();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(tick,1000);
})();
