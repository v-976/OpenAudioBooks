import type { DurationSeconds } from './duration';
import type { EditionSort, DurationRange } from './search';

/**
 * Duration presets and helpers for the catalogue UI.
 *
 * Range boundaries are inclusive on both ends, chosen so that consecutive
 * presets never overlap at the seam: a book of exactly 30 minutes matches
 * "15–30 минут" and not "30–60 минут". The minute count is therefore the first
 * second *after* the label's end, which is why the max is `minutes * 60` and the
 * next preset starts at the following minute.
 */

export const MINUTE = 60;
export const HOUR = 60 * MINUTE;

export interface DurationPreset {
  id: string;
  /** Inclusive lower bound in seconds. */
  minSeconds?: number;
  /**
   * Exclusive upper bound in seconds, so ranges tile without overlap. Kept
   * separate from `maxSeconds` so the filter helper stays inclusive.
   */
  beforeSeconds?: number;
}

/**
 * Preset ranges.
 *
 * `beforeSeconds` is exclusive; `rangeFromPreset` converts to the inclusive
 * `maxSeconds` used by the filter by stepping back one second.
 */
export const DURATION_PRESETS: DurationPreset[] = [
  { id: 'under15', beforeSeconds: 15 * MINUTE },
  { id: '15to30', minSeconds: 15 * MINUTE, beforeSeconds: 30 * MINUTE },
  { id: '30to60', minSeconds: 30 * MINUTE, beforeSeconds: 60 * MINUTE },
  { id: '1to3h', minSeconds: 60 * MINUTE, beforeSeconds: 3 * HOUR },
  { id: '3to10h', minSeconds: 3 * HOUR, beforeSeconds: 10 * HOUR },
  { id: 'over10h', minSeconds: 10 * HOUR },
];

/** Any duration: no constraint. */
export const PRESET_ANY = 'any';

export type DurationSelection = DurationPreset['id'] | typeof PRESET_ANY | 'custom';

export function findPreset(id: string): DurationPreset | undefined {
  return DURATION_PRESETS.find((preset) => preset.id === id);
}

/** Converts a preset into the inclusive range used by the filter. */
export function rangeFromPreset(id: string): DurationRange {
  const preset = findPreset(id);
  if (!preset) return {};
  return {
    ...(preset.minSeconds === undefined ? {} : { minSeconds: preset.minSeconds }),
    // One second below the exclusive bound keeps "15–30" and "30–60" disjoint.
    ...(preset.beforeSeconds === undefined ? {} : { maxSeconds: preset.beforeSeconds - 1 }),
  };
}

/** Builds a range from user-entered minutes. Returns undefined when unusable. */
export function rangeFromMinutes(minMinutes: number, maxMinutes: number): DurationRange | undefined {
  const min = Number.isFinite(minMinutes) && minMinutes > 0 ? Math.floor(minMinutes) : undefined;
  const max = Number.isFinite(maxMinutes) && maxMinutes > 0 ? Math.floor(maxMinutes) : undefined;
  if (min === undefined && max === undefined) return undefined;
  if (min !== undefined && max !== undefined && max < min) return undefined;
  return {
    ...(min === undefined ? {} : { minSeconds: min * MINUTE }),
    ...(max === undefined ? {} : { maxSeconds: max * MINUTE }),
  };
}

/** True when the two bounds are contradictory. */
export function isRangeContradictory(minMinutes: number, maxMinutes: number): boolean {
  const min = Number.isFinite(minMinutes) && minMinutes > 0 ? minMinutes : 0;
  const max = Number.isFinite(maxMinutes) && maxMinutes > 0 ? maxMinutes : 0;
  return min > 0 && max > 0 && max < min;
}

/** Which preset a range corresponds to, for restoring the control's value. */
export function presetIdForRange(range: DurationRange | undefined): string {
  if (!range || (range.minSeconds === undefined && range.maxSeconds === undefined)) {
    return PRESET_ANY;
  }
  const match = DURATION_PRESETS.find((preset) => {
    const derived = rangeFromPreset(preset.id);
    return (
      derived.minSeconds === range.minSeconds && derived.maxSeconds === range.maxSeconds
    );
  });
  return match ? match.id : 'custom';
}

/**
 * Human-readable duration, using the Russian convention the interface ships
 * with (`1 ч 25 мин`).
 *
 * Returns `undefined` for an unknown or non-positive duration so the caller can
 * render "неизвестна" instead of "0 мин". The wording lives in the localization
 * layer, so only the numeric parts are produced here.
 */
/** A duration broken into display units. */
export interface DurationParts {
  seconds: number;
  minutes: number;
  hours: number;
}

/**
 * Human-readable duration, using the Russian convention the interface ships
 * with (`1 ч 25 мин`).
 *
 * Returns `undefined` for an unknown or non-positive duration so the caller can
 * render "неизвестна" instead of "0 мин". The wording lives in the localization
 * layer, so only the numeric parts are produced here.
 *
 * A recording shorter than a minute keeps whole seconds rather than rounding
 * down to "0 мин", which would be a false statement about its length.
 */
export function formatDurationShort(seconds: DurationSeconds): DurationParts | undefined {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return undefined;
  const total = Math.round(seconds);
  if (total < 60) {
    return { seconds: total, minutes: 0, hours: 0 };
  }
  return {
    seconds: 0,
    hours: Math.floor(total / HOUR),
    minutes: Math.floor((total % HOUR) / MINUTE),
  };
}

/** Sorts options for the sort control. */
export const SORT_OPTIONS: EditionSort[] = ['catalogue', 'shortest', 'longest'];
