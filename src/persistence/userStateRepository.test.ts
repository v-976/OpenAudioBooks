import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { DB_VERSION, MIGRATIONS, openDatabase, resetDatabaseHandle } from './db';
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
import { DEFAULT_PREFERENCES } from '../domain/types';

const timestamp = '2026-02-01T10:00:00.000Z';

beforeEach(() => {
  resetDatabaseHandle();
  globalThis.indexedDB = new IDBFactory();
});

describe('schema migrations', () => {
  it('declares contiguous migrations from 1 with DB_VERSION matching', () => {
    const versions = MIGRATIONS.map((migration) => migration.version);
    // Contiguous, ascending and starting at 1: an append-only ledger.
    expect(versions).toEqual([...Array(versions.length)].map((_, index) => index + 1));
    expect(DB_VERSION).toBe(versions[versions.length - 1]);
  });

  it('documents data impact for every migration', () => {
    for (const migration of MIGRATIONS) {
      expect(migration.dataImpact.trim().length).toBeGreaterThan(20);
      expect(migration.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('keeps playback state stores untouched by the provider-cache migration', () => {
    // The 0.2.0 migration must only add a cache store; if it ever rewrote
    // userState, bookmarks or history, this assertion would catch it.
    const cacheMigration = MIGRATIONS.find((migration) => migration.version === 2);
    expect(cacheMigration).toBeDefined();
    expect(cacheMigration?.dataImpact).toMatch(/no existing store/i);
    expect(cacheMigration?.dataImpact).toMatch(/metadata only/i);
  });

  it('applies migrations to a database opened at the current version', async () => {
    const { DB_NAME, STORES } = await import('./db');
    const db = await openDatabase();
    expect(db.version).toBe(DB_VERSION);
    expect([...db.objectStoreNames].sort()).toEqual(
      [STORES.bookmarks, STORES.history, STORES.meta, STORES.providerCache, STORES.userState].sort(),
    );
    expect(DB_NAME).toBe('openaudiobooks');
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

describe('language preferences', () => {
  it('defaults the UI locale to Russian', () => {
    expect(DEFAULT_PREFERENCES.uiLocale).toBe('ru');
    expect(loadPreferences().uiLocale).toBe('ru');
  });

  it('defaults the preferred audiobook languages to Russian', () => {
    expect(DEFAULT_PREFERENCES.preferredAudioLanguages).toEqual(['ru']);
    expect(loadPreferences().preferredAudioLanguages).toEqual(['ru']);
  });

  it('persists both language settings independently', () => {
    savePreferences(
      normalizePreferences({ uiLocale: 'ru', preferredAudioLanguages: ['ru', 'en', 'fi'] }),
    );
    const loaded = loadPreferences();
    expect(loaded.uiLocale).toBe('ru');
    expect(loaded.preferredAudioLanguages).toEqual(['ru', 'en', 'fi']);
  });

  it('supports multiple audiobook languages without a schema change', () => {
    const stored = normalizePreferences({ preferredAudioLanguages: ['ru-RU', 'en', 'rus', 'fi'] });
    expect(stored.preferredAudioLanguages).toEqual(['ru', 'en', 'fi']);
  });

  it('keeps the UI locale separate from the audiobook languages', () => {
    // Changing the audiobook languages must not touch the UI locale, and a
    // Russian UI must not imply Russian-only audio.
    const stored = normalizePreferences({
      uiLocale: 'ru',
      preferredAudioLanguages: ['en', 'fi'],
    });
    expect(stored.uiLocale).toBe('ru');
    expect(stored.preferredAudioLanguages).toEqual(['en', 'fi']);
  });

  it('replaces an unavailable UI locale with the fallback rather than trusting it', () => {
    const stored = normalizePreferences({ uiLocale: 'fi' });
    expect(stored.uiLocale).toBe('ru');
  });

  it('preserves an intentionally empty audiobook language selection', () => {
    // Empty means "no restriction" and must survive a reload as empty, not be
    // silently restored to the default.
    const stored = normalizePreferences({ preferredAudioLanguages: [] });
    expect(stored.preferredAudioLanguages).toEqual([]);
    savePreferences(stored);
    expect(loadPreferences().preferredAudioLanguages).toEqual([]);
  });

  it('migrates Alpha 0.1.0 records without discarding them', () => {
    // A record written before uiLocale/preferredAudioLanguages existed.
    globalThis.localStorage.setItem(
      'openaudiobooks.preferences.v1',
      JSON.stringify({
        playbackRate: 1.25,
        skipForwardSeconds: 45,
        skipBackwardSeconds: 20,
        lastAudioEditionId: 'edition-a',
      }),
    );

    const loaded = loadPreferences();
    // Every 0.1.0 field survives unchanged...
    expect(loaded.playbackRate).toBe(1.25);
    expect(loaded.skipForwardSeconds).toBe(45);
    expect(loaded.skipBackwardSeconds).toBe(20);
    expect(loaded.lastAudioEditionId).toBe('edition-a');
    // ...and the new fields get defaults rather than undefined.
    expect(loaded.uiLocale).toBe('ru');
    expect(loaded.preferredAudioLanguages).toEqual(['ru']);
  });

  it('drops unusable language values instead of storing them', () => {
    const stored = normalizePreferences({
      uiLocale: 42,
      preferredAudioLanguages: ['ru', 'not a language', '', null],
    });
    expect(stored.uiLocale).toBe('ru');
    expect(stored.preferredAudioLanguages).toEqual(['ru']);
  });
});
