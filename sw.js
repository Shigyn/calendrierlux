// Lux : la copie gardee sur l'appareil tout de suite, pour une ouverture instantanee, et la mise a jour en coulisses. Et les rappels.
const CACHE = 'lux-v5';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'index.html', 'style.css?v=5', 'phrase.js?v=5', 'app.js?v=5', 'fond-libellules.jpg', 'manifest.webmanifest', 'icone-192.png', 'icone-512.png'])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((n) => Promise.all(n.filter((x) => x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  const gardable = u.origin === location.origin || /(^|\.)(googleapis|gstatic)\.com$/.test(u.hostname);
  if (!gardable) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }).then((garde) => {
    const frais = fetch(e.request).then((r) => {
      if (r.ok) { const copie = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copie)); }
      return r;
    }).catch(() => garde || caches.match('./'));
    if (garde) { e.waitUntil(frais.catch(() => {})); return garde; }
    return frais;
  }));
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { /* message illisible : on affiche quand meme */ }
  e.waitUntil(self.registration.showNotification(d.titre || 'Lux', {
    body: d.corps || '',
    icon: 'icone-192.png',
    badge: 'icone-192.png',
    data: { jour: d.jour || '' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const jour = (e.notification.data || {}).jour;
  const url = new URL(jour ? './?jour=' + jour : './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fen) => {
    if (fen.length) return fen[0].navigate(url).then((c) => (c || fen[0]).focus()).catch(() => self.clients.openWindow(url));
    return self.clients.openWindow(url);
  }));
});
