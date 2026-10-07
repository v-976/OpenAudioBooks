import 'fake-indexeddb/auto';

// jsdom implements neither media decoding nor the events that follow a real
// play(). These stubs emit the events the player listens for so that transport
// behaviour can be tested honestly without a network or an audio backend.
if (typeof window !== 'undefined' && typeof window.HTMLMediaElement !== 'undefined') {
  const proto = window.HTMLMediaElement.prototype;

  Object.defineProperty(proto, 'play', {
    configurable: true,
    value(this: HTMLMediaElement) {
      Object.defineProperty(this, 'paused', { configurable: true, value: false });
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    },
  });

  Object.defineProperty(proto, 'pause', {
    configurable: true,
    value(this: HTMLMediaElement) {
      if (this.paused) return;
      Object.defineProperty(this, 'paused', { configurable: true, value: true });
      this.dispatchEvent(new Event('pause'));
    },
  });

  Object.defineProperty(proto, 'load', {
    configurable: true,
    value: () => undefined,
  });
}
