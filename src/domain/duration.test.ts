import { describe, expect, it } from 'vitest';
import {
  MAX_DURATION_SECONDS,
  normalizeDurationSeconds,
  parseFormattedDuration,
  resolveEditionDuration,
  sumTrackDurations,
  durationsDiffer,
  editionDurationSeconds,
} from './duration';

describe('normalizeDurationSeconds', () => {
  it('accepts valid positive values, including numeric strings', () => {
    expect(normalizeDurationSeconds(600)).toBe(600);
    expect(normalizeDurationSeconds('178995')).toBe(178995);
    expect(normalizeDurationSeconds('  42 ')).toBe(42);
    expect(normalizeDurationSeconds(42.6)).toBe(43);
  });

  it('rejects unusable values rather than reporting a false number', () => {
    expect(normalizeDurationSeconds(undefined)).toBeUndefined();
    expect(normalizeDurationSeconds(null)).toBeUndefined();
    expect(normalizeDurationSeconds('')).toBeUndefined();
    expect(normalizeDurationSeconds('abc')).toBeUndefined();
    expect(normalizeDurationSeconds(-5)).toBeUndefined();
    expect(normalizeDurationSeconds(Number.NaN)).toBeUndefined();
    expect(normalizeDurationSeconds(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(normalizeDurationSeconds({})).toBeUndefined();
    expect(normalizeDurationSeconds(MAX_DURATION_SECONDS + 1)).toBeUndefined();
  });

  it('treats zero as unknown, not as a zero-length recording', () => {
    // "0 minutes" would be a false claim about a book of unknown length.
    expect(normalizeDurationSeconds(0)).toBeUndefined();
    expect(normalizeDurationSeconds('0')).toBeUndefined();
  });
});

describe('parseFormattedDuration', () => {
  it('parses H:MM:SS and MM:SS', () => {
    expect(parseFormattedDuration('4:23:52')).toBe(15832);
    expect(parseFormattedDuration('01:02:05')).toBe(3725);
    expect(parseFormattedDuration('12:30')).toBe(750);
    expect(parseFormattedDuration('00:00:00')).toBeUndefined();
  });

  it('rejects malformed and out-of-range components', () => {
    expect(parseFormattedDuration('4:60:00')).toBeUndefined();
    expect(parseFormattedDuration('4:00:60')).toBeUndefined();
    expect(parseFormattedDuration('abc')).toBeUndefined();
    expect(parseFormattedDuration('')).toBeUndefined();
    expect(parseFormattedDuration(1234)).toBeUndefined();
  });
});

describe('sumTrackDurations', () => {
  it('sums a complete list of known tracks', () => {
    expect(
      sumTrackDurations([{ durationSeconds: 30 }, { durationSeconds: 25 }, { durationSeconds: 16 }]),
    ).toBe(71);
  });

  it('refuses to sum when a section count disagrees with the list length', () => {
    // A partial section list would understate the book's length.
    expect(
      sumTrackDurations([{ durationSeconds: 30 }], 18),
    ).toBeUndefined();
  });

  it('refuses to sum when any track duration is unknown', () => {
    expect(sumTrackDurations([{ durationSeconds: 30 }, { durationSeconds: undefined }])).toBeUndefined();
    expect(sumTrackDurations([{ durationSeconds: 30 }, { durationSeconds: 0 }])).toBeUndefined();
  });

  it('returns undefined for an empty list', () => {
    expect(sumTrackDurations([])).toBeUndefined();
  });

  it('accepts a matching declared section count', () => {
    expect(sumTrackDurations([{ durationSeconds: 30 }, { durationSeconds: 25 }], 2)).toBe(55);
  });
});

describe('resolveEditionDuration', () => {
  const tracks = [{ durationSeconds: 30 }, { durationSeconds: 25 }, { durationSeconds: 16 }];

  it('prefers the reported total', () => {
    const result = resolveEditionDuration({ reportedSeconds: '73', tracks, declaredSectionCount: 3 });
    expect(result.seconds).toBe(73);
    expect(result.origin).toBe('reported');
  });

  it('falls back to the formatted total when the integer one is missing', () => {
    const result = resolveEditionDuration({
      formattedDuration: '4:23:52',
      tracks: [{ durationSeconds: 178995 }],
    });
    expect(result.seconds).toBe(15832);
    expect(result.origin).toBe('reported');
  });

  it('sums a complete list only when no total was reported', () => {
    const result = resolveEditionDuration({ tracks, declaredSectionCount: 3 });
    expect(result.seconds).toBe(71);
    expect(result.origin).toBe('summed');
  });

  it('does not sum an incomplete list', () => {
    const result = resolveEditionDuration({ tracks: tracks.slice(0, 2), declaredSectionCount: 3 });
    expect(result.seconds).toBeUndefined();
    expect(result.origin).toBe('unknown');
  });

  it('keeps the reported total and flags a large disagreement', () => {
    const result = resolveEditionDuration({
      reportedSeconds: '178995',
      tracks: [{ durationSeconds: 1179 }, { durationSeconds: 1157 }],
      declaredSectionCount: 2,
    });
    expect(result.seconds).toBe(178995);
    expect(result.inconsistent).toBe(true);
  });

  it('does not flag a small rounding disagreement', () => {
    const result = resolveEditionDuration({
      reportedSeconds: '73',
      tracks,
      declaredSectionCount: 3,
    });
    // 73 vs 71 is within the tolerance, so this is not worth alarming anyone.
    expect(result.inconsistent).toBe(false);
  });

  it('reports unknown when nothing is usable', () => {
    const result = resolveEditionDuration({ tracks: [] });
    expect(result.seconds).toBeUndefined();
    expect(result.origin).toBe('unknown');
    expect(result.inconsistent).toBe(false);
  });

  it('never reports zero', () => {
    const result = resolveEditionDuration({ reportedSeconds: '0', tracks: [] });
    expect(result.seconds).toBeUndefined();
  });
});

describe('helpers', () => {
  it('reads and normalises an edition duration', () => {
    expect(editionDurationSeconds({ durationSeconds: 900 })).toBe(900);
    expect(editionDurationSeconds({ durationSeconds: undefined })).toBeUndefined();
  });

  it('detects a meaningful disagreement', () => {
    expect(durationsDiffer(600, 700)).toBe(true);
    expect(durationsDiffer(600, 605)).toBe(false);
    expect(durationsDiffer(undefined, 700)).toBe(false);
  });
});
