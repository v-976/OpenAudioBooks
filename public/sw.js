/**
 * OpenAudioBooks service worker — Alpha 0.1.0
 *
 * Scope of this worker, deliberately minimal:
 *  - precache the application shell so the installed PWA opens offline;
 *  - serve same-origin static assets cache-first;
 *  - serve navigations from cache, falling back to the cached shell;
 *  - pass every cross-origin request straight through to the network.
 *
 * What it deliberately does NOT do:
 *  - cache, intercept, proxy or rewrite third-party audio streams;
 *  - cache provider API responses (provider adapters own that policy);
 *  - collect, store or transmit any usage, telemetry or analytics data.
 */

const CACHE_VERSION = 'openaudiobooks-shell-v1';
const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  // Only supported control message: skip waiting for an update.
  if (event.data === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // All audiobook audio and provider traffic goes directly to the network.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE_VERSION).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached ?? caches.match('/'))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            void caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    }),
  );
});
