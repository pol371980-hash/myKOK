// ═══════════════════════════════════════════════════
// e-ΚΟΚ Service Worker
// Στρατηγική: network-first για το HTML (πάντα η τελευταία έκδοση όταν
// υπάρχει ίντερνετ), cache-first για εικονίδια/manifest.
// Αλλάζεις το CACHE όταν θέλεις να καθαρίσουν τα παλιά caches.
// ═══════════════════════════════════════════════════
const CACHE = 'ekok-v3';
const PRECACHE = [
  './',
  './index.html',
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

// Εγκατάσταση: προ-αποθήκευση των βασικών αρχείων ώστε να δουλεύει offline
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // addAll αποτυγχάνει ολόκληρο αν λείψει ένα αρχείο — τα βάζουμε ένα-ένα
      Promise.all(PRECACHE.map(u =>
        c.add(new Request(u, { cache: 'reload' })).catch(() => null)
      ))
    )
  );
  self.skipWaiting();
});

// Ενεργοποίηση: διαγραφή παλιών caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;   // μόνο δικά μας αρχεία

  const isDoc = req.mode === 'navigate' ||
                req.destination === 'document' ||
                url.pathname.endsWith('.html') ||
                url.pathname.endsWith('/');

  if (isDoc) {
    // NETWORK-FIRST: με ίντερνετ παίρνει πάντα τη φρέσκια έκδοση από το GitHub Pages
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put('./index.html', clone));
          return resp;
        })
        .catch(() =>
          caches.match(req).then(r => r || caches.match('./index.html'))
        )
    );
    return;
  }

  // CACHE-FIRST για στατικά (εικονίδια, manifest)
  e.respondWith(
    caches.match(req).then(r =>
      r || fetch(req).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(req, clone));
        return resp;
      })
    )
  );
});
