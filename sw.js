// Offline-Speicher für die Atem-App. Bei Änderungen die Versionsnummer erhöhen.
const CACHE = 'atem-v2';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FILES.map(f =>
        fetch(f, { cache: 'reload' }).then(r => { if (r.ok && !r.redirected) return c.put(f, r); }).catch(() => {})
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Sofort aus dem Speicher antworten (funktioniert offline), im Hintergrund aktualisieren
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  const isPage = req.mode === 'navigate';

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = isPage
      ? (await cache.match('./index.html')) || (await cache.match('./'))
      : await cache.match(req, { ignoreSearch: true });

    const update = fetch(req).then(res => {
      if (res.ok && !res.redirected) cache.put(isPage ? './index.html' : req, res.clone());
      return res;
    }).catch(() => null);

    if (cached) { e.waitUntil(update); return cached; }
    const fresh = await update;
    return fresh || new Response('Offline – bitte einmal mit Internet öffnen.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
