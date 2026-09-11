/* HARD FIVE : service worker
   App shell cached under a versioned name; skipWaiting + clients.claim so a new deploy takes over on the next open.
   Same-origin files and the two Google Fonts stylesheets: network first (fresh when online), cache when not.
   Font files and the Firebase SDK modules: network first with cache fallback, kept in the same cache.
   Everything else (Firestore traffic, gstatic auth iframes): straight to the network, untouched. */
const VERSION = 'hardfive-v1';
const SHELL = [
  './', './index.html', './app.css', './app.js', './deck.js', './state.js', './days.js', './config.js',
  './sync/local.js', './sync/fake.js', './sync/firestore.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon-180.png',
  'https://fonts.googleapis.com/css2?family=Allerta+Stencil&display=swap',
  'https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.all(SHELL.map(async url => { try { await cache.add(new Request(url, { cache: 'reload' })); } catch (e) { /* a missing file must not block install */ } }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function cacheable(url) {
  if (url.origin === self.location.origin) return true;
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return true;
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) return true;
  return false;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!cacheable(url)) return;
  // a navigation with query flags (?t=, ?sync=) is still the one shell
  const key = req.mode === 'navigate' ? './index.html' : req;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const res = await fetchWithTimeout(req, 4000);
      if (res && (res.ok || res.type === 'opaque')) cache.put(key, res.clone()).catch(() => {});
      return res;
    } catch (e) {
      const hit = await cache.match(key, { ignoreSearch: req.mode === 'navigate' });
      if (hit) return hit;
      if (req.mode === 'navigate') { const shell = await cache.match('./index.html'); if (shell) return shell; }
      throw e;
    }
  })());
});

function fetchWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then(r => { clearTimeout(t); resolve(r); }, e => { clearTimeout(t); reject(e); });
  });
}
