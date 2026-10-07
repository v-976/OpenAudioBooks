import { useMemo } from 'react';
import { useCatalogue } from '../app/catalogueContext';
import { useUserData } from '../app/userData';
import { resolveResumeTarget, type PlaybackTarget } from './playerMachine';

/**
 * Resolves where playback should resume for an audio edition, using the
 * position persisted on this device. Returns undefined when the edition has no
 * playable tracks yet.
 */
export function useResumeTarget(editionId: string | undefined): PlaybackTarget | undefined {
  const { index } = useCatalogue();
  const { stateFor } = useUserData();

  return useMemo(() => {
    if (!editionId) return undefined;
    const tracks = index.tracksByEditionId.get(editionId) ?? [];
    const stored = stateFor(editionId);
    return resolveResumeTarget(
      tracks,
      stored?.trackId ? { trackId: stored.trackId, positionSeconds: stored.positionSeconds } : undefined,
    );
  }, [editionId, index, stateFor]);
}
