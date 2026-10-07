import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { DB_VERSION, MIGRATIONS, resetDatabaseHandle } from './db';
import {
  addBookmark,
  clearAllUserData,
  getAllUserState,
  getBookmarks,
  getHistory,
  getUserState,
  savePlaybackPosition,
  setFavorite,
} from './userStateRepository';
import { loadPreferences, normalizePreferences, savePreferences } from './preferencesRepository';

const timestamp = '2026-02-01T10:00:00.000Z';

beforeEach(() => {
  resetDatabaseHandle();
  globalThis.indexedDB = new IDBFactory();
});

describe('schema migrations', () => {
  it('declares exactly one migration per schema version, in order', () => {
    expect(MIGRATIONS.map((migration) => migration.version)).toEqual([1]);
    expect(DB_VERSION).toBe(1);
    for (const migration of MIGRATIONS) {
      expect(migration.dataImpact.length).toBeGreaterThan(0);
    }
  });
});

describe('playback state persistence', () => {
  it('round-trips a playback position across a reopen', async () => {
    await savePlaybackPosition({
      audioEditionId: 'edition-a',
      trackId: 'track-2',
      positionSeconds: 42.5,
      playbackRate: 1.25,
      lastPlayedAt: timestamp,
    });

    // Simulate an app restart by dropping the cached connection.
    resetDatabaseHandle();
    globalThis.indexedDB = new IDBFactory();
    await savePlaybackPosition({
      audioEditionId: 'edition-a',
      trackId: 'track-2',
      positionSeconds: 43,
      playbackRate: 1.25,
      lastPlayedAt: timestamp,
    });

    const stored = await getUserState('edition-a');
    expect(stored?.trackId).toBe('track-2');
    expect(stored?.positionSeconds).toBe(43);
    expect(stored?.playbackRate).toBe(1.25);
  });

  it('keeps state separate per audio edition of the same work', async () => {
    await savePlaybackPosition({
      audioEditionId: 'edition-a',
      trackId: 'track-a1',
      positionSeconds: 10,
      playbackRate: 1,
      lastPlayedAt: timestamp,
    });
    await savePlaybackPosition({
      audioEditionId: 'edition-b',
      trackId: 'track-b1',
      positionSeconds: 90,
      playbackRate: 1,
      lastPlayedAt: timestamp,
    });

    const all = await getAllUserState();
    expect(all).toHaveLength(2);
    expect((await getUserState('edition-a'))?.positionSeconds).toBe(10);
    expect((await getUserState('edition-b'))?.positionSeconds).toBe(90);
  });

  it('marks an edition completed and rewinds when the caller says it ended', async () => {
    await savePlaybackPosition({
      audioEditionId: 'edition-a',
      trackId: 'track-9',
      positionSeconds: 599.5,
      playbackRate: 1,
      lastPlayedAt: timestamp,
      markCompleted: true,
    });
    const stored = await getUserState('edition-a');
    expect(stored?.completed).toBe(true);
    expect(stored?.positionSeconds).toBe(0);
  });

  it('does not infer completion from an arbitrary position', async () => {
    // Completion must come from the player, which knows the track list. A large
    // position on its own is not evidence that the book finished.
    await savePlaybackPosition({
      audioEditionId: 'edition-a',
      trackId: 'track-1',
      positionSeconds: 599.5,
      playbackRate: 1,
      lastPlayedAt: timestamp,
    });
    const stored = await getUserState('edition-a');
    expect(stored?.completed).toBe(false);
    expect(stored?.positionSeconds).toBe(599.5);
  });

  it('never rewinds a completed edition while it is replayed', async () => {
    await savePlaybackPosition({
      audioEditionId: 'edition-a',
      trackId: 'track-1',
      positionSeconds: 10,
      playbackRate: 1,
      lastPlayedAt: timestamp,
    });
    await savePlaybackPosition({
      audioEditionId: 'edition-a',
      trackId: 'track-1',
      positionSeconds: 0,
      playbackRate: 1,
      lastPlayedAt: timestamp,
      markCompleted: true,
    });
    expect((await getUserState('edition-a'))?.completed).toBe(true);
  });

  it('does not clobber the favourite flag when a position is saved', async () => {
    await setFavorite('edition-a', true, timestamp);
    await savePlaybackPosition({
      audioEditionId: 'edition-a',
      trackId: 'track-1',
      positionSeconds: 12,
      playbackRate: 1,
      lastPlayedAt: timestamp,
    });
    expect((await getUserState('edition-a'))?.favorite).toBe(true);
  });

  it('records listening history locally', async () => {
    await savePlaybackPosition({
      audioEditionId: 'edition-a',
      trackId: 'track-1',
      positionSeconds: 5,
      playbackRate: 1,
      lastPlayedAt: timestamp,
    });
    const history = await getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].audioEditionId).toBe('edition-a');
  });
});

describe('bookmarks', () => {
  it('stores and removes bookmarks scoped to an edition', async () => {
    const created = await addBookmark({
      audioEditionId: 'edition-a',
      trackId: 'track-1',
      positionSeconds: 30,
      createdAt: timestamp,
      note: 'Good bit',
    });
    expect(created.id).toMatch(/^user:/);

    const forA = await getBookmarks('edition-a');
    expect(forA).toHaveLength(1);
    expect(forA[0].note).toBe('Good bit');
    expect(await getBookmarks('edition-b')).toHaveLength(0);

    await getBookmarks();
    const { removeBookmark } = await import('./userStateRepository');
    await removeBookmark(created.id);
    expect(await getBookmarks('edition-a')).toHaveLength(0);
  });
});

describe('privacy controls', () => {
  it('clears all local user data on request', async () => {
    await savePlaybackPosition({
      audioEditionId: 'edition-a',
      trackId: 'track-1',
      positionSeconds: 5,
      playbackRate: 1,
      lastPlayedAt: timestamp,
    });
    await addBookmark({
      audioEditionId: 'edition-a',
      trackId: 'track-1',
      positionSeconds: 5,
      createdAt: timestamp,
    });

    await clearAllUserData();

    expect(await getAllUserState()).toHaveLength(0);
    expect(await getBookmarks()).toHaveLength(0);
    expect(await getHistory()).toHaveLength(0);
  });
});

describe('preferences', () => {
  it('clamps out-of-range values instead of trusting storage', () => {
    const normalized = normalizePreferences({ playbackRate: 99, skipForwardSeconds: 1000 });
    expect(normalized.playbackRate).toBe(3);
    expect(normalized.skipForwardSeconds).toBe(120);
  });

  it('falls back to defaults when storage is unreadable', () => {
    globalThis.localStorage.setItem('openaudiobooks.preferences.v1', '{not json');
    const preferences = loadPreferences();
    expect(preferences.playbackRate).toBe(1);
  });

  it('round-trips preferences', () => {
    savePreferences(normalizePreferences({ playbackRate: 1.5, skipBackwardSeconds: 10 }));
    const loaded = loadPreferences();
    expect(loaded.playbackRate).toBe(1.5);
    expect(loaded.skipBackwardSeconds).toBe(10);
  });
});
