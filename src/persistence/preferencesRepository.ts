import { normalizeLanguageList } from '../domain/language';
import { DEFAULT_PREFERENCES, type Preferences } from '../domain/types';
import { resolveUiLocale } from '../i18n';

/**
 * Small, non-identifying preferences.
 *
 * These live in localStorage because they are a handful of scalars, are needed
 * synchronously before first paint, and carry no personal data. Anything
 * structured or sizeable belongs in IndexedDB instead.
 *
 * Data impact, Alpha 0.1.0 → 0.1.1:
 *  - `uiLocale` and `preferredAudioLanguages` were added to the stored shape.
 *  - The storage key is unchanged, so 0.1.0 records keep working.
 *  - Records missing either field are filled with defaults at read time; a
 *    corrupt or unrecognised value is replaced rather than trusted.
 *  - Nothing previously stored is deleted, and playback state in IndexedDB is
 *    untouched: the localStorage preferences store is NOT part of the IndexedDB
 *    schema, so no IndexedDB migration and no DB version bump are required.
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
    // Alpha 0.1.1 added uiLocale and preferredAudioLanguages. Values written by
    // 0.1.0 have neither field, so both fall back to the shipped defaults; no
    // existing key is rewritten or discarded.
    uiLocale: resolveUiLocale(input.uiLocale),
    // An empty array is a legitimate stored value meaning "no language
    // restriction", so only a non-array is replaced with the default.
    preferredAudioLanguages: Array.isArray(input.preferredAudioLanguages)
      ? normalizeLanguageList(input.preferredAudioLanguages)
      : [...DEFAULT_PREFERENCES.preferredAudioLanguages],
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
