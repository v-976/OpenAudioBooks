import type { Bookmark, Timestamp, UserState } from '../domain/types';
import { userRecordId } from '../domain/ids';
import { STORES, openDatabase, requestToPromise, transactionToPromise } from './db';

/**
 * Local repository for playback state, favourites, bookmarks and history.
 *
 * All data stays in the browser's IndexedDB on the user's own device. No
 * network calls, no analytics, no sync.
 */

/** Bumped when the persisted record shape changes; see ARCHITECTURE.md. */
export const USER_STATE_RECORD_VERSION = 1;

/** How close to the end of the final track counts as finishing the edition. */
export const COMPLETION_THRESHOLD_SECONDS = 2;

export interface HistoryEntry {
  id: string;
  audioEditionId: string;
  trackId: string;
  /** Position reached in this listening session. */
  positionSeconds: number;
  playedAt: Timestamp;
}

/** Keeps history bounded so local storage cannot grow without limit. */
export const MAX_HISTORY_ENTRIES = 200;

interface StoredUserState extends UserState {
  recordVersion: number;
}

function migrateUserState(record: StoredUserState): StoredUserState {
  // Forward-compatible normalisation. Records written before a shape change
  // gain defaults here instead of being discarded.
  let migrated = record;
  if (migrated.recordVersion < 1) {
    migrated = {
      ...migrated,
      recordVersion: 1,
      playbackRate: migrated.playbackRate > 0 ? migrated.playbackRate : 1,
      completed: Boolean(migrated.completed),
      favorite: Boolean(migrated.favorite),
      positionSeconds: Math.max(0, migrated.positionSeconds ?? 0),
    };
  }
  return migrated;
}

export async function getUserState(
  audioEditionId: string,
): Promise<UserState | undefined> {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.userState, 'readonly');
  const record = await requestToPromise(
    transaction.objectStore(STORES.userState).get(audioEditionId) as IDBRequest<
      StoredUserState | undefined
    >,
  );
  return record ? migrateUserState(record) : undefined;
}

export async function getAllUserState(): Promise<UserState[]> {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.userState, 'readonly');
  const records = await requestToPromise(
    transaction.objectStore(STORES.userState).getAll() as IDBRequest<StoredUserState[]>,
  );
  return records.map(migrateUserState);
}

export async function putUserState(state: UserState): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.userState, 'readwrite');
  transaction.objectStore(STORES.userState).put({
    ...state,
    recordVersion: USER_STATE_RECORD_VERSION,
  } satisfies StoredUserState);
  await transactionToPromise(transaction);
}

/**
 * Records a playback position without clobbering unrelated fields such as
 * `favorite`, which the UI toggles separately.
 */
/**
 * Records a playback position.
 *
 * `markCompleted` is supplied by the caller rather than inferred here: only the
 * player knows whether the finished track was the edition's last one, and
 * treating the end of an arbitrary chapter as finishing the book would be wrong.
 */
export async function savePlaybackPosition(input: {
  audioEditionId: string;
  trackId: string;
  positionSeconds: number;
  playbackRate: number;
  lastPlayedAt: Timestamp;
  /** True only when the final track of the edition has been finished. */
  markCompleted?: boolean;
}): Promise<UserState> {
  const existing = await getUserState(input.audioEditionId);
  const finished = input.markCompleted === true;

  const next: UserState = {
    audioEditionId: input.audioEditionId,
    trackId: input.trackId,
    // A finished edition rewinds, so resuming it starts the book again.
    positionSeconds: finished ? 0 : Math.max(0, input.positionSeconds),
    lastPlayedAt: input.lastPlayedAt,
    playbackRate: input.playbackRate,
    completed: finished ? true : (existing?.completed ?? false),
    favorite: existing?.favorite ?? false,
  };

  await putUserState(next);
  await appendHistory({
    id: `${input.audioEditionId}:${input.trackId}:${input.lastPlayedAt}`,
    audioEditionId: input.audioEditionId,
    trackId: input.trackId,
    positionSeconds: next.positionSeconds,
    playedAt: input.lastPlayedAt,
  });

  return next;
}

export async function setFavorite(
  audioEditionId: string,
  favorite: boolean,
  timestamp: Timestamp,
): Promise<void> {
  const existing = await getUserState(audioEditionId);
  const base: UserState = existing ?? {
    audioEditionId,
    trackId: '',
    positionSeconds: 0,
    lastPlayedAt: timestamp,
    playbackRate: 1,
    completed: false,
    favorite,
  };
  await putUserState({ ...base, favorite });
}

export async function setCompleted(
  audioEditionId: string,
  completed: boolean,
  timestamp: Timestamp,
): Promise<void> {
  const existing = await getUserState(audioEditionId);
  const base: UserState = existing ?? {
    audioEditionId,
    trackId: '',
    positionSeconds: 0,
    lastPlayedAt: timestamp,
    playbackRate: 1,
    completed,
    favorite: false,
  };
  await putUserState({ ...base, completed });
}

async function appendHistory(entry: HistoryEntry): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.history, 'readwrite');
  const store = transaction.objectStore(STORES.history);
  store.put(entry);
  await transactionToPromise(transaction);
  await pruneHistory();
}

async function pruneHistory(): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.history, 'readwrite');
  const store = transaction.objectStore(STORES.history);
  const keys = await requestToPromise(store.getAllKeys());
  if (keys.length > MAX_HISTORY_ENTRIES) {
    const excess = keys
      .slice()
      .sort()
      .slice(0, keys.length - MAX_HISTORY_ENTRIES);
    for (const key of excess) {
      store.delete(key);
    }
  }
  await transactionToPromise(transaction);
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.history, 'readonly');
  const entries = await requestToPromise(
    transaction.objectStore(STORES.history).getAll() as IDBRequest<HistoryEntry[]>,
  );
  return entries.sort((a, b) => b.playedAt.localeCompare(a.playedAt));
}

export async function getBookmarks(audioEditionId?: string): Promise<Bookmark[]> {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.bookmarks, 'readonly');
  const store = transaction.objectStore(STORES.bookmarks);
  const entries =
    audioEditionId === undefined
      ? await requestToPromise(store.getAll() as IDBRequest<Bookmark[]>)
      : await requestToPromise(
          store.index('audioEditionId').getAll(audioEditionId) as IDBRequest<Bookmark[]>,
        );
  return entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addBookmark(input: {
  audioEditionId: string;
  trackId: string;
  positionSeconds: number;
  note?: string;
  createdAt: Timestamp;
}): Promise<Bookmark> {
  const bookmark: Bookmark = {
    id: userRecordId(),
    audioEditionId: input.audioEditionId,
    trackId: input.trackId,
    positionSeconds: Math.max(0, input.positionSeconds),
    createdAt: input.createdAt,
    ...(input.note ? { note: input.note } : {}),
  };
  const db = await openDatabase();
  const transaction = db.transaction(STORES.bookmarks, 'readwrite');
  transaction.objectStore(STORES.bookmarks).put(bookmark);
  await transactionToPromise(transaction);
  return bookmark;
}

export async function removeBookmark(id: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.bookmarks, 'readwrite');
  transaction.objectStore(STORES.bookmarks).delete(id);
  await transactionToPromise(transaction);
}

/** Wipes all local user data. Provided for the in-app privacy control. */
export async function clearAllUserData(): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(
    [STORES.userState, STORES.bookmarks, STORES.history, STORES.meta],
    'readwrite',
  );
  transaction.objectStore(STORES.userState).clear();
  transaction.objectStore(STORES.bookmarks).clear();
  transaction.objectStore(STORES.history).clear();
  transaction.objectStore(STORES.meta).clear();
  await transactionToPromise(transaction);
}
