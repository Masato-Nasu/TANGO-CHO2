/* TANGO-CHO2: five local backup generations; downloads and restoration are manual. */
(() => {
  'use strict';
  const DB_NAME = 'tangoCho2AutomaticBackups';
  const STORE = 'snapshots';
  const WORDS = 'tangoCho2Words';
  const PART5 = 'tangoCho2Part5Stats:v1';
  const STUDY = 'tangoCho2StudyHist';
  const tracked = new Set([WORDS, PART5, STUDY, 'tangoChoWords', 'tangoChoStudyHist']);
  let dbPromise, queue = Promise.resolve(), timer, suspended = false;
  const parse = (key, fallback) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  };
  function payload() {
    return {
      app: 'TANGO-CHO2', backupVersion: 1, version: '0.6.0', exportedAt: new Date().toISOString(),
      words: parse(WORDS, []),
      part5: parse(PART5, {words:{},sessions:[]}),
      studyHistory: parse(STUDY, [])
    };
  }
  function message(text) {
    const el = document.getElementById('tc2BackupStatus');
    if (el) el.textContent = text;
  }
  function openDb() {
    if (!dbPromise) dbPromise = new Promise((resolve,reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE,{keyPath:'id',autoIncrement:true});
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { dbPromise = null; reject(request.error); };
    });
    return dbPromise;
  }
  async function history() {
    const db = await openDb();
    return new Promise((resolve,reject) => {
      const req = db.transaction(STORE,'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result.reverse());
      req.onerror = () => reject(req.error);
    });
  }
  async function saveSnapshot(data) {
    const db = await openDb();
    const fingerprint = JSON.stringify({words:data.words,part5:data.part5,studyHistory:data.studyHistory});
    await new Promise((resolve,reject) => {
      const tx = db.transaction(STORE,'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result;
        if (all.at(-1)?.fingerprint === fingerprint) return;
        store.add({savedAt:data.exportedAt,payload:data,fingerprint});
        all.slice(0,Math.max(0,all.length-4)).forEach(item => store.delete(item.id));
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('バックアップを保存できませんでした。'));
    });
    await refreshHistory();
  }
  function enqueue(data) {
    queue = queue.then(() => saveSnapshot(data)).catch(() => {
      message('自動バックアップを保存できませんでした。JSONを書き出して退避してください。');
    });
    return queue;
  }
  function snapshotNow() {
    clearTimeout(timer);
    try { return enqueue(payload()); }
    catch (_) { message('自動バックアップのデータを読み取れませんでした。'); return Promise.resolve(); }
  }

  // Preserve a state before mutation and a settled state afterwards. No file download.
  for (const method of ['setItem','removeItem']) {
    const previous = Storage.prototype[method];
    Storage.prototype[method] = function(key, ...args) {
      const watch = this === window.localStorage && tracked.has(String(key)) && !suspended;
      let before;
      if (watch) { try { before = payload(); } catch (_) {} }
      const result = previous.call(this,key,...args);
      if (watch) {
        if (before) enqueue(before);
        clearTimeout(timer);
        timer = setTimeout(snapshotNow,800);
      }
      return result;
    };
  }

  async function refreshHistory() {
    const select = document.getElementById('tc2BackupHistory');
    if (!select) return;
    const selected = select.dataset.userSelected === '1' ? select.value : '';
    const items = await history();
    select.replaceChildren();
    for (const [index,item] of items.entries()) {
      const option = document.createElement('option');
      option.value = String(item.id);
      option.textContent = `${index === 0 ? '最新' : `${index}つ前`} · ${new Date(item.savedAt).toLocaleString('ja-JP')} · ${item.payload.words.length}語`;
      select.appendChild(option);
    }
    if (items.some(item => String(item.id) === selected)) select.value = selected;
    document.getElementById('tc2BackupRestore').disabled = items.length === 0;
    message(`直近${items.length}世代を端末内に保存しています（最大5世代）。`);
  }

  function validate(data) {
    const words = Array.isArray(data) ? data : data?.words;
    if (!Array.isArray(words)) throw new Error('単語帳のJSON形式を確認してください。');
    const cleaned = sanitizeImportedWords(words);
    if (cleaned.length !== words.length) throw new Error('読み込めない単語が含まれています。JSON形式を確認してください。');
    const result = {words:cleaned};
    if (!Array.isArray(data) && Object.hasOwn(data,'part5')) {
      const stats = data.part5;
      if (!stats || typeof stats !== 'object' || !stats.words || typeof stats.words !== 'object' || Array.isArray(stats.words) || !Array.isArray(stats.sessions)) throw new Error('PART 5の成績形式が正しくありません。');
      for (const w of Object.values(stats.words)) {
        if (!w || typeof w.word !== 'string' || !Number.isInteger(w.attempts) || w.attempts < 1 || !Number.isInteger(w.correct) || w.correct < 0 || w.correct > w.attempts || !Number.isFinite(w.ms) || w.ms < 0) throw new Error('PART 5の成績形式が正しくありません。');
      }
      result.part5 = stats;
    }
    if (!Array.isArray(data) && Object.hasOwn(data,'studyHistory')) {
      if (!Array.isArray(data.studyHistory) || !data.studyHistory.every(x => x === 0 || x === 1)) throw new Error('クイズの履歴形式が正しくありません。');
      result.studyHistory = data.studyHistory.slice(-80);
    }
    return result;
  }
  async function restore(data) {
    const incoming = validate(data);
    const text = `単語帳を${incoming.words.length}語に復元します。${incoming.part5 ? 'PART 5の成績も復元します。' : 'PART 5の成績は変更しません。'}現在のデータは自動バックアップに退避します。よろしいですか？`;
    if (!confirm(text)) return;
    // Ensure the current state really exists in history before replacing it.
    clearTimeout(timer);
    await queue;
    await saveSnapshot(payload());
    const changes = [[WORDS,JSON.stringify(incoming.words)]];
    if (incoming.part5) changes.push([PART5,JSON.stringify(incoming.part5)]);
    if (incoming.studyHistory) changes.push([STUDY,JSON.stringify(incoming.studyHistory)]);
    const previous = changes.map(([key]) => [key,localStorage.getItem(key)]);
    suspended = true;
    clearTimeout(timer);
    try {
      for (const [key,value] of changes) localStorage.setItem(key,value);
    } catch (e) {
      for (const [key,value] of previous) {
        try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key,value); } catch (_) {}
      }
      throw new Error('復元できませんでした。元のデータとバックアップを保持しています。');
    } finally { suspended = false; }
    await snapshotNow();
    location.reload();
  }

  document.addEventListener('click', ev => {
    if (!(ev.target instanceof Element) || !ev.target.closest('#exportJsonBtn')) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    try {
      downloadJson('tangocho2-backup.json',payload());
      message('JSONを書き出しました。単語帳と成績を含み、APIキーは含みません。');
    } catch (_) { message('JSONを書き出せませんでした。'); }
  },true);
  document.addEventListener('change', async ev => {
    if (ev.target?.id !== 'importJsonInput') return;
    ev.stopImmediatePropagation();
    const file = ev.target.files?.[0];
    if (!file) return;
    try { await restore(JSON.parse(await file.text())); }
    catch (e) { message(e.message || 'JSONを読み込めませんでした。'); }
    finally { ev.target.value = ''; }
  },true);
  window.addEventListener('pagehide',snapshotNow);
  window.addEventListener('storage',ev => { if (tracked.has(ev.key)) snapshotNow(); });
  document.addEventListener('DOMContentLoaded',() => {
    const exportButton = document.getElementById('exportJsonBtn');
    const importButton = document.getElementById('importJsonBtn');
    if (!exportButton || !importButton) return;
    exportButton.textContent = 'JSONを書き出す';
    importButton.textContent = 'JSONを読み込む';
    const panel = document.createElement('div');
    panel.innerHTML = '<label class="field-label" for="tc2BackupHistory">自動バックアップ（端末内・直近5世代）</label><select id="tc2BackupHistory" class="select" aria-label="復元するバックアップ"></select><div class="field-row" style="margin-top:10px"><button id="tc2BackupRestore" class="secondary-btn" type="button" disabled>選んだ世代を復元</button></div><p id="tc2BackupStatus" class="note" role="status"></p>';
    exportButton.parentElement.insertAdjacentElement('afterend',panel);
    document.getElementById('tc2BackupHistory').addEventListener('change', ev => { ev.target.dataset.userSelected = '1'; });
    document.getElementById('tc2BackupRestore').addEventListener('click',async () => {
      try {
        const id = Number(document.getElementById('tc2BackupHistory').value);
        const chosen = (await history()).find(x => x.id === id);
        if (!chosen) throw new Error('バックアップを選んでください。');
        await restore(chosen.payload);
      } catch (e) { message(e.message || '復元できませんでした。'); }
    });
    snapshotNow();
  });
})();
