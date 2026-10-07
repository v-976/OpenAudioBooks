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
 * No analytics, no telemetry, no usage reporting of any kind.
 */

export function registerServiceWorker(): void {
  if (import.meta.env.DEV) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  const register = () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed.', error);
    });
  };

  if (document.readyState === 'complete') {
    register();
    return;
  }
  globalThis.addEventListener('load', register, { once: true });
}
