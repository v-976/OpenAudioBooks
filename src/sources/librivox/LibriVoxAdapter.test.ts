import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { LibriVoxAdapter } from './LibriVoxAdapter';
import { LIBRIVOX_SOURCE } from './source';
import {
  ALL_FIXTURES,
  COLLECTION_PROJECT,
  MULTILINGUAL_PROJECT,
  OLD_ENGLISH_PROJECT,
  RUSSIAN_PROJECT,
} from './fixtures';
import type { ScanResult } from './client';
import { resetDatabaseHandle } from '../../persistence/db';
import {
  cacheSize,
  clearProviderCache,
  isCacheStale,
  readCachedProjects,
  writeCachedProjects,
} from '../../persistence/catalogueCacheRepository';

/**
 * Adapter tests.
 *
 * The transport is injected, so nothing here touches librivox.org. That also
 * makes the tests independent of the network being available at all, which is
 * the situation the application must survive.
 */

function stubScan(projects = ALL_FIXTURES, overrides: Partial<ScanResult> = {}) {
  return vi.fn(async () => ({
    projects,
    pages: 1,
    truncated: false,
    duplicatesSkipped: 0,
    ...overrides,
  }));
}

beforeEach(() => {
  resetDatabaseHandle();
  globalThis.indexedDB = new IDBFactory();
});

describe('catalogueFrom', () => {
  it('maps every fixture into one normalised catalogue', () => {
    const adapter = new LibriVoxAdapter({ scan: stubScan() });
    const catalogue = adapter.catalogueFrom(ALL_FIXTURES);

    expect(catalogue.works).toHaveLength(ALL_FIXTURES.length);
    expect(catalogue.audioEditions).toHaveLength(ALL_FIXTURES.length);
    // Not development data: these are real provider records.
    expect(catalogue.isDevelopmentData).toBe(false);
    expect(catalogue.sources.map((source) => source.id)).toContain('librivox');
  });

  it('merges a reader who performed many books into one narrator', () => {
    const adapter = new LibriVoxAdapter({ scan: stubScan() });
    const catalogue = adapter.catalogueFrom([RUSSIAN_PROJECT, COLLECTION_PROJECT]);

    const ben = catalogue.narrators.filter((narrator) => narrator.name === 'Ben Douglas');
    expect(ben).toHaveLength(1);
    // ...and both editions point at that one record.
    const editionsWithBen = catalogue.audioEditions.filter((edition) =>
      edition.narratorIds.includes(ben[0].id),
    );
    expect(editionsWithBen.length).toBeGreaterThanOrEqual(1);
  });

  it('supports several narrators on one edition', () => {
    const adapter = new LibriVoxAdapter({ scan: stubScan() });
    const catalogue = adapter.catalogueFrom([COLLECTION_PROJECT]);
    const edition = catalogue.audioEditions.find((item) => item.id === 'librivox:edition:300');
    // Four distinct readers across the four sections.
    expect(edition?.narratorIds).toHaveLength(3);
  });

  it('records tracks with remote audio urls only', () => {
    const adapter = new LibriVoxAdapter({ scan: stubScan() });
    const catalogue = adapter.catalogueFrom(ALL_FIXTURES);
    for (const track of catalogue.tracks) {
      expect(track.audioUrl.startsWith('https://')).toBe(true);
    }
  });

  it('drops projects that cannot be mapped', () => {
    const adapter = new LibriVoxAdapter({ scan: stubScan() });
    const catalogue = adapter.catalogueFrom([{ id: '', title: '' }, RUSSIAN_PROJECT]);
    expect(catalogue.works).toHaveLength(1);
  });
});

describe('loadCatalogue', () => {
  it('requests extended projects so the catalogue contains real chapters and MP3 URLs', async () => {
    const scan = stubScan([RUSSIAN_PROJECT]);
    const adapter = new LibriVoxAdapter({ scan, maxPages: 1 });

    const catalogue = await adapter.loadCatalogue();

    expect(scan).toHaveBeenCalledWith(
      expect.objectContaining({ extended: true, coverart: true }),
      expect.any(Object),
    );
    expect(catalogue.tracks).toHaveLength(3);
    expect(catalogue.tracks[0].audioUrl).toBe(
      'https://www.archive.org/download/notes_underground_russian/01-dostoevsky-zapiski-iz-podpolya-I-01-02_64kb.mp3',
    );
  });

  it('fetches once on a cold start and caches the result', async () => {
    const scan = stubScan();
    const adapter = new LibriVoxAdapter({ scan, maxPages: 1 });

    const first = await adapter.loadCatalogue();
    expect(first.audioEditions.length).toBeGreaterThan(0);
    expect(await cacheSize('librivox')).toBe(first.audioEditions.length);

    // A second cold load must come from the cache, not the network.
    const second = await adapter.loadCatalogue();
    expect(second.audioEditions.length).toBe(first.audioEditions.length);
    expect(scan).toHaveBeenCalledTimes(1);
  });

  it('refetches on an explicit refresh', async () => {
    const scan = stubScan();
    const adapter = new LibriVoxAdapter({ scan, maxPages: 1 });

    await adapter.loadCatalogue();
    await adapter.loadCatalogue({ refresh: true });
    expect(scan).toHaveBeenCalledTimes(2);
  });

  it('replaces the broken Alpha 0.2.0 cache shape that omitted sections', async () => {
    const brokenProject = { ...RUSSIAN_PROJECT };
    delete brokenProject.sections;
    await writeCachedProjects([
      {
        id: String(brokenProject.id),
        project: brokenProject,
        fetchedAt: '2026-10-08T00:00:00.000Z',
      },
    ]);
    const scan = stubScan([RUSSIAN_PROJECT]);
    const adapter = new LibriVoxAdapter({ scan, maxPages: 1 });

    const catalogue = await adapter.loadCatalogue();

    expect(scan).toHaveBeenCalledTimes(1);
    expect(catalogue.tracks).toHaveLength(3);
    expect((await readCachedProjects())[0].project.sections).toHaveLength(3);
  });

  it('shares one in-flight scan between concurrent callers', async () => {
    // Several screens mounting at once must not multiply requests. The scan is
    // held open so the concurrency window is real rather than instantaneous.
    let release: (value: ScanResult) => void = () => undefined;
    const scan = vi.fn(
      () =>
        new Promise<ScanResult>((resolve) => {
          release = resolve;
        }),
    );
    const adapter = new LibriVoxAdapter({ scan, maxPages: 1 });

    const pending = Promise.all([
      adapter.loadCatalogue(),
      adapter.loadCatalogue(),
      adapter.loadCatalogue(),
    ]);

    // Wait until the shared scan has actually started, then give the other two
    // callers time to finish their cache read and join it.
    const tick = () => new Promise((resolve) => setTimeout(resolve, 1));
    for (let attempt = 0; attempt < 200 && scan.mock.calls.length === 0; attempt += 1) {
      await tick();
    }
    expect(scan).toHaveBeenCalledTimes(1);
    for (let attempt = 0; attempt < 10; attempt += 1) await tick();

    release({
      projects: ALL_FIXTURES,
      pages: 1,
      truncated: false,
      duplicatesSkipped: 0,
    });

    await pending;
    expect(scan).toHaveBeenCalledTimes(1);
  });

  it('records a truncated scan so the UI can qualify its claims', async () => {
    const adapter = new LibriVoxAdapter({
      scan: stubScan(ALL_FIXTURES, { truncated: true }),
      maxPages: 1,
    });
    await adapter.loadCatalogue();
    expect(adapter.getScanState()?.truncated).toBe(true);
  });

  it('works with no cached data and no network', async () => {
    const scan = vi.fn(async () => {
      throw new Error('offline');
    });
    const adapter = new LibriVoxAdapter({ scan });
    await expect(adapter.loadCatalogue()).rejects.toThrow('offline');
    // The cache is untouched, so playback state and any earlier cache survive.
    expect(await cacheSize('librivox')).toBe(0);
  });
});

describe('cache behaviour', () => {
  it('stores metadata only, with no audio', async () => {
    await new LibriVoxAdapter({ scan: stubScan(), maxPages: 1 }).loadCatalogue();
    const cached = await readCachedProjects();
    expect(cached.length).toBeGreaterThan(0);
    for (const record of cached) {
      expect(record.project).toBeTruthy();
      // A cached record must never carry audio bytes or a local audio path.
      expect(JSON.stringify(record).includes('data:audio')).toBe(false);
    }
  });

  it('treats an empty cache as stale and a fresh one as current', async () => {
    expect(await isCacheStale('librivox')).toBe(true);
    await new LibriVoxAdapter({ scan: stubScan(), maxPages: 1 }).loadCatalogue();
    expect(await isCacheStale('librivox')).toBe(false);
  });

  it('clears provider metadata without touching anything else', async () => {
    await new LibriVoxAdapter({ scan: stubScan(), maxPages: 1 }).loadCatalogue();
    expect(await cacheSize('librivox')).toBeGreaterThan(0);

    await clearProviderCache('librivox');
    expect(await cacheSize('librivox')).toBe(0);
  });
});

describe('narrator-first invariants', () => {
  it('resolves narrators as entities, never as text on a book', async () => {
    const adapter = new LibriVoxAdapter({ scan: stubScan() });
    const catalogue = adapter.catalogueFrom([COLLECTION_PROJECT]);
    for (const edition of catalogue.audioEditions) {
      for (const narratorId of edition.narratorIds) {
        expect(catalogue.narrators.some((narrator) => narrator.id === narratorId)).toBe(true);
      }
    }
  });

  it('never attaches LibriVox audio to a development-fixture edition', async () => {
    const adapter = new LibriVoxAdapter({ scan: stubScan() });
    const catalogue = adapter.catalogueFrom(ALL_FIXTURES);
    for (const edition of catalogue.audioEditions) {
      expect(edition.sourceId).toBe('librivox');
      expect(edition.id.startsWith('librivox:')).toBe(true);
    }
  });
});

describe('language handling', () => {
  it('keeps a Russian project in Russian despite the section-language defect', () => {
    const adapter = new LibriVoxAdapter({ scan: stubScan() });
    const catalogue = adapter.catalogueFrom([RUSSIAN_PROJECT]);
    expect(catalogue.audioEditions[0].narrationLanguage).toBe('ru');
  });

  it('omits a narration language for Multilingual and Old English projects', () => {
    const adapter = new LibriVoxAdapter({ scan: stubScan() });
    const catalogue = adapter.catalogueFrom([MULTILINGUAL_PROJECT, OLD_ENGLISH_PROJECT]);
    for (const edition of catalogue.audioEditions) {
      expect(edition.narrationLanguage).toBeUndefined();
    }
  });

  it('never populates Work.originalLanguage from the narration language', () => {
    const adapter = new LibriVoxAdapter({ scan: stubScan() });
    const catalogue = adapter.catalogueFrom([RUSSIAN_PROJECT, COLLECTION_PROJECT]);
    for (const work of catalogue.works) {
      expect(work.originalLanguage).toBeUndefined();
    }
  });
});

describe('rights and attribution', () => {
  it('reports public domain with attribution naming LibriVox and the reader', () => {
    const adapter = new LibriVoxAdapter({ scan: stubScan() });
    const catalogue = adapter.catalogueFrom([RUSSIAN_PROJECT]);
    const edition = catalogue.audioEditions[0];
    expect(edition.rightsStatus).toBe('publicDomain');
    expect(edition.attribution).toContain('LibriVox');
    expect(edition.attribution).toContain('Yakovlev Valery');
  });

  it('exposes the source record with LibriVox\'s own statement', () => {
    expect(LIBRIVOX_SOURCE.rightsStatus).toBe('publicDomain');
    expect(LIBRIVOX_SOURCE.sourceType).toBe('publicDomainArchive');
    expect(LIBRIVOX_SOURCE.licenseUrl).toContain('librivox.org');
  });
});

describe('SourceAdapter contract', () => {
  it('is not development data', () => {
    const adapter = new LibriVoxAdapter({ scan: stubScan() });
    expect(adapter.isDevelopmentData).toBe(false);
    expect(adapter.id).toBe('librivox');
  });

  it('lists works, editions, narrators and tracks through the contract', async () => {
    const adapter = new LibriVoxAdapter({ scan: stubScan(), maxPages: 1 });

    const works = await adapter.listWorks({ text: 'monte' });
    expect(works.items.map((work) => work.title)).toEqual(['Count of Monte Cristo']);

    const editions = await adapter.listAudioEditions('librivox:work:559');
    expect(editions.items).toHaveLength(1);

    const narrators = await adapter.listNarrators('librivox:edition:559');
    expect(narrators[0].name).toBe('Yakovlev Valery');

    const tracks = await adapter.listTracks('librivox:edition:559');
    expect(tracks).toHaveLength(3);
    expect(tracks.map((track) => track.sequence)).toEqual([1, 2, 3]);

    const bundle = await adapter.getEdition('librivox:edition:559');
    expect(bundle?.work.title).toBe('Zapiski iz podpolya (Notes from the Underground)');
    expect(bundle?.tracks).toHaveLength(3);
  });

  it('accepts a bare provider id as well as a namespaced one', async () => {
    const adapter = new LibriVoxAdapter({ scan: stubScan(), maxPages: 1 });
    const bundle = await adapter.getEdition('559');
    expect(bundle?.edition.id).toBe('librivox:edition:559');
  });

  it('returns nothing for an unknown edition', async () => {
    const adapter = new LibriVoxAdapter({ scan: stubScan(), maxPages: 1 });
    await expect(adapter.getEdition('librivox:edition:999999')).resolves.toBeUndefined();
  });
});
