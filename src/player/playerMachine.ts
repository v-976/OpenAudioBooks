import type { Track } from '../domain/types';

/**
 * Pure playback-state machine.
 *
 * Kept free of DOM and storage concerns so the "where should we resume?"
 * decision is unit-testable and so the persistence layer and the media element
 * never talk to each other directly.
 */

export interface TrackPosition {
  trackId: string;
  /** Offset within the track, in seconds. */
  offsetSeconds: number;
}

export interface PlaybackTarget {
  audioEditionId: string;
  trackId: string;
  offsetSeconds: number;
}

export interface ProgressSnapshot {
  audioEditionId: string;
  trackId: string;
  positionSeconds: number;
  durationSeconds: number;
  playbackRate: number;
  updatedAt: string;
}

export function findTrack(tracks: Track[], trackId: string): Track | undefined {
  return tracks.find((track) => track.id === trackId);
}

/** Resolves a resume request against the edition's real track list. */
export function resolveResumeTarget(
  tracks: Track[],
  requested: { trackId: string; positionSeconds: number } | undefined,
  fallbackOffsetSeconds = 0,
): PlaybackTarget | undefined {
  if (tracks.length === 0) return undefined;
  const first = tracks[0];

  if (!requested) {
    return {
      audioEditionId: first.audioEditionId,
      trackId: first.id,
      offsetSeconds: Math.max(0, fallbackOffsetSeconds),
    };
  }

  const match = findTrack(tracks, requested.trackId);
  if (!match) {
    return {
      audioEditionId: first.audioEditionId,
      trackId: first.id,
      offsetSeconds: 0,
    };
  }

  const duration = match.durationSeconds;
  const position = Math.max(0, requested.positionSeconds);
  // A stored position at or past the end means "finished that track".
  if (duration && duration > 0 && position >= duration) {
    const next = nextTrack(tracks, match.id);
    return next
      ? { audioEditionId: next.audioEditionId, trackId: next.id, offsetSeconds: 0 }
      : { audioEditionId: first.audioEditionId, trackId: first.id, offsetSeconds: 0 };
  }

  return {
    audioEditionId: match.audioEditionId,
    trackId: match.id,
    offsetSeconds: position,
  };
}

export function nextTrack(tracks: Track[], trackId: string): Track | undefined {
  const ordered = [...tracks].sort((a, b) => a.sequence - b.sequence);
  const index = ordered.findIndex((track) => track.id === trackId);
  if (index < 0) return undefined;
  return ordered[index + 1];
}

export function previousTrack(tracks: Track[], trackId: string): Track | undefined {
  const ordered = [...tracks].sort((a, b) => a.sequence - b.sequence);
  const index = ordered.findIndex((track) => track.id === trackId);
  if (index <= 0) return undefined;
  return ordered[index - 1];
}

export interface SkipResult {
  /** New position in seconds. */
  positionSeconds: number;
  /** True when skipping past the end requires switching track. */
  overflowedTrack: boolean;
}

/**
 * Skip logic that can spill into the adjacent track, which a plain
 * `currentTime + n` assignment cannot do across file boundaries.
 */
export function computeSkip(
  tracks: Track[],
  current: TrackPosition,
  deltaSeconds: number,
): SkipResult | undefined {
  const ordered = [...tracks].sort((a, b) => a.sequence - b.sequence);
  if (ordered.length === 0) return undefined;
  const index = ordered.findIndex((track) => track.id === current.trackId);
  if (index < 0) return undefined;

  const duration = ordered[index].durationSeconds;
  if (!duration || duration <= 0) {
    return {
      positionSeconds: Math.max(0, current.offsetSeconds + deltaSeconds),
      overflowedTrack: false,
    };
  }

  const target = current.offsetSeconds + deltaSeconds;
  if (target >= 0 && target <= duration) {
    return { positionSeconds: target, overflowedTrack: false };
  }

  if (target < 0) {
    const previous = ordered[index - 1];
    if (!previous?.durationSeconds) {
      return { positionSeconds: Math.max(0, current.offsetSeconds + deltaSeconds), overflowedTrack: false };
    }
    return {
      positionSeconds: Math.max(0, previous.durationSeconds + target),
      overflowedTrack: true,
    };
  }

  const next = ordered[index + 1];
  if (!next) {
    return { positionSeconds: duration, overflowedTrack: false };
  }
  return { positionSeconds: target - duration, overflowedTrack: true };
}

/**
 * True when playback has reached the end of the edition's final track.
 *
 * Completion is deliberately not inferred from any single chapter finishing: a
 * multi-chapter book must not be marked complete when chapter 1 ends. Only the
 * caller that knows the track list and the real media duration may answer this.
 */
export function isEditionFinished(
  tracks: Track[],
  current: TrackPosition,
  positionSeconds: number,
  durationSeconds?: number,
  threshold = 2,
): boolean {
  const ordered = [...tracks].sort((a, b) => a.sequence - b.sequence);
  const last = ordered[ordered.length - 1];
  if (!last || last.id !== current.trackId) return false;
  const length = durationSeconds ?? last.durationSeconds;
  if (!length || length <= 0) return false;
  return positionSeconds >= length - threshold;
}

/**
 * True when the current position is within a few seconds of the end of the
 * edition. Used for "finishing soon" affordances in the transport.
 */
export function isNearEditionEnd(
  tracks: Track[],
  current: TrackPosition,
  positionSeconds: number,
  threshold = 3,
): boolean {
  const ordered = [...tracks].sort((a, b) => a.sequence - b.sequence);
  const last = ordered[ordered.length - 1];
  if (!last || last.id !== current.trackId || !last.durationSeconds) return false;
  return positionSeconds >= last.durationSeconds - threshold;
}

/** Overall progress through an edition, as a 0..1 fraction. */
export function editionProgress(tracks: Track[], trackId: string, positionSeconds: number): number {
  const total = tracks.reduce((sum, track) => sum + (track.durationSeconds ?? 0), 0);
  if (total <= 0) return 0;
  const ordered = [...tracks].sort((a, b) => a.sequence - b.sequence);
  let elapsed = 0;
  for (const track of ordered) {
    if (track.id === trackId) {
      return Math.min(1, Math.max(0, (elapsed + positionSeconds) / total));
    }
    elapsed += track.durationSeconds ?? 0;
  }
  return 0;
}

/** Elapsed seconds before the given track starts within its edition. */
export function elapsedBeforeTrack(tracks: Track[], trackId: string): number {
  const ordered = [...tracks].sort((a, b) => a.sequence - b.sequence);
  let elapsed = 0;
  for (const track of ordered) {
    if (track.id === trackId) return elapsed;
    elapsed += track.durationSeconds ?? 0;
  }
  return elapsed;
}

export function formatDuration(totalSeconds: number | undefined): string {
  if (!totalSeconds || !Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const whole = Math.floor(totalSeconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function clampPosition(value: number, durationSeconds?: number): number {
  const safe = Number.isFinite(value) && value > 0 ? value : 0;
  if (durationSeconds && durationSeconds > 0) {
    return Math.min(safe, durationSeconds);
  }
  return safe;
}
