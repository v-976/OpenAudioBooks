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

const SCOPE_URL = new URL(self.registration.scope);
const CACHE_PREFIX = `openaudiobooks-shell-${encodeURIComponent(SCOPE_URL.pathname)}-`;
const CACHE_VERSION = `${CACHE_PREFIX}v5`;
const SHELL_INDEX = new URL('index.html', SCOPE_URL).href;
const SHELL_URLS = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png']
  .map((path) => new URL(path, SCOPE_URL).href);

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
        Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION)
          .map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  // Supported control messages.
  if (event.data === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports?.[0]?.postMessage({ version: CACHE_VERSION });
  }
});

// Notify all clients when a new version is ready to activate.
self.addEventListener('install', () => {
  self.addEventListener('activate', () => {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION }));
    });
  });
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // All audiobook audio and provider traffic goes directly to the network.
  if (url.origin !== SCOPE_URL.origin || !url.pathname.startsWith(SCOPE_URL.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Pages serves the SPA's 404.html on deep links. Never replace the
          // cached shell with a 404 response or another failed navigation.
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_VERSION).then((cache) => cache.put(SHELL_INDEX, copy));
          }
          return response;
        })
        .catch(() => caches.open(CACHE_VERSION).then((cache) => cache.match(SHELL_INDEX))),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_VERSION).then((cache) => cache.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            void cache.put(request, copy);
          }
          return response;
        })
        .catch(() => cached);
    })),
  );
});
