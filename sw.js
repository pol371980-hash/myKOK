const CACHE = 'ekok-v2';
const STATIC_ASSETS = ['./icon-192.png', './icon-512.png', './manifest.json'];

// Εγκατάσταση: cache μόνο τα static assets (εικονίδια, manifest)
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

// Ενεργοποίηση: διαγραφή παλιών caches
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // Network-first για το index.html:
  // Πάντα παίρνει την τελευταία έκδοση από το GitHub Pages όταν υπάρχει σύνδεση.
  // Αν είναι offline, σερβίρει από cache.
  if (req.destination === 'document' || url.pathname.endsWith('.html') ||
      url.pathname.endsWith('/') || url.pathname === '') {
    e.respondWith(
      fetch(req)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first για static assets (εικονίδια κτλ.)
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE).then(c => c.put(req, clone));
      return resp;
    }))
  );
});
