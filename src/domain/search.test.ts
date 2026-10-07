import { describe, expect, it } from 'vitest';
import { buildIndex, searchEditions, editionsForNarrator } from './search';
import { devCatalogue } from '../data/devCatalogue';

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
    const editions = index.editionsByWorkId.get('dev:work:salt-and-lanterns') ?? [];
    expect(editions).toHaveLength(2);
    expect(new Set(editions.map((edition) => edition.narratorIds.join(','))).size).toBe(2);
  });

  it('lists every edition for a narrator across works and sources', () => {
    const editions = editionsForNarrator(index, 'dev:narrator:shared-narrator');
    const workIds = new Set(editions.map((edition) => edition.workId));
    expect(editions.length).toBeGreaterThanOrEqual(3);
    expect(workIds.size).toBeGreaterThanOrEqual(2);
  });

  it('sorts tracks by sequence', () => {
    const tracks = index.tracksByEditionId.get('dev:edition:salt-and-lanterns:archive-en') ?? [];
    expect(tracks.map((track) => track.sequence)).toEqual([1, 2, 3]);
  });
});

describe('search facets', () => {
  it('supports author + narrator together', () => {
    const results = searchEditions(index, {
      authorIds: ['dev:author:tobias-rell'],
      narratorIds: ['dev:narrator:oliver-brant'],
    });
    expect(results.map((view) => view.edition.id)).toEqual([
      'dev:edition:the-quiet-ledger:undetermined-de',
    ]);
  });

  it('supports genre + narrator', () => {
    const results = searchEditions(index, {
      genre: 'Historical',
      narratorIds: ['dev:narrator:shared-narrator'],
    });
    expect(results).toHaveLength(1);
    expect(results[0].work.title).toBe('The Quiet Ledger');
  });

  it('supports source + narrator', () => {
    const results = searchEditions(index, {
      sourceIds: ['dev:archive-open'],
      narratorIds: ['dev:narrator:oliver-brant'],
    });
    expect(results.map((view) => view.edition.id)).toEqual([
      'dev:edition:northern-grammar:archive-no',
    ]);
  });

  it('filters by language and series', () => {
    expect(searchEditions(index, { language: 'de' })).toHaveLength(1);
    // Two editions of book 1 plus one of book 2 in the same series.
    expect(searchEditions(index, { series: 'Ledger Trilogy' })).toHaveLength(3);
  });

  it('matches narrator names and aliases in free text', () => {
    const byAlias = searchEditions(index, { text: 'fontaine, mireille' });
    expect(byAlias.length).toBeGreaterThan(0);
  });

  it('matches track titles in free text', () => {
    const results = searchEditions(index, { text: 'kapitel 2' });
    expect(results.map((view) => view.edition.id)).toContain(
      'dev:edition:the-quiet-ledger:undetermined-de',
    );
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
});
