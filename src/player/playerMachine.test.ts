import { describe, expect, it } from 'vitest';
import type { Track } from '../domain/types';
import {
  clampPosition,
  computeSkip,
  editionProgress,
  elapsedBeforeTrack,
  formatDuration,
  isEditionFinished,
  isNearEditionEnd,
  nextTrack,
  previousTrack,
  resolveResumeTarget,
} from './playerMachine';

const tracks: Track[] = [
  {
    id: 't1',
    audioEditionId: 'e1',
    title: 'One',
    sequence: 1,
    durationSeconds: 100,
    audioUrl: 'a',
  },
  {
    id: 't2',
    audioEditionId: 'e1',
    title: 'Two',
    sequence: 2,
    durationSeconds: 200,
    audioUrl: 'b',
  },
  {
    id: 't3',
    audioEditionId: 'e1',
    title: 'Three',
    sequence: 3,
    durationSeconds: 300,
    audioUrl: 'c',
  },
];

describe('resolveResumeTarget', () => {
  it('resumes at the exact stored position', () => {
    expect(resolveResumeTarget(tracks, { trackId: 't2', positionSeconds: 87.25 })).toEqual({
      audioEditionId: 'e1',
      trackId: 't2',
      offsetSeconds: 87.25,
    });
  });

  it('starts from the first track when nothing is stored', () => {
    expect(resolveResumeTarget(tracks, undefined)).toEqual({
      audioEditionId: 'e1',
      trackId: 't1',
      offsetSeconds: 0,
    });
  });

  it('falls back to the first track when the stored track no longer exists', () => {
    expect(resolveResumeTarget(tracks, { trackId: 'removed', positionSeconds: 40 })).toEqual({
      audioEditionId: 'e1',
      trackId: 't1',
      offsetSeconds: 0,
    });
  });

  it('advances to the next track when the stored position is past the end', () => {
    expect(resolveResumeTarget(tracks, { trackId: 't1', positionSeconds: 100 })).toEqual({
      audioEditionId: 'e1',
      trackId: 't2',
      offsetSeconds: 0,
    });
  });

  it('restarts the edition when the last track was finished', () => {
    expect(resolveResumeTarget(tracks, { trackId: 't3', positionSeconds: 300 } )).toEqual({
      audioEditionId: 'e1',
      trackId: 't1',
      offsetSeconds: 0,
    });
  });

  it('never returns a negative offset', () => {
    expect(resolveResumeTarget(tracks, { trackId: 't2', positionSeconds: -5 })?.offsetSeconds).toBe(0);
  });

  it('returns undefined for an empty track list', () => {
    expect(resolveResumeTarget([], undefined)).toBeUndefined();
  });
});

describe('track navigation', () => {
  it('finds the next and previous track', () => {
    expect(nextTrack(tracks, 't1')?.id).toBe('t2');
    expect(previousTrack(tracks, 't2')?.id).toBe('t1');
  });

  it('stops at the boundaries', () => {
    expect(nextTrack(tracks, 't3')).toBeUndefined();
    expect(previousTrack(tracks, 't1')).toBeUndefined();
  });
});

describe('skip logic', () => {
  it('skips forward within a track', () => {
    expect(
      computeSkip(tracks, { trackId: 't2', offsetSeconds: 10 }, 30),
    ).toEqual({ positionSeconds: 40, overflowedTrack: false });
  });

  it('clamps a small backward skip at the start of a track', () => {
    // With no previous track there is nowhere to spill into.
    expect(
      computeSkip(tracks, { trackId: 't1', offsetSeconds: 10 }, -15),
    ).toEqual({ positionSeconds: 0, overflowedTrack: false });
  });

  it('carries a backward skip into the previous track', () => {
    expect(computeSkip(tracks, { trackId: 't2', offsetSeconds: 5 }, -15)).toEqual({
      positionSeconds: 90,
      overflowedTrack: true,
    });
  });

  it('carries a forward skip into the next track', () => {
    expect(computeSkip(tracks, { trackId: 't1', offsetSeconds: 90 }, 30)).toEqual({
      positionSeconds: 20,
      overflowedTrack: true,
    });
  });

  it('stops at the track end on the final track', () => {
    expect(computeSkip(tracks, { trackId: 't3', offsetSeconds: 295 }, 30)).toEqual({
      positionSeconds: 300,
      overflowedTrack: false,
    });
  });

  it('falls back to clamping when durations are unknown', () => {
    const unknown: Track[] = [
      { id: 'x', audioEditionId: 'e', title: 'X', sequence: 1, audioUrl: 'a' },
    ];
    expect(computeSkip(unknown, { trackId: 'x', offsetSeconds: 5 }, 30)).toEqual({
      positionSeconds: 35,
      overflowedTrack: false,
    });
  });
});

describe('edition progress', () => {
  it('reports cumulative progress across tracks', () => {
    expect(editionProgress(tracks, 't1', 50)).toBeCloseTo(50 / 600);
    expect(editionProgress(tracks, 't2', 0)).toBeCloseTo(100 / 600);
    expect(editionProgress(tracks, 't3', 300)).toBe(1);
  });

  it('reports zero when no durations are known', () => {
    expect(editionProgress([{ ...tracks[0], durationSeconds: undefined }], 't1', 10)).toBe(0);
  });

  it('sums elapsed time before a track', () => {
    expect(elapsedBeforeTrack(tracks, 't3')).toBe(300);
  });
});

describe('completion and formatting helpers', () => {
  it('detects the end of the edition only on the last track', () => {
    expect(
      isNearEditionEnd(tracks, { trackId: 't3', offsetSeconds: 299 }, 299),
    ).toBe(true);
    expect(
      isNearEditionEnd(tracks, { trackId: 't2', offsetSeconds: 199 }, 199),
    ).toBe(false);
  });

  it('only marks an edition finished at the end of the final track', () => {
    // Finishing chapter 1 of 3 must not complete the book.
    expect(isEditionFinished(tracks, { trackId: 't1', offsetSeconds: 100 }, 100)).toBe(false);
    expect(isEditionFinished(tracks, { trackId: 't3', offsetSeconds: 290 }, 290)).toBe(false);
    expect(isEditionFinished(tracks, { trackId: 't3', offsetSeconds: 300 }, 300)).toBe(true);
  });

  it('prefers the real media duration over catalogue metadata', () => {
    // A source that reports the wrong duration must not prevent completion.
    expect(isEditionFinished(tracks, { trackId: 't3', offsetSeconds: 100 }, 100, 100)).toBe(true);
  });

  it('never reports completion without a known length', () => {
    const unknown: Track[] = [
      { id: 'x', audioEditionId: 'e', title: 'X', sequence: 1, audioUrl: 'a' },
    ];
    expect(isEditionFinished(unknown, { trackId: 'x', offsetSeconds: 999 }, 999)).toBe(false);
  });

  it('formats durations with and without hours', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDuration(undefined)).toBe('0:00');
  });

  it('clamps positions to the duration', () => {
    expect(clampPosition(-4, 100)).toBe(0);
    expect(clampPosition(500, 100)).toBe(100);
    expect(clampPosition(Number.NaN)).toBe(0);
  });
});
