import { describe, expect, it } from 'vitest';
import {
  availableNarrationLanguages,
  buildIndex,
  editionsForNarrator,
  searchEditions,
  editionsInNarrationLanguage,
} from './search';
import { devCatalogue } from '../data/devCatalogue';
import { normalizeLanguageCode } from './language';

const index = buildIndex(devCatalogue);

describe('catalogue index', () => {
  it('resolves every edition to a work and every track to an edition', () => {
    for (const edition of devCatalogue.audioEditions) {
      expect(index.worksById.has(edition.workId)).toBe(true);
    }
    for (const track of devCatalogue.tracks) {
      expect(index.editionsById.has(track.audioEditionId)).toBe(true);
    }
  });

  it('keeps narrators as first-class entities rather than free text', () => {
    // Every narrator reference resolves to a real Narrator record.
    for (const edition of devCatalogue.audioEditions) {
      for (const narratorId of edition.narratorIds) {
        expect(index.narratorsById.has(narratorId)).toBe(true);
      }
    }
  });

  it('groups multiple editions under a single work', () => {
    const editions = index.editionsByWorkId.get('dev:work:mysterious-lighthouse') ?? [];
    expect(editions.length).toBeGreaterThanOrEqual(3);
    expect(new Set(editions.map((edition) => edition.narratorIds.join(','))).size).toBe(
      editions.length,
    );
  });

  it('lists every edition for a narrator across works and sources', () => {
    const editions = editionsForNarrator(index, 'dev:narrator:shared-narrator');
    const workIds = new Set(editions.map((edition) => edition.workId));
    expect(editions.length).toBeGreaterThanOrEqual(3);
    expect(workIds.size).toBeGreaterThanOrEqual(2);
  });

  it('sorts tracks by sequence', () => {
    const tracks =
      index.tracksByEditionId.get('dev:edition:mysterious-lighthouse:ru') ?? [];
    expect(tracks.map((track) => track.sequence)).toEqual([1, 2, 3]);
  });
});

describe('language architecture', () => {
  it('keeps Work originalLanguage independent from AudioEdition narrationLanguage', () => {
    // An English original work with a Russian narration. The two fields must not
    // be collapsed into one another.
    const work = index.worksById.get('dev:work:mysterious-lighthouse');
    expect(work?.originalLanguage).toBe('en');

    const ru = index.editionsById.get('dev:edition:mysterious-lighthouse:ru');
    expect(ru?.narrationLanguage).toBe('ru');
    // The edition must not overwrite the work's original language.
    expect(index.worksById.get('dev:work:mysterious-lighthouse')?.originalLanguage).toBe('en');
  });

  it('allows a work to omit its original language entirely', () => {
    const work = index.worksById.get('dev:work:quiet-ledger');
    expect(work).toBeDefined();
    expect(work?.originalLanguage).toBeUndefined();
    // ...while still having editions in more than one narration language.
    const languages = (index.editionsByWorkId.get('dev:work:quiet-ledger') ?? []).map(
      (edition) => edition.narrationLanguage,
    );
    expect(new Set(languages).size).toBeGreaterThanOrEqual(2);
  });

  it('gives one work several audio editions in different narration languages', () => {
    const editions = index.editionsByWorkId.get('dev:work:mysterious-lighthouse') ?? [];
    const languages = editions.map((edition) => edition.narrationLanguage);
    expect(languages).toContain('ru');
    expect(languages).toContain('en');
    expect(languages).toContain('fi');
    // Different narrators per language.
    const narrators = new Set(editions.map((edition) => edition.narratorIds.join(',')));
    expect(narrators.size).toBe(editions.length);
  });

  it('narration language can differ from original language in both directions', () => {
    // Finnish original narrated in Russian.
    const work = index.worksById.get('dev:work:quiet-harbour');
    expect(work?.originalLanguage).toBe('fi');
    const ruEdition = index.editionsById.get('dev:edition:quiet-harbour:ru');
    expect(ruEdition?.narrationLanguage).toBe('ru');
  });

  it('stores every narration language in normalised form', () => {
    for (const edition of devCatalogue.audioEditions) {
      expect(normalizeLanguageCode(edition.narrationLanguage)).toBe(edition.narrationLanguage);
    }
  });

  it('uses root-relative audio URLs so playback works from any route', () => {
    // A relative fixture URL would resolve against the current path and 404 on
    // every screen except the library root.
    for (const track of devCatalogue.tracks) {
      expect(track.audioUrl.startsWith('/')).toBe(true);
      expect(track.audioUrl.startsWith('//')).toBe(false);
    }
  });
});

describe('narration language filtering', () => {
  it('filters on narration language only', () => {
    const russian = searchEditions(index, { narrationLanguages: ['ru'] });
    expect(russian.length).toBeGreaterThan(0);
    for (const view of russian) {
      expect(view.edition.narrationLanguage).toBe('ru');
    }
  });

  it('does not treat an omitted language list as "no language has this value"', () => {
    // Omitted means "do not filter", which is different from an empty match set.
    expect(searchEditions(index, {}).length).toBe(devCatalogue.audioEditions.length);
    expect(searchEditions(index, { narrationLanguages: [] }).length).toBe(
      devCatalogue.audioEditions.length,
    );
    expect(searchEditions(index, { narrationLanguages: ['zz'] })).toEqual([]);
  });

  it('supports multi-language selection', () => {
    const multi = searchEditions(index, { narrationLanguages: ['ru', 'fi'] });
    for (const view of multi) {
      expect(['ru', 'fi']).toContain(view.edition.narrationLanguage);
    }
    expect(multi.length).toBe(
      editionsInNarrationLanguage(index, 'ru').length +
        editionsInNarrationLanguage(index, 'fi').length,
    );
  });

  it('combines narrator with narration language', () => {
    const results = searchEditions(index, {
      narratorIds: ['dev:narrator:aino-virtanen'],
      narrationLanguages: ['ru'],
    });
    // Aino Virtanen only performs Finnish audio in the fixtures.
    expect(results).toEqual([]);

    const finnish = searchEditions(index, {
      narratorIds: ['dev:narrator:aino-virtanen'],
      narrationLanguages: ['fi'],
    });
    expect(finnish).toHaveLength(2);
  });

  it('combines author, genre and source with narration language', () => {
    const byAuthor = searchEditions(index, {
      authorIds: ['dev:author:harriet-vane'],
      narrationLanguages: ['ru'],
    });
    expect(byAuthor.map((view) => view.edition.id)).toEqual([
      'dev:edition:mysterious-lighthouse:ru',
    ]);

    const byGenre = searchEditions(index, {
      genre: 'Детектив',
      narrationLanguages: ['en'],
    });
    expect(byGenre.map((view) => view.edition.id)).toEqual([
      'dev:edition:mysterious-lighthouse:en',
    ]);

    const bySource = searchEditions(index, {
      sourceIds: ['dev:undetermined-rights'],
      narrationLanguages: ['ru'],
    });
    // The unknown-rights source only hosts a German edition.
    expect(bySource).toEqual([]);
  });

  it('reports the languages actually present in the catalogue', () => {
    const languages = availableNarrationLanguages(index);
    expect(languages).toContain('ru');
    expect(languages).toContain('en');
    expect(languages).toContain('fi');
    expect(languages).toContain('de');
  });

  it('does not filter by Work.originalLanguage', () => {
    // The English-original work has Russian audio; filtering by narration must
    // include it even though the work language is not selected.
    const russian = searchEditions(index, { narrationLanguages: ['ru'] });
    const titles = russian.map((view) => view.work.title);
    expect(titles).toContain('Тайна маяка');
  });
});

describe('search facets', () => {
  it('supports author + narrator together', () => {
    const results = searchEditions(index, {
      authorIds: ['dev:author:tobias-rell'],
      narratorIds: ['dev:narrator:oliver-brant'],
    });
    expect(results.map((view) => view.edition.id)).toEqual([
      'dev:edition:quiet-ledger:de',
    ]);
  });

  it('supports genre + narrator', () => {
    const results = searchEditions(index, {
      genre: 'Историческая проза',
      narratorIds: ['dev:narrator:anastasia-petrova'],
    });
    expect(results).toHaveLength(1);
    expect(results[0].work.title).toBe('Тихая книга');
  });

  it('supports source + narrator', () => {
    const results = searchEditions(index, {
      sourceIds: ['dev:archive-open'],
      narratorIds: ['dev:narrator:oliver-brant'],
    });
    expect(results.map((view) => view.edition.id)).toEqual([
      'dev:edition:northern-grammar:ru',
    ]);
  });

  it('filters by series', () => {
    // Two editions of book 1 plus one of book 2 in the same series.
    expect(searchEditions(index, { series: 'Трилогия о книге' })).toHaveLength(3);
  });

  it('matches narrator names and aliases in free text', () => {
    const byAlias = searchEditions(index, { text: 'fontaine, mireille' });
    expect(byAlias.length).toBeGreaterThan(0);
    // Cyrillic alias for the Russian-titled narrator.
    expect(searchEditions(index, { text: 'Д. Салазар' }).length).toBeGreaterThan(0);
  });

  it('matches track titles in free text', () => {
    const results = searchEditions(index, { text: 'kapitel 2' });
    expect(results.map((view) => view.edition.id)).toContain('dev:edition:quiet-ledger:de');
  });

  it('returns nothing for an unmatched query', () => {
    expect(searchEditions(index, { text: 'zzzz-not-present' })).toEqual([]);
  });
});

describe('rights metadata', () => {
  it('never marks an unknown-rights edition as public domain', () => {
    const unknown = devCatalogue.audioEditions.filter(
      (edition) => edition.rightsStatus === 'unknown',
    );
    expect(unknown.length).toBeGreaterThan(0);
    for (const edition of unknown) {
      expect(edition.rightsStatus).not.toBe('publicDomain');
    }
  });

  it('carries attribution and a source url on every edition', () => {
    for (const edition of devCatalogue.audioEditions) {
      expect(edition.sourceUrl).toBeTruthy();
      const source = index.sourcesById.get(edition.sourceId);
      expect(source?.attribution).toBeTruthy();
    }
  });

  it('keeps "free to listen" distinct from public domain across languages', () => {
    const statuses = new Set(devCatalogue.audioEditions.map((edition) => edition.rightsStatus));
    expect(statuses.has('publicDomain')).toBe(true);
    expect(statuses.has('licensedFree')).toBe(true);
    expect(statuses.has('unknown')).toBe(true);
    expect(statuses.has('permissionGranted')).toBe(true);
  });
});
