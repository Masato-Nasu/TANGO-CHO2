/* TANGO-CHO2 Service Worker */
const CACHE_PREFIX = 'tango-cho2-cache-';
const CACHE_NAME = `${CACHE_PREFIX}v0.4.0`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./bank_enja.js",
  "./vocab_pool.js",
  "./style.css?v=48.0.3",
  "./tangocho2-theme.css?v=0.3.0",
  "./tangocho2-layout-fix.css?v=0.4.0",
  "./tangocho2-storage-shim.js?v=0.1.0",
  "./script.js?v=48.0.3",
  "./api-response-fix.js?v=48.0.4",
  "./tangocho2-fivewords.js?v=0.4.0",
  "./tangocho2-auto-register.js?v=0.4.0",
  "./tangocho2-example-sync.js?v=0.3.0",
  "./tangocho2-behavior.js?v=0.3.0",
  "./tangocho2-progress.js?v=0.3.0",
  "./manifest.json",
  "./share-target.html",
  "./icons/tangocho2-cute.svg?v=0.4.0",
  "./icons/icon-192-v26.png",
  "./icons/icon-512-v26.png",
  "./icons/apple-touch-icon-v26.png",
  "./data/pos_noun.txt",
  "./data/pos_verb.txt",
  "./data/pos_adj.txt",
  "./data/pos_adv.txt",
  "./data/WORDNET_LICENSE.txt"
];

const EXTERNAL_ASSETS = [
  "https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    for (const url of EXTERNAL_ASSETS) {
      try { await cache.add(url); } catch (_) {}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isExternalAllowed = EXTERNAL_ASSETS.includes(url.href);
  if (url.origin !== self.location.origin && !isExternalAllowed) return;

  const accept = event.request.headers.get("accept") || "";
  const isNav = event.request.mode === "navigate" || accept.includes("text/html");
  const isAppCode = url.origin === self.location.origin && /\.(?:js|css|json|svg)$/.test(url.pathname);

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    if (isExternalAllowed) {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const fresh = await fetch(event.request);
        if (fresh && fresh.ok) cache.put(event.request, fresh.clone());
        return fresh;
      } catch (_) {
        return cached || Response.error();
      }
    }

    if (isNav) {
      try {
        const fresh = await fetch(event.request, { cache: "no-store" });
        if (fresh && fresh.ok) cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (_) {
        return (await cache.match("./index.html")) || Response.error();
      }
    }

    if (isAppCode) {
      try {
        const fresh = await fetch(event.request, { cache: "no-store" });
        if (fresh && fresh.ok) cache.put(event.request, fresh.clone());
        return fresh;
      } catch (_) {
        return (await cache.match(event.request)) || Response.error();
      }
    }

    const cached = await cache.match(event.request);
    if (cached) return cached;

    try {
      const fresh = await fetch(event.request);
      if (fresh && fresh.ok) cache.put(event.request, fresh.clone());
      return fresh;
    } catch (_) {
      return Response.error();
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
