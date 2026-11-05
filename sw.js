// Simple offline cache for the app shell and static data.
const CACHE = 'swf-v3';
const SHELL = [
  './', 'index.html', 'css/styles.css',
  'js/app.js', 'js/store.js', 'js/i18n.js', 'js/config.js', 'js/games/prashn.js', 'js/games/shatru.js', 'js/games/shatru-core.js', 'js/games/charan.js', 'js/games/charan-engine.js', 'js/games/charan-levels.js', 'js/games/charan-quiz.js', 'js/games/memory.js', 'data/charan.json',
  'data/menu.json', 'data/prashn.json', 'icons/icon.svg', 'manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network-first for same-origin files (so updates show up), cache as fallback when offline.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('index.html'))),
  );
});
