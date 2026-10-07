import { DEFAULT_PREFERENCES, type Preferences } from '../domain/types';

/**
 * Small, non-identifying playback preferences.
 *
 * These live in localStorage because they are a handful of scalars, are needed
 * synchronously before first paint, and carry no personal data. Anything
 * structured or sizeable belongs in IndexedDB instead.
 */

const STORAGE_KEY = 'openaudiobooks.preferences.v1';

function clampRate(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PREFERENCES.playbackRate;
  return Math.min(3, Math.max(0.5, Math.round(value * 100) / 100));
}

function clampSkip(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(120, Math.max(5, Math.round(value)));
}

export function normalizePreferences(raw: unknown): Preferences {
  const input = (raw ?? {}) as Partial<Preferences>;
  return {
    playbackRate: clampRate(input.playbackRate ?? DEFAULT_PREFERENCES.playbackRate),
    skipForwardSeconds: clampSkip(
      input.skipForwardSeconds ?? DEFAULT_PREFERENCES.skipForwardSeconds,
      DEFAULT_PREFERENCES.skipForwardSeconds,
    ),
    skipBackwardSeconds: clampSkip(
      input.skipBackwardSeconds ?? DEFAULT_PREFERENCES.skipBackwardSeconds,
      DEFAULT_PREFERENCES.skipBackwardSeconds,
    ),
    ...(input.lastAudioEditionId ? { lastAudioEditionId: input.lastAudioEditionId } : {}),
  };
}

export function loadPreferences(): Preferences {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_PREFERENCES };
    return normalizePreferences(JSON.parse(stored));
  } catch {
    // Private-mode or corrupted values must never break startup.
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(preferences: Preferences): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(normalizePreferences(preferences)));
  } catch {
    // Storage unavailable: preferences simply do not persist this session.
  }
}
