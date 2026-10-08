import type { AudioEdition, Track } from './types';

/**
 * Duration model.
 *
 * Durations belong to an `AudioEdition`, never to a `Work`: two editions of the
 * same book can be read at very different speeds and can have genuinely
 * different lengths.
 *
 * Everything is stored in whole seconds. "Unknown" is represented by `undefined`
 * and must never be collapsed to zero (AGENTS.md rule: unknown duration is not
 * zero).
 */

/** Sentinel meaning "the source did not report a duration". */
export type DurationSeconds = number | undefined;

/** Upper bound accepted, to reject absurd or corrupt values. */
export const MAX_DURATION_SECONDS = 100 * 60 * 60; // 100 hours

/**
 * Validates a raw duration.
 *
 * Only finite, non-negative, integral-ish values within range are accepted.
 * Everything else becomes `undefined`, so a corrupt field can never surface as
 * "0 minutes" or as a false precision figure.
 */
export function normalizeDurationSeconds(input: unknown): DurationSeconds {
  if (input === null || input === undefined || input === '') return undefined;

  const value =
    typeof input === 'number'
      ? input
      : typeof input === 'string'
        ? Number(input.trim())
        : Number.NaN;

  if (!Number.isFinite(value)) return undefined;
  if (value < 0) return undefined;
  if (value > MAX_DURATION_SECONDS) return undefined;
  // A zero-length recording is not real data; treat it as unknown rather than
  // reporting "0 minutes" for an entry that simply has no duration.
  if (value === 0) return undefined;
  return Math.round(value);
}

/**
 * Parses LibriVox-style formatted totals (`"4:23:52"`, `"01:02:05"`, `"12:30"`).
 *
 * Returns `undefined` for anything unparseable. Used only as a last resort when
 * an integer total is absent.
 */
export function parseFormattedDuration(input: unknown): DurationSeconds {
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  if (!trimmed || !/^\d{1,2}(:\d{1,2}){1,2}$/.test(trimmed)) return undefined;

  const parts = trimmed.split(':').map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return undefined;

  const [hours, minutes, seconds] =
    parts.length === 3 ? parts : [0, parts[0], parts[1]];

  // Guard against 60-minute and 60-second components.
  if (minutes > 59 || seconds > 59) return undefined;
  return normalizeDurationSeconds(hours * 3600 + minutes * 60 + seconds);
}

/**
 * Sums a track list into an edition duration.
 *
 * Returns a value **only when the list is verifiably complete and every track
 * duration is known**. A partial sum of a partial list is a lie about length,
 * which is worse than reporting "unknown".
 *
 * @param declaredSectionCount `num_sections` as reported by the source, when
 *   available. If present it must match the list length.
 */
export function sumTrackDurations(
  tracks: Pick<Track, 'durationSeconds'>[],
  declaredSectionCount?: number,
): DurationSeconds {
  if (tracks.length === 0) return undefined;

  if (declaredSectionCount !== undefined) {
    if (!Number.isInteger(declaredSectionCount) || declaredSectionCount < 0) return undefined;
    if (declaredSectionCount !== tracks.length) return undefined;
  }

  let total = 0;
  for (const track of tracks) {
    const duration = normalizeDurationSeconds(track.durationSeconds);
    // One unknown track makes the whole sum untrustworthy.
    if (duration === undefined) return undefined;
    total += duration;
  }
  return normalizeDurationSeconds(total);
}

/** How a duration value was arrived at. Surfaced in the UI where it matters. */
export type DurationOrigin = 'reported' | 'summed' | 'unknown';

export interface ResolvedDuration {
  seconds: DurationSeconds;
  origin: DurationOrigin;
  /**
   * True when a source total and a section sum disagreed and the total was kept.
   * The UI uses this to avoid implying exact precision.
   */
  inconsistent: boolean;
}

/**
 * Resolves the duration to display for an edition.
 *
 * Precedence:
 *  1. the source's own total, when valid;
 *  2. a sum over a verifiably complete track list;
 *  3. unknown.
 *
 * When both a total and a sum exist and disagree, the total wins and the result
 * is flagged inconsistent rather than being silently "corrected".
 */
export function resolveEditionDuration(input: {
  reportedSeconds?: unknown;
  formattedDuration?: unknown;
  tracks: Pick<Track, 'durationSeconds'>[];
  declaredSectionCount?: number;
}): ResolvedDuration {
  const summed = sumTrackDurations(input.tracks, input.declaredSectionCount);

  const reported =
    normalizeDurationSeconds(input.reportedSeconds) ??
    parseFormattedDuration(input.formattedDuration);

  if (reported !== undefined) {
    // A large disagreement means the source total and its own section list do
    // not describe the same thing. Keep the total, flag the inconsistency.
    const inconsistent =
      summed !== undefined && Math.abs(summed - reported) > Math.max(30, reported * 0.01);
    return { seconds: reported, origin: 'reported', inconsistent };
  }

  if (summed !== undefined) {
    return { seconds: summed, origin: 'summed', inconsistent: false };
  }

  return { seconds: undefined, origin: 'unknown', inconsistent: false };
}

/** Convenience accessor for the edition's own field. */
export function editionDurationSeconds(edition: Pick<AudioEdition, 'durationSeconds'>): DurationSeconds {
  return normalizeDurationSeconds(edition.durationSeconds);
}

/** True when two durations differ by more than one minute. */
export function durationsDiffer(a: DurationSeconds, b: DurationSeconds): boolean {
  if (a === undefined || b === undefined) return false;
  return Math.abs(a - b) > 60;
}
