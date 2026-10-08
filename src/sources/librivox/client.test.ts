import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LibriVoxError,
  LibriVoxTimeoutError,
  REQUEST_SPACING_MS,
  __resetTransportState,
  buildQueryString,
  fetchProjects,
  requestJsonp,
  scanProjects,
} from './client';
import { LIBRIVOX_MAX_LIMIT } from './source';
import { RUSSIAN_PROJECT, COLLECTION_PROJECT } from './fixtures';

/**
 * Transport tests.
 *
 * The JSONP transport is exercised against a fake `document` that simulates the
 * browser's script loading, so no request ever reaches librivox.org. That keeps
 * the suite offline and free of load on a volunteer-run server.
 */

interface FakeScript {
  src: string;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  removed: boolean;
  /** Set by the stub; lets a test confirm the element was never attached. */
  attached?: boolean;
}

/**
 * Replaces `document` with a stub whose `createElement('script')` records the
 * request and lets the test decide when (and how) it completes.
 */
function installFakeDocument(
  respond: (url: string, script: FakeScript) => void,
): { scripts: FakeScript[]; head: { children: FakeScript[] } } {
  const scripts: FakeScript[] = [];
  const head = { children: [] as FakeScript[] };

  const fakeDocument = {
    createElement(tag: string) {
      if (tag !== 'script') throw new Error(`unexpected element ${tag}`);
      const script: FakeScript & { async?: boolean } = {
        src: '',
        onload: null,
        onerror: null,
        removed: false,
      };
      Object.defineProperty(script, 'remove', {
        value: () => {
          script.removed = true;
          const index = head.children.indexOf(script);
          if (index >= 0) head.children.splice(index, 1);
        },
      });
      scripts.push(script);
      return script;
    },
    head: {
      appendChild(node: FakeScript) {
        head.children.push(node);
        // Respond synchronously so the promise chain settles predictably.
        respond(node.src, node);
      },
    },
  };

  vi.stubGlobal('document', fakeDocument);
  return { scripts, head };
}

beforeEach(() => {
  __resetTransportState();
  vi.useRealTimers();
});

describe('buildQueryString', () => {
  it('always requests JSONP with a bounded limit', () => {
    const query = buildQueryString({ limit: 10 });
    expect(query).toContain('format=jsonp');
    expect(query).toContain('limit=10');
  });

  it('caps the limit at the API maximum', () => {
    // Requesting more than 500 returns HTTP 400 from the API.
    const query = buildQueryString({ limit: 5000 });
    expect(query).toContain(`limit=${LIBRIVOX_MAX_LIMIT}`);
  });

  it('passes through filters, since and sort order', () => {
    const query = buildQueryString({
      title: '^best',
      genre: 'Poetry',
      since: 1767225600,
      sortOrder: 'desc',
      extended: true,
      coverart: true,
      fields: ['id', 'title'],
      offset: 500,
    });
    expect(query).toContain('title=%5Ebest');
    expect(query).toContain('genre=Poetry');
    expect(query).toContain('since=1767225600');
    expect(query).toContain('sort_order=desc');
    expect(query).toContain('extended=1');
    expect(query).toContain('coverart=1');
    expect(query).toContain('fields=id%2Ctitle');
    expect(query).toContain('offset=500');
  });

  it('omits a zero offset so the first page is a plain request', () => {
    expect(buildQueryString({ offset: 0 })).not.toContain('offset');
  });
});

describe('requestJsonp', () => {
  it('resolves through the unique callback and cleans up', async () => {
    const { scripts } = installFakeDocument((url, script) => {
      const name = /callback=([^&]+)/.exec(url)?.[1] ?? '';
      const target = window as unknown as Record<string, unknown>;
      const call = (key: string, payload: unknown) =>
        (target[key] as ((value: unknown) => void) | undefined)?.(payload);
      call(name, { books: [{ id: '1' }] });
      script.onload?.();
    });

    const payload = await requestJsonp('format=jsonp');
    expect(payload).toEqual({ books: [{ id: '1' }] });

    // The script and the global callback must both be gone afterwards.
    expect(scripts).toHaveLength(1);
    expect(scripts[0].removed).toBe(true);
    const leftover = Object.keys(window as unknown as Record<string, unknown>).filter((key) =>
      key.startsWith('__oabLibriVox_'),
    );
    expect(leftover).toEqual([]);
  });

  it('uses a distinct callback name per request', async () => {
    const names: string[] = [];
    installFakeDocument((url, script) => {
      names.push(/callback=([^&]+)/.exec(url)?.[1] ?? '');
      const target = window as unknown as Record<string, unknown>;
      const call = (key: string, payload: unknown) =>
        (target[key] as ((value: unknown) => void) | undefined)?.(payload);
      call(names[names.length - 1], { books: [] });
      script.onload?.();
    });

    await requestJsonp('format=jsonp');
    await requestJsonp('format=jsonp');
    expect(names).toHaveLength(2);
    expect(names[0]).not.toBe(names[1]);
  });

  it('reports a transport failure', async () => {
    installFakeDocument((_url, script) => {
      script.onerror?.();
    });
    await expect(requestJsonp('format=jsonp')).rejects.toBeInstanceOf(LibriVoxError);
  });

  it('treats a load without a callback as "no results" (HTTP 404)', async () => {
    // The API signals an empty result set with HTTP 404 and a JSONP body.
    installFakeDocument((_url, script) => {
      script.onload?.();
    });
    await expect(requestJsonp('format=jsonp')).rejects.toMatchObject({ status: 404 });
  });

  it('times out instead of hanging forever', async () => {
    installFakeDocument(() => {
      /* never responds */
    });
    await expect(requestJsonp('format=jsonp', { timeoutMs: 10 })).rejects.toBeInstanceOf(
      LibriVoxTimeoutError,
    );
  });

  it('honours an abort signal', async () => {
    installFakeDocument(() => {
      /* never responds */
    });
    const controller = new AbortController();
    const pending = requestJsonp('format=jsonp', { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toThrow(/cancelled/i);
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const { scripts } = installFakeDocument(() => undefined);
    const controller = new AbortController();
    controller.abort();
    await expect(requestJsonp('format=jsonp', { signal: controller.signal })).rejects.toThrow(
      /cancelled/i,
    );
    expect(scripts).toHaveLength(0);
  });
});

describe('fetchProjects', () => {
  it('returns the books array', async () => {
    installFakeDocument((url, script) => {
      const name = /callback=([^&]+)/.exec(url)?.[1] ?? '';
      const target = window as unknown as Record<string, unknown>;
      const call = (key: string, payload: unknown) =>
        (target[key] as ((value: unknown) => void) | undefined)?.(payload);
      call(name, { books: [RUSSIAN_PROJECT] });
      script.onload?.();
    });
    await expect(fetchProjects({ id: '559' })).resolves.toHaveLength(1);
  });

  it('treats HTTP 404 as an empty list rather than an error', async () => {
    installFakeDocument((_url, script) => {
      script.onload?.();
    });
    await expect(fetchProjects({ title: '^nothing' })).resolves.toEqual([]);
  });

  it('tolerates an unexpected response shape', async () => {
    installFakeDocument((url, script) => {
      const name = /callback=([^&]+)/.exec(url)?.[1] ?? '';
      const target = window as unknown as Record<string, unknown>;
      const call = (key: string, payload: unknown) =>
        (target[key] as ((value: unknown) => void) | undefined)?.(payload);
      call(name, { unexpected: true });
      script.onload?.();
    });
    await expect(fetchProjects({ id: '1' })).resolves.toEqual([]);
  });

  it('drops non-object entries from the books array', async () => {
    installFakeDocument((url, script) => {
      const name = /callback=([^&]+)/.exec(url)?.[1] ?? '';
      const target = window as unknown as Record<string, unknown>;
      const call = (key: string, payload: unknown) =>
        (target[key] as ((value: unknown) => void) | undefined)?.(payload);
      call(name, { books: [null, RUSSIAN_PROJECT, 5] });
      script.onload?.();
    });
    await expect(fetchProjects({ id: '1' })).resolves.toHaveLength(1);
  });
});

describe('scanProjects', () => {
  /**
   * Reproduces the verified pagination defect: `offset` pages overlap and skip,
   * so ids 625–629 appear on two consecutive pages.
   */
  function installOverlappingPages(pageSize: number) {
    let calls = 0;
    installFakeDocument((url, script) => {
      const name = /callback=([^&]+)/.exec(url)?.[1] ?? '';
      const offset = Number(/offset=(\d+)/.exec(url)?.[1] ?? '0');
      const books = [];
      // Simulate the real overlap: page N starts a few rows before page N+1.
      for (let i = offset - 5; i < offset + pageSize; i += 1) {
        if (i < 0) continue;
        books.push({ id: String(i), title: `Book ${i}`, language: 'English' });
      }
      calls += 1;
      const target = window as unknown as Record<string, unknown>;
      const call = (key: string, payload: unknown) =>
        (target[key] as ((value: unknown) => void) | undefined)?.(payload);
      call(name, { books });
      script.onload?.();
    });
    return () => calls;
  }

  it('de-duplicates ids that appear on two pages', async () => {
    installOverlappingPages(10);
    const result = await scanProjects({ limit: 10 }, { maxPages: 2, timeoutMs: 50 });

    const ids = result.projects.map((project) => project.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.duplicatesSkipped).toBeGreaterThan(0);
  });

  it('stops on a short page and reports it is not truncated', async () => {
    installFakeDocument((url, script) => {
      const name = /callback=([^&]+)/.exec(url)?.[1] ?? '';
      const target = window as unknown as Record<string, unknown>;
      const call = (key: string, payload: unknown) =>
        (target[key] as ((value: unknown) => void) | undefined)?.(payload);
      call(name, { books: [{ id: '1' }, { id: '2' }] });
      script.onload?.();
    });
    const result = await scanProjects({ limit: 50 }, { maxPages: 5, timeoutMs: 50 });
    expect(result.pages).toBe(1);
    expect(result.truncated).toBe(false);
  });

  it('never exceeds the page cap', async () => {
    // A full catalogue must not be walked: the cap is the guarantee.
    const counter = installOverlappingPages(2);
    const result = await scanProjects({ limit: 2 }, { maxPages: 3, timeoutMs: 50 });
    expect(result.pages).toBeLessThanOrEqual(3);
    expect(counter()).toBeLessThanOrEqual(3);
  });

  it('flags truncation when the cap ends the scan', async () => {
    installFakeDocument((url, script) => {
      const name = /callback=([^&]+)/.exec(url)?.[1] ?? '';
      const target = window as unknown as Record<string, unknown>;
      const call = (key: string, payload: unknown) =>
        (target[key] as ((value: unknown) => void) | undefined)?.(payload);
      const offset = Number(/offset=(\d+)/.exec(url)?.[1] ?? '0');
      call(name, {
        books: [
          { id: String(offset * 10 + 1), language: 'English' },
          { id: String(offset * 10 + 2), language: 'English' },
        ],
      });
      script.onload?.();
    });
    const result = await scanProjects({ limit: 2 }, { maxPages: 2, timeoutMs: 50 });
    expect(result.truncated).toBe(true);
  });

  it('stops when a page contains nothing new', async () => {
    installFakeDocument((url, script) => {
      const name = /callback=([^&]+)/.exec(url)?.[1] ?? '';
      const target = window as unknown as Record<string, unknown>;
      const call = (key: string, payload: unknown) =>
        (target[key] as ((value: unknown) => void) | undefined)?.(payload);
      // The same full page every time: pagination has stalled.
      call(name, {
        books: [
          { id: '1', language: 'English' },
          { id: '2', language: 'English' },
        ],
      });
      script.onload?.();
    });
    const result = await scanProjects({ limit: 2 }, { maxPages: 5, timeoutMs: 50 });
    expect(result.projects).toHaveLength(2);
    expect(result.truncated).toBe(true);
    expect(result.pages).toBeLessThan(5);
  });

  it('preserves the records it did keep', async () => {
    installFakeDocument((url, script) => {
      const name = /callback=([^&]+)/.exec(url)?.[1] ?? '';
      const target = window as unknown as Record<string, unknown>;
      const call = (key: string, payload: unknown) =>
        (target[key] as ((value: unknown) => void) | undefined)?.(payload);
      call(name, { books: [COLLECTION_PROJECT] });
      script.onload?.();
    });
    const result = await scanProjects({ limit: 5 }, { maxPages: 1, timeoutMs: 50 });
    expect(result.projects[0].id).toBe('300');
  });
});

describe('request spacing', () => {
  it('keeps a courtesy delay between requests', () => {
    // LibriVox asks clients to separate requests by several seconds and may
    // return 429; the queue must therefore never fire two at once.
    expect(REQUEST_SPACING_MS).toBeGreaterThanOrEqual(1000);
  });
});
