/**
 * sw.js — makes the shell load offline. Deliberately small and deliberately
 * NOT caching Firebase traffic: Firestore has its own IndexedDB offline cache
 * (see store.js), and this worker would only get in its way. This worker's
 * job is just "the app opens even with no signal", not "the data is here".
 *
 * CACHE_VERSION: bump this string whenever you change a cached file, so
 * returning visitors actually get the update instead of a stale copy.
 */
const CACHE_VERSION = 'lc-shell-v1';

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/config.js',
  './js/store.js',
  './js/search.js',
  './js/taxonomy.js',
  './vendor/firebase-app.js',
  './vendor/firebase-auth.js',
  './vendor/firebase-firestore.js',
  './vendor/minisearch.js',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle our own same-origin shell files. Everything else (Firestore,
  // Google auth, Google Fonts) goes straight to the network, untouched.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((resp) => {
          if (resp && resp.ok) {
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, resp.clone()));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
