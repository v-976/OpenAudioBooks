import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalogue } from '../app/catalogueContext';
import { useUserData } from '../app/userData';
import { getUserState, savePlaybackPosition } from '../persistence/userStateRepository';
import {
  clampPosition,
  computeSkip,
  editionProgress,
  isEditionFinished,
  isNearEditionEnd,
  nextTrack as findNextTrack,
  previousTrack as findPreviousTrack,
  resolveResumeTarget,
} from './playerMachine';
import { PlayerContext, type PlayerContextValue } from './playerContext';
import { useI18n } from '../i18n/i18nContext';

/** How often an in-flight position is written to local storage. */
const PROGRESS_SAVE_INTERVAL_MS = 4000;

/**
 * Single shared audio element plus persisted playback state.
 *
 * Persistence strategy:
 *  - periodic save while playing;
 *  - immediate save on pause, seek, track change and rate change;
 *  - synchronous-ish flush on `visibilitychange`/`pagehide`, which is the last
 *    reliable hook before iOS Safari may discard the page.
 *
 * The media element itself is never persisted; only the (edition, track,
 * position) triple, which is enough to resume exactly where the user stopped.
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const { index } = useCatalogue();
  const { ready: userDataReady, preferences, stateFor, now, updatePreferences } = useUserData();
  const { t } = useI18n();
  const navigate = useNavigate();

  // A real element in the document rather than `new Audio()`: it keeps the
  // media session and lock-screen integration working on mobile browsers, and
  // it makes the player observable in tests.
  const audioRef = useRef<HTMLAudioElement | undefined>(undefined);
  const [editionId, setEditionId] = useState<string | undefined>(undefined);
  const [trackId, setTrackId] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [positionSeconds, setPositionSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [playbackRate, setRateState] = useState(preferences.playbackRate);
  const [error, setError] = useState<string | undefined>(undefined);
  const [nearEnd, setNearEnd] = useState(false);

  /** Guards against persisting a position for a track we already left. */
  const pendingRef = useRef<{ trackId: string; positionSeconds: number } | undefined>(undefined);
  // Media time is not authoritative until the requested offset has been applied.
  const mediaInitialized = useRef(false);
  const lastSaveRef = useRef(0);

  const edition = editionId ? index.editionsById.get(editionId) : undefined;
  const tracks = useMemo(
    () => (editionId ? (index.tracksByEditionId.get(editionId) ?? []) : []),
    [index, editionId],
  );
  const track = useMemo(
    () => (trackId ? tracks.find((item) => item.id === trackId) : undefined),
    [tracks, trackId],
  );

  const getAudio = useCallback((): HTMLAudioElement | undefined => audioRef.current, []);

  const persist = useCallback(
    async (options?: { force?: boolean }) => {
      const audio = audioRef.current;
      if (!audio || !editionId || !trackId) return;
      if (pendingRef.current?.trackId !== trackId) return;
      const position = mediaInitialized.current && Number.isFinite(audio.currentTime)
        && Number.isFinite(audio.duration) && audio.duration > 0
        ? clampPosition(audio.currentTime, audio.duration || undefined)
        : pendingRef.current.positionSeconds;
      const nowMs = Date.now();
      if (!options?.force && nowMs - lastSaveRef.current < PROGRESS_SAVE_INTERVAL_MS) return;
      lastSaveRef.current = nowMs;
      pendingRef.current = { trackId, positionSeconds: position };
      try {
        await savePlaybackPosition({
          audioEditionId: editionId,
          trackId,
          positionSeconds: position,
          playbackRate: audio.playbackRate,
          lastPlayedAt: now(),
          markCompleted: isEditionFinished(
            tracks,
            { trackId, offsetSeconds: position },
            position,
            mediaInitialized.current && Number.isFinite(audio.duration) ? audio.duration : undefined,
          ),
        });
        await updatePreferences({ lastAudioEditionId: editionId });
      } catch (storageError) {
        // Never let a storage failure interrupt playback.
        console.warn('Playback progress could not be saved locally.', storageError);
      }
    },
    [editionId, trackId, now, tracks, updatePreferences],
  );

  const playbackError = useCallback((reason?: unknown) => {
    if (navigator.onLine === false) return t('player.error.offline');
    return reason instanceof DOMException && reason.name === 'NotAllowedError'
      ? t('player.error.playbackBlocked')
      : t('player.error.audioUnavailable');
  }, [t]);

  const loadTrack = useCallback(
    (nextEditionId: string, nextTrackId: string, startAtSeconds: number, autoplay: boolean) => {
      const audio = getAudio();
      const nextTracks = index.tracksByEditionId.get(nextEditionId) ?? [];
      const nextTrack = nextTracks.find((item) => item.id === nextTrackId);
      if (!audio || !nextTrack) {
        setError(t('player.error.noAudio'));
        return;
      }

      setEditionId(nextEditionId);
      setTrackId(nextTrackId);
      setError(undefined);
      setReady(false);
      setPlaying(false);
      mediaInitialized.current = false;
      setPositionSeconds(Math.max(0, startAtSeconds));
      setDurationSeconds(nextTrack.durationSeconds ?? (nextTracks.length === 1
        ? index.editionsById.get(nextEditionId)?.durationSeconds ?? 0 : 0));
      pendingRef.current = { trackId: nextTrackId, positionSeconds: startAtSeconds };

      audio.dataset.trackId = nextTrackId;
      audio.src = nextTrack.audioUrl;
      audio.load();
      audio.playbackRate = playbackRate;

      // Start while still handling the user's click. Waiting for metadata first
      // loses the user-activation window in Safari and other strict browsers.
      if (autoplay) {
        if (navigator.onLine === false) {
          setError(playbackError());
          return;
        }
        void audio.play().catch((reason: unknown) => {
          setPlaying(false);
          setError(playbackError(reason));
        });
      }
    },
    [getAudio, index, playbackRate, playbackError, t],
  );

  // Restore the last session from local data, without autoplay or waiting for media.
  useEffect(() => {
    if (!userDataReady || editionId || !preferences.lastAudioEditionId) return;
    const lastId = preferences.lastAudioEditionId;
    const lastTracks = index.tracksByEditionId.get(lastId) ?? [];
    if (lastTracks.length === 0) return;
    let cancelled = false;
    // Read the durable snapshot asynchronously; a user action always wins over
    // late hydration, including when the catalogue becomes available later.
    void getUserState(lastId).then((stored) => {
      if (cancelled || pendingRef.current || !stored) return;
      const target = resolveResumeTarget(lastTracks, stored);
      if (target) loadTrack(lastId, target.trackId, target.offsetSeconds, false);
    }).catch((storageError: unknown) => {
      console.warn('Playback progress could not be restored locally.', storageError);
    });
    return () => { cancelled = true; };
  }, [userDataReady, editionId, preferences.lastAudioEditionId, index, loadTrack]);

  /**
   * Loads an edition and starts playing.
   *
   * With no explicit track or offset, the stored local position for that
   * edition is used, so "Resume" from any screen lands on the exact chapter and
   * second the listener left off at. An explicit `targetTrackId` always wins,
   * which is what the track list and per-track play buttons rely on.
   */
  const play = useCallback(
    async (targetEditionId: string, targetTrackId?: string, startAtSeconds?: number) => {
      setError(undefined);
      const audio = getAudio();
      if (!audio) {
        setError(t('player.error.noAudio'));
        return;
      }
      const targetTracks = index.tracksByEditionId.get(targetEditionId) ?? [];
      if (targetTracks.length === 0) {
        setError(t('player.error.noAudio'));
        return;
      }

      const sameEdition = targetEditionId === editionId;

      if (sameEdition && !targetTrackId && startAtSeconds === undefined) {
        // Already loaded and no destination requested: continue where we are.
        try {
          if (navigator.onLine === false) {
            setError(playbackError());
            return;
          }
          audio.playbackRate = playbackRate;
          await audio.play();
          navigate('/now-playing');
        } catch (reason) {
          setError(playbackError(reason));
        }
        return;
      }

      // An explicit track always wins. Otherwise fall back to whatever was
      // saved for this edition on this device.
      const stored = targetTrackId ? undefined : stateFor(targetEditionId);
      const requested = targetTrackId
        ? { trackId: targetTrackId, positionSeconds: startAtSeconds ?? 0 }
        : stored?.trackId
          ? { trackId: stored.trackId, positionSeconds: stored.positionSeconds }
          : undefined;

      const resolved = resolveResumeTarget(targetTracks, requested);
      if (!resolved) {
        setError(t('player.error.noAudio'));
        return;
      }

      // Already sitting at the resolved destination: just start playing.
      if (
        resolved.audioEditionId === editionId &&
        resolved.trackId === trackId &&
        Math.abs(resolved.offsetSeconds - audio.currentTime) < 0.5
      ) {
        try {
          if (navigator.onLine === false) {
            setError(playbackError());
            return;
          }
          audio.playbackRate = playbackRate;
          await audio.play();
          navigate('/now-playing');
        } catch (reason) {
          setError(playbackError(reason));
        }
        return;
      }

      void persist({ force: true });
      loadTrack(resolved.audioEditionId, resolved.trackId, resolved.offsetSeconds, true);
      navigate('/now-playing');
    },
    [editionId, getAudio, index, loadTrack, navigate, persist, playbackRate, playbackError, stateFor, t, trackId],
  );

  const pause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
    await persist({ force: true });
  }, [persist]);

  const resume = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    setError(undefined);
    if (navigator.onLine === false) {
      setError(playbackError());
      return;
    }
    try {
      audio.playbackRate = playbackRate;
      await audio.play();
    } catch (reason) {
      setError(playbackError(reason));
    }
  }, [playbackRate, playbackError, track]);

  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await resume();
    } else {
      await pause();
    }
  }, [pause, resume]);

  const seekTo = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const next = clampPosition(seconds, mediaInitialized.current ? audio.duration : durationSeconds || undefined);
      if (pendingRef.current) pendingRef.current.positionSeconds = next;
      if (mediaInitialized.current) audio.currentTime = next;
      setPositionSeconds(next);
      void persist({ force: true });
    },
    [durationSeconds, persist],
  );

  const skipBy = useCallback(
    (deltaSeconds: number) => {
      const audio = audioRef.current;
      if (!audio || !track) return;
      const offsetSeconds = mediaInitialized.current && Number.isFinite(audio.currentTime)
        && Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.currentTime : pendingRef.current?.positionSeconds ?? 0;
      const result = computeSkip(tracks, { trackId: track.id, offsetSeconds }, deltaSeconds);
      if (!result) return;
      if (result.overflowedTrack) {
        const neighbour = deltaSeconds >= 0 ? findNextTrack(tracks, track.id) : findPreviousTrack(tracks, track.id);
        if (!neighbour) {
          seekTo(result.positionSeconds);
          return;
        }
        void persist({ force: true });
        loadTrack(neighbour.audioEditionId, neighbour.id, result.positionSeconds, !audio.paused);
        return;
      }
      seekTo(result.positionSeconds);
    },
    [loadTrack, persist, seekTo, track, tracks],
  );

  const skipForward = useCallback(() => skipBy(preferences.skipForwardSeconds), [preferences.skipForwardSeconds, skipBy]);
  const skipBackward = useCallback(() => skipBy(-preferences.skipBackwardSeconds), [preferences.skipBackwardSeconds, skipBy]);

  const goToRelativeTrack = useCallback(
    async (delta: number) => {
      const audio = audioRef.current;
      if (!audio || !track) return;
      const neighbour = delta >= 0 ? findNextTrack(tracks, track.id) : findPreviousTrack(tracks, track.id);
      await persist({ force: true });
      if (neighbour) {
        loadTrack(neighbour.audioEditionId, neighbour.id, 0, !audio.paused);
        return;
      }
      if (delta < 0) {
        // No previous track: behave like "skip back to start of this track".
        seekTo(0);
      }
    },
    [loadTrack, persist, seekTo, track, tracks],
  );

  const nextTrack = useCallback(() => goToRelativeTrack(1), [goToRelativeTrack]);
  const previousTrack = useCallback(() => goToRelativeTrack(-1), [goToRelativeTrack]);

  const selectTrack = useCallback(
    async (targetTrackId: string) => {
      const audio = audioRef.current;
      if (!audio || !edition) return;
      await persist({ force: true });
      loadTrack(edition.id, targetTrackId, 0, !audio.paused);
    },
    [edition, loadTrack, persist],
  );

  const setPlaybackRate = useCallback(
    async (rate: number) => {
      const audio = audioRef.current;
      const nextRate = Math.min(3, Math.max(0.5, rate));
      setRateState(nextRate);
      if (audio) audio.playbackRate = nextRate;
      await updatePreferences({ playbackRate: nextRate });
      await persist({ force: true });
    },
    [persist, updatePreferences],
  );

  const flushProgress = useCallback(async () => {
    await persist({ force: true });
  }, [persist]);

  /** Latest callbacks/values for media event handlers, which outlive renders. */
  const latest = useRef({ persist, loadTrack, tracks });
  useEffect(() => {
    latest.current = { persist, loadTrack, tracks };
  }, [persist, loadTrack, tracks]);

  // Media element wiring. Listeners are attached once per element; the handlers
  // read the latest values through refs so that changing track does not churn
  // subscriptions mid-playback.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.preload = 'metadata';

    const onTimeUpdate = () => {
      if (!mediaInitialized.current || !Number.isFinite(audio.currentTime)
        || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
      if (pendingRef.current) pendingRef.current.positionSeconds = audio.currentTime;
      setPositionSeconds(audio.currentTime);
      const currentTrackId = audio.dataset.trackId ?? '';
      setNearEnd(
        isNearEditionEnd(
          latest.current.tracks,
          { trackId: currentTrackId, offsetSeconds: audio.currentTime },
          audio.currentTime,
        ),
      );
    };
    const onLoaded = () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      if (!mediaInitialized.current) {
        if (!pendingRef.current) return;
        try {
          audio.currentTime = clampPosition(pendingRef.current.positionSeconds, audio.duration);
        } catch {
          return;
        }
        mediaInitialized.current = true;
        onTimeUpdate();
      }
      setReady(true);
      setDurationSeconds(audio.duration);
    };
    const onDurationChange = () => {
      if (mediaInitialized.current) onLoaded();
    };
    const onEmptied = () => {
      mediaInitialized.current = false;
      setReady(false);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setPositionSeconds(audio.duration || 0);
      void (async () => {
        const { persist: persistNow, loadTrack: loadNow, tracks: tracksNow } = latest.current;
        const currentTrackId = audio.dataset.trackId ?? '';
        const neighbour = currentTrackId ? findNextTrack(tracksNow, currentTrackId) : undefined;
        // With no next track the edition is genuinely over: persist at the end
        // position so `isEditionFinished` marks it complete.
        if (audio.duration) {
          audio.currentTime = audio.duration;
        }
        await persistNow({ force: true });
        if (neighbour) {
          loadNow(neighbour.audioEditionId, neighbour.id, 0, true);
        }
      })();
    };
    const onError = () => {
      mediaInitialized.current = false;
      setReady(false);
      setError(playbackError());
      setPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('emptied', onEmptied);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('emptied', onEmptied);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [playbackError]);

  // After switching edition/track, record the new location immediately. Without
  // this, a listener who stops right after skipping forward would come back to
  // the previous track on resume.
  useEffect(() => {
    if (!editionId || !trackId) return;
    void persist({ force: true });
  }, [editionId, trackId, persist]);

  // Keep the media element's track id available to event handlers.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (trackId) audio.dataset.trackId = trackId;
    else delete audio.dataset.trackId;
  }, [trackId]);

  // Periodic progress persistence while playing.
  useEffect(() => {
    if (!playing) return;
    const timer = globalThis.setInterval(() => {
      void persist();
    }, PROGRESS_SAVE_INTERVAL_MS);
    return () => globalThis.clearInterval(timer);
  }, [persist, playing]);

  // Last-chance flush. `pagehide` is the reliable hook on iOS Safari; the
  // `visibilitychange` fallback covers tab switches and app backgrounding.
  useEffect(() => {
    const flush = () => {
      void persist({ force: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    globalThis.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      globalThis.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [persist]);

  // Media Session, where supported: lets lock-screen controls work on
  // Android/desktop browsers. iOS support is partial; see README limitations.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const work = edition ? index.worksById.get(edition.workId) : undefined;
    const narratorNames =
      edition?.narratorIds
        .map((id) => index.narratorsById.get(id)?.name)
        .filter((name): name is string => Boolean(name))
        .join(', ') || undefined;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track?.title ?? 'OpenAudioBooks',
      artist: narratorNames ?? work?.title ?? 'OpenAudioBooks',
      album: work?.title ?? 'OpenAudioBooks',
    });
  }, [edition, index, track]);

  // Media Session action handlers: play, pause, seek backward/forward, seek to.
  // These enable lock-screen and notification controls on supported browsers.
  // Absence of Media Session API must not break the player — hence the guard.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    const ms = navigator.mediaSession;
    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => void resume()],
      ['pause', () => void pause()],
      ['seekbackward', () => skipBackward()],
      ['seekforward', () => skipForward()],
      ['seekto', (details) => {
        if (details.seekTime !== undefined) seekTo(details.seekTime);
      }],
      ['previoustrack', () => void previousTrack()],
      ['nexttrack', () => void nextTrack()],
    ];

    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // Action not supported in this browser; ignore.
      }
    }

    // Clear handlers on unmount to avoid stale references.
    return () => {
      for (const [action] of handlers) {
        try {
          ms.setActionHandler(action, null);
        } catch {
          // Ignore.
        }
      }
    };
  }, [pause, resume, seekTo, skipBackward, skipForward, previousTrack, nextTrack]);

  // Update Media Session position state (for seek bar on lock screen).
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!('setPositionState' in navigator.mediaSession)) return;
    if (!track) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: durationSeconds || undefined,
        position: positionSeconds,
        playbackRate: playbackRate || undefined,
      });
    } catch {
      // Position state not supported or invalid values; ignore.
    }
  }, [durationSeconds, positionSeconds, playbackRate, track]);

  // Adopt playback rate changes made elsewhere (e.g. restored preferences).
  // The media element is an external system, so syncing it in an effect is the
  // intended use of this hook.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = preferences.playbackRate;
  }, [preferences.playbackRate]);

  const value = useMemo<PlayerContextValue>(() => {
    const current = edition && track ? { edition, track } : undefined;
    return {
      current,
      ready,
      playing,
      positionSeconds,
      durationSeconds,
      editionProgress: editionProgress(tracks, track?.id ?? '', positionSeconds),
      playbackRate,
      skipSeconds: {
        forward: preferences.skipForwardSeconds,
        backward: preferences.skipBackwardSeconds,
      },
      error,
      nearEnd,
      tracks,
      play,
      pause,
      resume,
      toggle,
      seekTo,
      skipForward,
      skipBackward,
      nextTrack,
      previousTrack,
      selectTrack,
      setPlaybackRate,
      flushProgress,
    };
  }, [
    durationSeconds,
    edition,
    error,
    flushProgress,
    nearEnd,
    nextTrack,
    pause,
    play,
    playbackRate,
    preferences.skipBackwardSeconds,
    preferences.skipForwardSeconds,
    playing,
    positionSeconds,
    previousTrack,
    ready,
    resume,
    seekTo,
    selectTrack,
    setPlaybackRate,
    skipBackward,
    skipForward,
    toggle,
    track,
    tracks,
  ]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/*
        The single shared media element. It carries no controls of its own: the
        UI is the transport. Keeping it in the document (rather than
        `new Audio()`) is what allows Media Session and lock-screen controls to
        work on mobile browsers.
      */}
      <audio
        data-testid="player-audio"
        ref={(element) => {
          audioRef.current = element ?? undefined;
        }}
        hidden
      />
    </PlayerContext.Provider>
  );
}
