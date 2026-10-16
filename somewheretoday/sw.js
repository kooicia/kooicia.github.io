// Bump VERSION when shipping changes so phones pick up the new shell.
const VERSION = 'somewheretoday-v23';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'data.js', 'manifest.webmanifest', 'fonts/playfair-display-latin.woff2', 'fonts/montserrat-latin.woff2', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('somewheretoday-') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network-first for same-origin (fresh when online), cache fallback offline.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    // no-cache: always revalidate with the server so CSS/JS never mix versions after an update
    fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
