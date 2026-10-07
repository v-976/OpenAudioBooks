import { createContext, useContext } from 'react';
import type { AudioEdition, Track } from '../domain/types';

/**
 * Player contract exposed to the UI.
 *
 * One shared media element is owned by <PlayerProvider>; screens issue intents
 * (play, seek, skip, next) and read observable state. Screens never touch
 * HTMLMediaElement directly.
 */
export interface PlayerContextValue {
  /** Edition currently loaded, or undefined when nothing is loaded. */
  current?: { edition: AudioEdition; track: Track };
  /** True once enough metadata is loaded to show the transport. */
  ready: boolean;
  playing: boolean;
  /** Position within the current track, in seconds. */
  positionSeconds: number;
  /** Duration of the current track in seconds, when known. */
  durationSeconds: number;
  /** Progress through the whole edition, 0..1. */
  editionProgress: number;
  playbackRate: number;
  /** Skip intervals, in seconds, from local preferences. */
  skipSeconds: { forward: number; backward: number };
  /** Set when the media element reports an error. */
  error?: string;
  /** True when the current position is within the final seconds. */
  nearEnd: boolean;

  play(editionId: string, trackId?: string, startAtSeconds?: number): Promise<void>;
  toggle(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seekTo(seconds: number): void;
  skipForward(): void;
  skipBackward(): void;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  selectTrack(trackId: string): Promise<void>;
  setPlaybackRate(rate: number): Promise<void>;
  /** Flush the current position to local storage immediately. */
  flushProgress(): Promise<void>;
  /** Tracks of the loaded edition, in sequence order. */
  tracks: Track[];
}

export const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

export function usePlayer(): PlayerContextValue {
  const value = useContext(PlayerContext);
  if (!value) {
    throw new Error('usePlayer must be used inside <PlayerProvider>.');
  }
  return value;
}
