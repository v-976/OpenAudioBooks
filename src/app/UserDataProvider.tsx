import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Bookmark, Preferences, UserState } from '../domain/types';
import {
  addBookmark,
  clearAllUserData,
  getAllUserState,
  getBookmarks,
  removeBookmark,
  setCompleted,
  setFavorite,
} from '../persistence/userStateRepository';
import {
  loadPreferences,
  normalizePreferences,
  savePreferences,
} from '../persistence/preferencesRepository';
import { UserDataContext, type UserDataContextValue } from './userData';

/**
 * Local-first user data store.
 *
 * Loads playback state, bookmarks and preferences from the device at startup so
 * that "Continue listening" survives a browser or app restart.
 */
export function UserDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [states, setStates] = useState<Map<string, UserState>>(() => new Map());
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences());

  const refreshStates = useCallback(async () => {
    const records = await getAllUserState();
    setStates(new Map(records.map((record) => [record.audioEditionId, record])));
  }, []);

  const refreshBookmarks = useCallback(async () => {
    setBookmarks(await getBookmarks());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [stateRecords, bookmarkRecords] = await Promise.all([
          getAllUserState(),
          getBookmarks(),
        ]);
        if (cancelled) return;
        setStates(new Map(stateRecords.map((record) => [record.audioEditionId, record])));
        setBookmarks(bookmarkRecords);
      } catch (error) {
        // A failed local store must not block the app; playback still works,
        // it simply will not resume.
        console.warn('Local user data could not be read.', error);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const now = useCallback(() => new Date().toISOString(), []);

  const updatePreferences = useCallback(async (patch: Partial<Preferences>) => {
    const next = normalizePreferences({ ...loadPreferences(), ...patch });
    setPreferences(next);
    savePreferences(next);
  }, []);

  const value = useMemo<UserDataContextValue>(() => {
    const byRecent = (ids: string[]) =>
      [...ids].sort((a, b) => {
        const left = states.get(a)?.lastPlayedAt ?? '';
        const right = states.get(b)?.lastPlayedAt ?? '';
        return right.localeCompare(left);
      });

    return {
      ready,
      preferences,
      updatePreferences,
      states,
      now,
      stateFor(audioEditionId) {
        return states.get(audioEditionId);
      },
      continueListening() {
        return byRecent(
          [...states.values()]
            .filter((state) => state.trackId !== '')
            .map((state) => state.audioEditionId),
        );
      },
      favorites() {
        return byRecent(
          [...states.values()].filter((state) => state.favorite).map((s) => s.audioEditionId),
        );
      },
      completed() {
        return byRecent(
          [...states.values()].filter((state) => state.completed).map((s) => s.audioEditionId),
        );
      },
      async toggleFavorite(audioEditionId) {
        const current = states.get(audioEditionId)?.favorite ?? false;
        await setFavorite(audioEditionId, !current, now());
        await refreshStates();
      },
      async setCompleted(audioEditionId, completed) {
        await setCompleted(audioEditionId, completed, now());
        await refreshStates();
      },
      bookmarks,
      bookmarksFor(audioEditionId) {
        return bookmarks.filter((bookmark) => bookmark.audioEditionId === audioEditionId);
      },
      async addBookmark(input) {
        await addBookmark({ ...input, createdAt: now() });
        await refreshBookmarks();
      },
      async removeBookmark(id) {
        await removeBookmark(id);
        await refreshBookmarks();
      },
      async clearAll() {
        await clearAllUserData();
        await refreshBookmarks();
        await refreshStates();
        const fresh = { ...preferences };
        delete fresh.lastAudioEditionId;
        setPreferences(normalizePreferences(fresh));
        savePreferences(fresh);
      },
    };
  }, [
    ready,
    preferences,
    states,
    bookmarks,
    now,
    updatePreferences,
    refreshStates,
    refreshBookmarks,
  ]);

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}
