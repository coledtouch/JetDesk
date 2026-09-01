'use strict';
const V = 'jetdesk-v7baf7151';
const CORE = ["/", "/index.html", "/manifest.webmanifest", "/favicon.ico", "/icons/apple-touch-icon.09d1f2b9.png", "/icons/icon-192.8e9e2ce0.png", "/icons/icon-512.cb13850d.png", "/icons/icon-maskable-192.a558baef.png", "/icons/icon-maskable-512.d531912e.png", "/fonts/7bff3d0619.woff2", "/fonts/81401990b6.woff2", "/fonts/c7a2859da8.woff2", "/fonts/fa6806bbfd.woff2", "/img/hero-blue-hour.a3a1bd3d-800.webp", "/img/hero-blue-hour.a3a1bd3d.webp"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
function networkFirst(req, fallbackURL) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; fromCache(); } }, 2500);
    const fromCache = () =>
      caches.match(req).then((r) => r || caches.match(fallbackURL)).then((r) => resolve(r || Response.error()));
    fetch(req).then((res) => {
      clearTimeout(timer);
      if (done) return;
      done = true;
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(V).then((c) => c.put(fallbackURL, copy));
      }
      resolve(res);
    }).catch(() => { clearTimeout(timer); if (!done) { done = true; fromCache(); } });
  });
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return; /* live data: network only */
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, '/index.html'));
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(V).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
