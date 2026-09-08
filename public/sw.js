// v2: the old fetch handler cached every GET response under one shared
// CACHE_NAME and fell back to `caches.match()` on ANY network hiccup — a
// cache miss there resolves to `undefined`, which respondWith() can't turn
// into a Response, so a transient network blip (common on mobile) showed as
// a blank/looping "Loading…" page instead of just retrying. nginx already
// sets the right cache headers (immutable hashed assets, no-cache
// index.html), so this SW no longer duplicates that — it exists only so the
// app stays installable as a PWA.
const CACHE_NAME = 'dynamiccrop-v2';

// Activate - drop every cache left by older versions of this worker.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// No fetch handler — requests pass straight through to the network, exactly
// as they would with no service worker installed.
