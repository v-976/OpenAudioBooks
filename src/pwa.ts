/**
 * Service worker registration.
 *
 * Strategy (see public/sw.js):
 *  - application shell precached at install time;
 *  - navigations served from cache with a network fallback;
 *  - static assets served cache-first;
 *  - everything cross-origin (all audiobook audio, and all provider APIs) is
 *    left alone. The worker never caches, proxies or rewrites remote audio.
 *
 * Update behaviour: when a new service worker activates, existing clients are
 * notified via a `message` event. The UI may show an "update available" prompt;
 * until the user accepts, the old shell continues to work from cache.
 *
 * No analytics, no telemetry, no usage reporting of any kind.
 */

type SwUpdateCallback = (version: string) => void;

const updateCallbacks = new Set<SwUpdateCallback>();

/** Subscribe to service worker update notifications. Returns an unsubscribe function. */
export function onServiceWorkerUpdate(callback: SwUpdateCallback): () => void {
  updateCallbacks.add(callback);
  return () => updateCallbacks.delete(callback);
}

export function registerServiceWorker(): void {
  if (import.meta.env.DEV) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Listen for messages from the service worker (update notifications).
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'SW_UPDATED') {
            const version = event.data.version ?? 'unknown';
            updateCallbacks.forEach((callback) => callback(version));
          }
        });

        // Check for updates periodically (every hour) when the page is visible.
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              // New worker is ready; it will send SW_UPDATED message.
            }
          });
        });

        // Periodic update check, only when visible to avoid background fetches.
        let updateTimer: ReturnType<typeof setInterval> | undefined;
        const startUpdateCheck = () => {
          if (updateTimer) return;
          updateTimer = setInterval(() => {
            if (document.visibilityState === 'visible') {
              void registration.update();
            }
          }, 60 * 60 * 1000); // Every hour
        };
        const stopUpdateCheck = () => {
          if (updateTimer) {
            clearInterval(updateTimer);
            updateTimer = undefined;
          }
        };
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            startUpdateCheck();
            void registration.update();
          } else {
            stopUpdateCheck();
          }
        });
        startUpdateCheck();
      })
      .catch((error) => {
        console.warn('Service worker registration failed.', error);
      });
  };

  if (document.readyState === 'complete') {
    register();
    return;
  }
  globalThis.addEventListener('load', register, { once: true });
}
