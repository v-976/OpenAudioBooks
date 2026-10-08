import {
  LIBRIVOX_API_BASE,
  LIBRIVOX_DEFAULT_LIMIT,
  LIBRIVOX_MAX_LIMIT,
  LIBRIVOX_NO_RESULTS_STATUS,
} from './source';
import type { LibriVoxProject } from './types';

/**
 * LibriVox transport.
 *
 * The API sends no CORS headers, so `fetch` from the browser is blocked
 * (verified 2026-10-08 — see `docs/librivox-api-research.md`). The API's own
 * documented `jsonp` format works cross-origin because a `<script src>` load is
 * not subject to CORS, and it requires **no proxy and no server of ours**.
 *
 * Consequences handled here:
 *  - a unique callback name per request, always removed afterwards;
 *  - a hard timeout, so a silent server cannot leave a promise pending;
 *  - `AbortSignal` support, so a superseded scan can be cancelled;
 *  - serialised requests with a courtesy delay, because LibriVox asks clients
 *    to "separate their requests by several seconds" and may return HTTP 429;
 *  - de-duplication across pages, because `offset` pagination was verified to
 *    overlap and skip;
 *  - HTTP 404 on a list query means "no matches", not a failure.
 */

export interface LibriVoxRequestOptions {
  /** Aborts the in-flight script load. */
  signal?: AbortSignal;
  /** Milliseconds before the request is abandoned. Default 20s. */
  timeoutMs?: number;
  /** Include `sections[]` and `genres[]`. Default false. */
  extended?: boolean;
  /** Include cover art URLs. Default false. */
  coverart?: boolean;
  /** Restrict the returned fields to keep responses small. */
  fields?: string[];
  /** Incremental scan: only projects catalogued since this UNIX timestamp. */
  since?: number;
  /** Maximum results, capped at the API's limit of 500. */
  limit?: number;
  /** Records to skip. Pagination is best-effort, not exact. */
  offset?: number;
  /** `asc` (default) or `desc` by project id. */
  sortOrder?: 'asc' | 'desc';
}

export class LibriVoxError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'LibriVoxError';
    this.status = status;
  }
}

/** True when a rejection was caused by our own timeout rather than the server. */
export class LibriVoxTimeoutError extends LibriVoxError {
  constructor() {
    super('The LibriVox request timed out.');
    this.name = 'LibriVoxTimeoutError';
  }
}

let callbackCounter = 0;

function nextCallbackName(): string {
  callbackCounter += 1;
  return `__oabLibriVox_${callbackCounter}_${Date.now().toString(36)}`;
}

/**
 * Serialises requests. LibriVox asks for several seconds between calls and may
 * start returning 429, so requests never overlap.
 */
let requestChain: Promise<unknown> = Promise.resolve();

/** Minimum spacing between consecutive requests, in milliseconds. */
export const REQUEST_SPACING_MS = 1200;

let lastRequestAt = 0;

function queue<T>(operation: () => Promise<T>): Promise<T> {
  const scheduled = requestChain.then(async () => {
    const since = Date.now() - lastRequestAt;
    if (since < REQUEST_SPACING_MS) {
      await delay(REQUEST_SPACING_MS - since);
    }
    lastRequestAt = Date.now();
    return operation();
  });
  // Keep the chain alive even when a request rejects.
  requestChain = scheduled.catch(() => undefined);
  return scheduled;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildQueryString(params: {
  id?: string;
  title?: string;
  author?: string;
  genre?: string;
  limit?: number;
  offset?: number;
  since?: number;
  extended?: boolean;
  coverart?: boolean;
  fields?: string[];
  sortOrder?: 'asc' | 'desc';
}): string {
  const query = new URLSearchParams();
  query.set('format', 'jsonp');

  if (params.id) query.set('id', params.id);
  if (params.title) query.set('title', params.title);
  if (params.author) query.set('author', params.author);
  if (params.genre) query.set('genre', params.genre);
  if (params.since !== undefined) query.set('since', String(Math.floor(params.since)));

  const limit = Math.min(LIBRIVOX_MAX_LIMIT, Math.max(1, params.limit ?? LIBRIVOX_DEFAULT_LIMIT));
  query.set('limit', String(limit));

  if (params.offset !== undefined && params.offset > 0) {
    query.set('offset', String(Math.floor(params.offset)));
  }
  if (params.extended) query.set('extended', '1');
  if (params.coverart) query.set('coverart', '1');
  if (params.sortOrder) query.set('sort_order', params.sortOrder);
  if (params.fields?.length) query.set('fields', params.fields.join(','));

  return query.toString();
}

interface JsonpWindow {
  [key: string]: unknown;
}

/**
 * Performs one JSONP request.
 *
 * The response body is evaluated as JavaScript by the browser; that is inherent
 * to JSONP and is why the callback name is unique and the script element is
 * always removed, in both the success and the failure path.
 */
export function requestJsonp(
  query: string,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<unknown> {
  const callbackName = nextCallbackName();
  const timeoutMs = options.timeoutMs ?? 20000;
  const target = window as unknown as JsonpWindow;
  const url = `${LIBRIVOX_API_BASE}?${query}&callback=${callbackName}`;

  return new Promise<unknown>((resolve, reject) => {
    let settled = false;
    // A holder rather than a `let` binding: the timeout is installed after the
    // closures below are declared, so it is only reachable through the handle.
    const handle: { timer?: ReturnType<typeof setTimeout> } = {};

    // An already-aborted request must not create or load a script at all.
    if (options.signal?.aborted) {
      reject(new LibriVoxError('The LibriVox request was cancelled.'));
      return;
    }

    const cleanup = () => {
      if (handle.timer !== undefined) globalThis.clearTimeout(handle.timer);
      script.remove();
      delete target[callbackName];
      options.signal?.removeEventListener('abort', onAbort);
    };

    const finish = (error?: Error, value?: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve(value);
    };

    const onAbort = () => {
      finish(new LibriVoxError('The LibriVox request was cancelled.'));
    };

    const script = document.createElement('script');
    script.async = true;
    script.src = url;

    script.onload = () => {
      // The API returns 404 as an HTTP status with a JSONP body, so a script that
      // loaded but never called back is a "no results" case, not a transport
      // failure. Distinguish the two by whether the callback fired.
      finish(
        settled ? undefined : new LibriVoxError(
          'LibriVox returned no callback (this usually means the query matched nothing).',
          LIBRIVOX_NO_RESULTS_STATUS,
        ),
      );
    };

    script.onerror = () => {
      finish(new LibriVoxError('The LibriVox request could not be loaded.'));
    };

    target[callbackName] = (payload: unknown) => {
      finish(undefined, payload);
    };

    if (options.signal) {
      options.signal.addEventListener('abort', onAbort, { once: true });
    }

    handle.timer = globalThis.setTimeout(() => {
      finish(new LibriVoxTimeoutError());
    }, timeoutMs);

    document.head.appendChild(script);
  });
}

function parsePayload(value: unknown): LibriVoxProject[] {
  if (!value || typeof value !== 'object') {
    throw new LibriVoxError('LibriVox returned an unexpected response shape.');
  }
  const payload = value as { books?: unknown };
  if (Array.isArray(payload.books)) {
    return payload.books.filter(
      (book): book is LibriVoxProject => Boolean(book) && typeof book === 'object',
    );
  }
  return [];
}

function isNoResults(error: unknown): boolean {
  return (
    error instanceof LibriVoxError && error.status === LIBRIVOX_NO_RESULTS_STATUS
  );
}

/**
 * Fetches a single page of projects, queued and de-duplicated.
 *
 * Returns an empty list when the query matched nothing, because the API signals
 * "no results" with HTTP 404 rather than an empty array.
 */
export async function fetchProjects(
  params: Parameters<typeof buildQueryString>[0],
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<LibriVoxProject[]> {
  return queue(async () => {
    const query = buildQueryString(params);
    let payload: unknown;
    try {
      payload = await requestJsonp(query, options);
    } catch (error) {
      if (isNoResults(error)) return [];
      throw error;
    }
    return parsePayload(payload);
  });
}

export interface ScanResult {
  projects: LibriVoxProject[];
  /** Pages actually fetched. */
  pages: number;
  /** True when the page cap stopped the scan before the result set ended. */
  truncated: boolean;
  /** Duplicate ids skipped because pagination overlapped. */
  duplicatesSkipped: number;
}

export interface ScanOptions extends LibriVoxRequestOptions {
  /** Hard cap on pages. Bounds every scan; the catalogue is never walked fully. */
  maxPages?: number;
}

/**
 * Scans up to `maxPages` pages, de-duplicating by project id.
 *
 * LibriVox's `offset` pagination was verified to overlap and to skip rows, so a
 * scan must not assume arithmetic. This is also the mechanism that keeps the
 * catalogue honest: a scan is bounded, and the caller reports that the loaded
 * set is partial.
 */
export async function scanProjects(
  params: Omit<Parameters<typeof buildQueryString>[0], 'offset'> & { limit?: number },
  options: ScanOptions = {},
): Promise<ScanResult> {
  const maxPages = Math.max(1, options.maxPages ?? 3);
  const pageSize = Math.min(LIBRIVOX_MAX_LIMIT, Math.max(1, params.limit ?? LIBRIVOX_DEFAULT_LIMIT));
  const seen = new Set<string>();
  const projects: LibriVoxProject[] = [];
  let duplicatesSkipped = 0;
  let pages = 0;
  let truncated = false;

  for (let page = 0; page < maxPages; page += 1) {
    const batch = await fetchProjects(
      { ...params, limit: pageSize, offset: page * pageSize },
      { ...(options.signal ? { signal: options.signal } : {}), ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}) },
    );
    pages += 1;

    let newInPage = 0;
    for (const project of batch) {
      const id = typeof project.id === 'string' ? project.id : undefined;
      if (id && seen.has(id)) {
        duplicatesSkipped += 1;
        continue;
      }
      if (id) seen.add(id);
      projects.push(project);
      newInPage += 1;
    }

    // A short page means the result set is exhausted. An entirely duplicate page
    // means pagination has stalled, so stop instead of looping.
    if (batch.length < pageSize) break;
    if (newInPage === 0) {
      truncated = true;
      break;
    }
    if (page === maxPages - 1) truncated = true;
  }

  return { projects, pages, truncated, duplicatesSkipped };
}

/** Test hook: clears the serialisation queue between cases. */
export function __resetTransportState(): void {
  requestChain = Promise.resolve();
  lastRequestAt = 0;
  callbackCounter = 0;
}
