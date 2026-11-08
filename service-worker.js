/* TANGO-CHO2 Service Worker */
const CACHE_PREFIX = 'tango-cho2-cache-';
const CACHE_NAME = `${CACHE_PREFIX}v0.42.5`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./bank_enja.js",
  "./vocab_pool.js",
  "./style.css?v=48.0.3",
  "./tangocho2-theme.css?v=0.3.0",
  "./tangocho2-layout-fix.css?v=0.7.1",
  "./tangocho2-storage-shim.js?v=0.2.0",
  "./script.js?v=48.0.11",
  "./api-response-fix.js?v=48.0.8",
  "./tangocho2-example-sync.js?v=0.4.0",
  "./tangocho2-behavior.js?v=0.3.1",
  "./tangocho2-grammar.js?v=0.1.1",
  "./tangocho2-commute.js?v=0.9.3",
  "./tangocho2-notifications.js?v=0.4.1",
  "./tangocho2-word-tap.js?v=0.2.2",
  "./tangocho2-study-time.js?v=0.2.0",
  "./tangocho2-backup.js?v=0.13.0",
  "./tangocho2-spelling.js?v=0.7.1",
  "./manifest.json",
  "./share-target.html",
  "./icons/tangocho2-cute.svg?v=0.4.0",
  "./icons/icon-192-v27.png",
  "./icons/icon-512-v27.png",
  "./icons/icon-maskable-v27.png",
  "./icons/apple-touch-icon-v27.png",
  "./data/pos_noun.txt",
  "./data/pos_verb.txt",
  "./data/pos_adj.txt",
  "./data/pos_adv.txt",
  "./data/WORDNET_LICENSE.txt"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
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
  if (url.origin !== self.location.origin) return;

  const accept = event.request.headers.get("accept") || "";
  const isNav = event.request.mode === "navigate" || accept.includes("text/html");
  const isAppCode = url.origin === self.location.origin && /\.(?:js|css|json|svg)$/.test(url.pathname);

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

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

// Web Push wakes this worker even when no application window is open.
self.addEventListener('push', event => {
  event.waitUntil(self.registration.showNotification('TANGO-CHO2', {
    body:'TOEIC練習の時間です。読解・Part 5・語彙を少しずつ。',
    icon:new URL('./icons/icon-192-v27.png',self.registration.scope).href,
    badge:new URL('./icons/icon-192-v27.png',self.registration.scope).href,
    tag:'tc2-commute',
    data:{url:new URL('./#commute',self.registration.scope).href}
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target=new URL('./#commute',self.registration.scope).href;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if(client.url.startsWith(self.registration.scope)){
        await client.navigate(target);await client.focus();return;
      }
    }
    await self.clients.openWindow(target);
  })());
});