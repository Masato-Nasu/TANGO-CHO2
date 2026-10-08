/* TANGO-CHO2: five local backup generations; downloads and restoration are manual. */
(() => {
  'use strict';
  const DB_NAME = 'tangoCho2AutomaticBackups';
  const STORE = 'snapshots';
  const WORDS = 'tangoCho2Words';
  const PART5 = 'tangoCho2Part5Stats:v1';
  const STUDY = 'tangoCho2StudyHist';
  const TIME = 'tangoCho2ActiveStudyTime:v1';
  let dbPromise, queue = Promise.resolve();
  const parse = (key, fallback) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  };
  function payload() {
    window.tc2FlushStudyTime?.();
    return {
      app: 'TANGO-CHO2', backupVersion: 1, version: '0.12.0', exportedAt: new Date().toISOString(),
      words: parse(WORDS, []),
      part5: parse(PART5, {words:{},sessions:[]}),
      studyHistory: parse(STUDY, []),
      studyTime: parse(TIME, {totalMs:0})
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
  async function saveSnapshot(data, refreshTimestamp = false) {
    const db = await openDb();
    const fingerprint = JSON.stringify({words:data.words,part5:data.part5,studyHistory:data.studyHistory,studyTime:data.studyTime});
    await new Promise((resolve,reject) => {
      const tx = db.transaction(STORE,'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result;
        const latest = all.at(-1);
        if (latest?.fingerprint === fingerprint) {
          if (refreshTimestamp) store.put({...latest,savedAt:data.exportedAt,payload:data});
          return;
        }
        store.add({savedAt:data.exportedAt,payload:data,fingerprint});
        all.slice(0,Math.max(0,all.length-4)).forEach(item => store.delete(item.id));
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('バックアップを保存できませんでした。'));
    });
    await refreshHistory();
  }
  function enqueue(data, refreshTimestamp = false) {
    queue = queue.then(() => saveSnapshot(data,refreshTimestamp)).catch(() => {
      message('自動バックアップを保存できませんでした。JSONを書き出して退避してください。');
    });
    return queue;
  }
  function snapshotNow(refreshTimestamp = false) {
    try { return enqueue(payload(),refreshTimestamp); }
    catch (_) { message('自動バックアップのデータを読み取れませんでした。'); return Promise.resolve(); }
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
    message(`アプリを開いたときに1回更新します。端末内に直近${items.length}世代を保存しています（最大5世代）。`);
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
    if (!Array.isArray(data) && Object.hasOwn(data,'studyTime')) {
      if (!data.studyTime || !Number.isFinite(data.studyTime.totalMs) || data.studyTime.totalMs < 0) throw new Error('学習時間の形式が正しくありません。');
      result.studyTime = {totalMs:Math.round(data.studyTime.totalMs)};
    }
    return result;
  }
  async function restore(data, correctSpelling = false) {
    const incoming = validate(data);
    const corrections = new Map();
    if (correctSpelling && typeof window.tc2CorrectSpelling === 'function') {
      for (const item of incoming.words) {
        const original = item.word;
        const result = await window.tc2CorrectSpelling(original);
        if (result.value !== original) {
          item.word = result.value;
          corrections.set(original, result.value);
        }
      }
      // Keep past results attached to the corrected spelling and combine collisions.
      if (corrections.size) {
        if (!incoming.part5) incoming.part5 = parse(PART5, {words:{},sessions:[]});
        const normalized = s => s.trim().toLowerCase().replace(/\s+/g,' ');
        const names = new Map([...corrections].map(([a,b])=>[normalized(a),b]));
        const stats = structuredClone(incoming.part5);
        const words = Object.create(null);
        for (const record of Object.values(stats.words)) {
          record.word = names.get(normalized(record.word)) || record.word;
          const key = normalized(record.word);
          if (words[key]) {
            words[key].attempts += record.attempts;
            words[key].correct += record.correct;
            words[key].ms += record.ms;
            if (String(record.lastAnsweredAt || '') > String(words[key].lastAnsweredAt || '')) words[key].lastAnsweredAt = record.lastAnsweredAt;
          } else words[key] = record;
        }
        stats.words = words;
        for (const session of stats.sessions) {
          if (Array.isArray(session.results)) for (const result of session.results) {
            if (typeof result.word === 'string') result.word = names.get(normalized(result.word)) || result.word;
          }
        }
        incoming.part5 = stats;
      }
    }
    const correctionText = corrections.size ? `スペル修正（${corrections.size}語）：\n${[...corrections].map(([a,b])=>`${a} → ${b}`).join('\n')}` : '';
    if (correctionText) message(correctionText);

    const text = `単語帳を${incoming.words.length}語に復元します。${incoming.part5 ? 'PART 5の成績も復元します。' : 'PART 5の成績は変更しません。'}${incoming.studyTime ? '累計学習時間も復元します。' : ''}現在のデータは自動バックアップに退避します。よろしいですか？`;
    if (!confirm(text + (correctionText ? '\n\n'+correctionText : ''))) return;
    // Ensure the current state really exists in history before replacing it.
    await queue;
    await saveSnapshot(payload());
    const changes = [[WORDS,JSON.stringify(incoming.words)]];
    if (incoming.part5) changes.push([PART5,JSON.stringify(incoming.part5)]);
    if (incoming.studyHistory) changes.push([STUDY,JSON.stringify(incoming.studyHistory)]);
    if (incoming.studyTime) changes.push([TIME,JSON.stringify(incoming.studyTime)]);
    const previous = changes.map(([key]) => [key,localStorage.getItem(key)]);
    try {
      for (const [key,value] of changes) localStorage.setItem(key,value);
    } catch (e) {
      for (const [key,value] of previous) {
        try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key,value); } catch (_) {}
      }
      throw new Error('復元できませんでした。元のデータとバックアップを保持しています。');
    }
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
    try { await restore(JSON.parse(await file.text()), true); }
    catch (e) { message(e.message || 'JSONを読み込めませんでした。'); }
    finally { ev.target.value = ''; }
  },true);
  // Initial pageshow also follows DOMContentLoaded; only BFCache returns need a new snapshot.
  window.addEventListener('pageshow',ev => { if (ev.persisted) snapshotNow(true); });
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
    snapshotNow(true);
  });
})();
