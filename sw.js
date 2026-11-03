// Lux : la derniere version quand il y a du reseau, sinon la copie gardee sur l'appareil. Et les rappels.
const CACHE = 'lux-v4';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'index.html', 'style.css?v=4', 'phrase.js?v=4', 'app.js?v=4', 'fond-libellules.jpg', 'manifest.webmanifest', 'icone-192.png', 'icone-512.png'])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((n) => Promise.all(n.filter((x) => x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok && new URL(e.request.url).origin === location.origin) { const copie = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copie)); }
    return r;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match('./'))));
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
