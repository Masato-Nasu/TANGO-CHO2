/* TANGO-CHO2 storage shim
 * Keeps the original TANGO-CHO data untouched while letting TANGO-CHO2
 * start from a one-time copy of the existing vocabulary/state.
 * OpenAI BYOK settings are intentionally shared.
 */
(() => {
  'use strict';

  const sharedKeys = new Set([
    'tangoChoOpenAiApiKey',
    'tangoChoOpenAiModel',
    'tangoChoAiLevel'
  ]);

  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;

  const mappedKey = (key) => {
    const k = String(key);
    if (k.startsWith('tangoCho2')) return k;
    if (sharedKeys.has(k)) return k;
    if (k.startsWith('tangoCho')) return `tangoCho2${k.slice('tangoCho'.length)}`;
    return k;
  };

  // One-time copy from TANGO-CHO to TANGO-CHO2 before remapping starts.
  try {
    const ls = window.localStorage;
    const sourceKeys = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k.startsWith('tangoCho') && !k.startsWith('tangoCho2') && !sharedKeys.has(k)) {
        sourceKeys.push(k);
      }
    }
    for (const source of sourceKeys) {
      const target = mappedKey(source);
      if (originalGetItem.call(ls, target) == null) {
        const value = originalGetItem.call(ls, source);
        if (value != null) originalSetItem.call(ls, target, value);
      }
    }
  } catch (_) {}

  Storage.prototype.getItem = function(key) {
    return originalGetItem.call(this, this === window.localStorage ? mappedKey(key) : key);
  };

  Storage.prototype.setItem = function(key, value) {
    return originalSetItem.call(this, this === window.localStorage ? mappedKey(key) : key, value);
  };

  Storage.prototype.removeItem = function(key) {
    return originalRemoveItem.call(this, this === window.localStorage ? mappedKey(key) : key);
  };

  // Load TANGO-CHO2-only behavior without modifying the original TANGO-CHO core.
  // The example-sync module makes 5 WORDS and AI Assist share one canonical
  // example sentence per word.
  try {
    const syncScript = document.createElement('script');
    syncScript.src = './tangocho2-example-sync.js?v=0.4.0';
    syncScript.async = false;
    document.head.appendChild(syncScript);
  } catch (_) {}
})();
