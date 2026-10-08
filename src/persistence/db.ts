/**
 * IndexedDB bootstrap and schema migrations.
 *
 * Rules for this file:
 *  - user data stays local. Nothing here sends anything anywhere.
 *  - schema changes must be additive migrations keyed by version number, and
 *    must document their data impact (AGENTS.md rule 10).
 *  - old records must remain readable where practical (AGENTS.md rule 9).
 */

export const DB_NAME = 'openaudiobooks';
export const DB_VERSION = 2;

export const STORES = {
  userState: 'userState',
  bookmarks: 'bookmarks',
  history: 'history',
  meta: 'meta',
  providerCache: 'providerCache',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

export interface Migration {
  version: number;
  description: string;
  /** Data impact note, surfaced in ARCHITECTURE.md and code review. */
  dataImpact: string;
  migrate(db: IDBDatabase, transaction: IDBTransaction): void;
}

/**
 * Migration ledger. Append new entries; never edit or reorder existing ones.
 *
 * v1 - initial schema: per-edition playback state, bookmarks, listening history.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Initial local-first stores',
    dataImpact: 'No existing data to migrate. Creates all four object stores.',
    migrate(db) {
      const userState = db.createObjectStore(STORES.userState, { keyPath: 'audioEditionId' });
      userState.createIndex('lastPlayedAt', 'lastPlayedAt', { unique: false });

      const bookmarks = db.createObjectStore(STORES.bookmarks, { keyPath: 'id' });
      bookmarks.createIndex('audioEditionId', 'audioEditionId', { unique: false });
      bookmarks.createIndex('createdAt', 'createdAt', { unique: false });

      const history = db.createObjectStore(STORES.history, { keyPath: 'id' });
      history.createIndex('audioEditionId', 'audioEditionId', { unique: false });
      history.createIndex('playedAt', 'playedAt', { unique: false });

      db.createObjectStore(STORES.meta, { keyPath: 'key' });
    },
  },
  {
    version: 2,
    description: 'Add a per-source metadata cache for provider catalogues',
    dataImpact:
      'Creates a new `providerCache` store only. No existing store, record or index is read, ' +
      'rewritten or deleted, so playback positions, bookmarks, favourites and history from Alpha ' +
      '0.1.x are untouched. The store holds source METADATA ONLY; no audio file is ever cached. ' +
      'Removing the store later would only discard cached catalogue data.',
    migrate(db) {
      // Keyed by [sourceId, recordId] so two providers cannot collide, with an
      // index on sourceId for bulk reads and on fetchedAt for staleness checks.
      const store = db.createObjectStore(STORES.providerCache, {
        keyPath: ['sourceId', 'recordId'],
      });
      store.createIndex('sourceId', 'sourceId', { unique: false });
      store.createIndex('fetchedAt', 'fetchedAt', { unique: false });
    },
  },
];

function applyMigrations(db: IDBDatabase, transaction: IDBTransaction, oldVersion: number): void {
  for (const migration of MIGRATIONS) {
    if (migration.version > oldVersion) {
      migration.migrate(db, transaction);
    }
  }
}

let dbPromise: Promise<IDBDatabase> | undefined;

/** Opens (and migrates) the local database. Memoised per page session. */
export function openDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is unavailable in this environment.'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        const transaction = request.transaction;
        if (!transaction) {
          reject(new Error('Missing upgrade transaction.'));
          return;
        }
        applyMigrations(db, transaction, event.oldVersion);
      };

      request.onsuccess = () => {
        const db = request.result;
        // If another tab upgrades the schema, drop our handle and reopen.
        db.onversionchange = () => {
          db.close();
          dbPromise = undefined;
        };
        resolve(db);
      };

      request.onerror = () => reject(request.error ?? new Error('Failed to open database.'));
      request.onblocked = () =>
        reject(new Error('Database upgrade blocked by another open tab. Close it and retry.'));
    });
  }
  return dbPromise;
}

/** Test helper: forgets the memoised handle so a fresh DB can be opened. */
export function resetDatabaseHandle(): void {
  dbPromise = undefined;
}

/** Wraps an IDBRequest in a promise. */
export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

/** Resolves when a transaction commits; rejects on abort/error. */
export function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
  });
}
