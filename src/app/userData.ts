import { createContext, useContext } from 'react';
import type { Bookmark, Preferences, Timestamp, UserState } from '../domain/types';

/**
 * Local user-data contract exposed to the UI.
 *
 * Every method here resolves against IndexedDB or localStorage on the user's
 * own device. No network transport exists in this interface, by design.
 */
export interface UserDataContextValue {
  ready: boolean;
  preferences: Preferences;
  updatePreferences(patch: Partial<Preferences>): Promise<void>;
  /** Playback state keyed by audio edition id. */
  states: Map<string, UserState>;
  stateFor(audioEditionId: string): UserState | undefined;
  /** Editions with any stored state, most recently played first. */
  continueListening(): string[];
  favorites(): string[];
  completed(): string[];
  toggleFavorite(audioEditionId: string): Promise<void>;
  setCompleted(audioEditionId: string, completed: boolean): Promise<void>;
  bookmarks: Bookmark[];
  bookmarksFor(audioEditionId: string): Bookmark[];
  addBookmark(input: {
    audioEditionId: string;
    trackId: string;
    positionSeconds: number;
    note?: string;
  }): Promise<void>;
  removeBookmark(id: string): Promise<void>;
  clearAll(): Promise<void>;
  now(): Timestamp;
}

export const UserDataContext = createContext<UserDataContextValue | undefined>(undefined);

export function useUserData(): UserDataContextValue {
  const value = useContext(UserDataContext);
  if (!value) {
    throw new Error('useUserData must be used inside <UserDataProvider>.');
  }
  return value;
}
