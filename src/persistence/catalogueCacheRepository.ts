import type { LibriVoxCacheRecord, LibriVoxProject } from '../sources/librivox/types';
import { STORES, openDatabase, requestToPromise, transactionToPromise } from './db';

/**
 * Local metadata cache for provider catalogues.
 *
 * Scope, deliberately narrow (this is NOT a mirror of any provider):
 *  - **metadata only** — no audio file is ever downloaded or cached;
 *  - **bounded** — the caller decides how many records to fetch; this module
 *    only stores what it is handed;
 *  - **offline-first** — a cached slice is served without any network request;
 *  - **non-destructive** — writing a cache never touches playback state;
 *  - **crash-safe** — records are written in a single transaction per batch, so
 *    an interrupted refresh leaves the previous cache intact rather than a
 *    half-written one.
 */

export interface CachedProviderRecord<T = unknown> {
  sourceId: string;
  recordId: string;
  payload: T;
  fetchedAt: string;
}

/** Default staleness window before a refresh is worth attempting. */
export const CACHE_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Safety cap so a runaway scan cannot fill the user's storage. */
export const CACHE_MAX_RECORDS = 5000;

async function readAll<T>(sourceId: string): Promise<CachedProviderRecord<T>[]> {
  const db = await openDatabase();
  const transaction = db.transaction(STORES.providerCache, 'readonly');
  const store = transaction.objectStore(STORES.providerCache);
  const records = await requestToPromise(
    store.index('sourceId').getAll(sourceId) as IDBRequest<CachedProviderRecord<T>[]>,
  );
  return records as CachedProviderRecord<T>[];
}

async function writeAll<T>(records: CachedProviderRecord<T>[]): Promise<void> {
  if (records.length === 0) return;
  const db = await openDatabase();
  const transaction = db.transaction(STORES.providerCache, 'readwrite');
  const store = transaction.objectStore(STORES.providerCache);
  for (const record of records) {
    store.put(record);
  }
  await transactionToPromise(transaction);
}

/** LibriVox-shaped records, typed for the adapter's use. */
export async function readCachedProjects(): Promise<LibriVoxCacheRecord[]> {
  const records = await readAll<LibriVoxProject>('librivox');
  return records
    .filter((record) => record.payload && typeof record.payload === 'object')
    .map((record) => ({
      id: record.recordId,
      project: record.payload,
      fetchedAt: record.fetchedAt,
    }));
}

/**
 * Stores LibriVox projects.
 *
 * Writes the whole batch in one transaction so a mid-batch failure cannot leave
 * a partially updated cache.
 */
export async function writeCachedProjects(
  projects: { id: string; project: LibriVoxProject; fetchedAt: string; fromSince?: boolean }[],
): Promise<void> {
  if (projects.length === 0) return;
  await writeAll(
    projects.map((entry) => ({
      sourceId: 'librivox',
      recordId: entry.id,
      payload: entry.project,
      fetchedAt: entry.fromSince ? new Date(0).toISOString() : entry.fetchedAt,
    })),
  );
  await pruneIfNeeded();
}

/** Timestamp of the newest cached record for a source, if any. */
export async function newestFetchedAt(sourceId: string): Promise<string | undefined> {
  const records = await readAll(sourceId);
  if (records.length === 0) return undefined;
  return records.reduce<string | undefined>(
    (latest, record) => (!latest || record.fetchedAt > latest ? record.fetchedAt : latest),
    undefined,
  );
}

/** True when the cache exists but is old enough to be worth refreshing. */
export async function isCacheStale(
  sourceId: string,
  now = Date.now(),
): Promise<boolean> {
  const newest = await newestFetchedAt(sourceId);
  if (!newest) return true;
  const age = now - Date.parse(newest);
  return !Number.isFinite(age) || age > CACHE_STALE_AFTER_MS;
}

/**
 * Drops the oldest records when the cache exceeds its cap.
 *
 * Never touches playback state: the cap applies only to the provider cache.
 */
export async function pruneIfNeeded(): Promise<number> {
  const records = await readAll('librivox');
  if (records.length <= CACHE_MAX_RECORDS) return 0;

  const excess = records.length - CACHE_MAX_RECORDS;
  const oldest = [...records]
    .sort((a, b) => a.fetchedAt.localeCompare(b.fetchedAt))
    .slice(0, excess);

  const db = await openDatabase();
  const transaction = db.transaction(STORES.providerCache, 'readwrite');
  const store = transaction.objectStore(STORES.providerCache);
  for (const record of oldest) {
    store.delete([record.sourceId, record.recordId]);
  }
  await transactionToPromise(transaction);
  return oldest.length;
}

export async function cacheSize(sourceId: string): Promise<number> {
  return (await readAll(sourceId)).length;
}

/** Clears one provider's cached metadata. Playback state is untouched. */
export async function clearProviderCache(sourceId: string): Promise<void> {
  const records = await readAll(sourceId);
  if (records.length === 0) return;
  const db = await openDatabase();
  const transaction = db.transaction(STORES.providerCache, 'readwrite');
  const store = transaction.objectStore(STORES.providerCache);
  for (const record of records) {
    store.delete([record.sourceId, record.recordId]);
  }
  await transactionToPromise(transaction);
}
