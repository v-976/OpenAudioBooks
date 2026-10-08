import { describe, expect, it } from 'vitest';
import {
  buildIndex,
  editionDurationForQuery,
  isDurationRangeActive,
  matchesDurationRange,
  searchEditions,
  sortEditionViews,
  type EditionView,
} from './search';
import type { Catalogue } from './types';
import {
  DURATION_PRESETS,
  HOUR,
  MINUTE,
  formatDurationShort,
  isRangeContradictory,
  presetIdForRange,
  rangeFromMinutes,
  rangeFromPreset,
} from './durationPresets';

/**
 * A small hand-built catalogue with known durations, so filtering and sorting
 * can be asserted exactly.
 *
 * `short` 10 min, `mid` 45 min, `long` 3 h, `veryLong` 12 h, `unknown` none.
 */
function makeCatalogue(): Catalogue {
  const work = (id: string, genres: string[] = ['Fiction']): Catalogue['works'][number] => ({
    id: `w:${id}`,
    title: `Work ${id}`,
    authorIds: ['a:1'],
    genres,
  });

  const edition = (
    id: string,
    durationSeconds: number | undefined,
    narrationLanguage = 'ru',
  ): Catalogue['audioEditions'][number] => ({
    id: `e:${id}`,
    workId: `w:${id}`,
    narratorIds: ['n:1'],
    sourceId: 's:1',
    ...(durationSeconds === undefined ? {} : { durationSeconds }),
    rightsStatus: 'publicDomain',
    ...(narrationLanguage ? { narrationLanguage } : {}),
  });

  return {
    authors: [{ id: 'a:1', name: 'Author One' }],
    works: [
      work('short'),
      work('mid'),
      work('long'),
      work('veryLong'),
      work('unknown'),
      work('nolang', ['Drama']),
      work('english'),
    ],
    narrators: [
      { id: 'n:1', name: 'Narrator One', aliases: [] },
      { id: 'n:2', name: 'Narrator Two', aliases: [] },
    ],
    sources: [
      {
        id: 's:1',
        name: 'Source One',
        sourceUrl: 'https://example.invalid',
        sourceType: 'other',
        rightsStatus: 'publicDomain',
      },
    ],
    audioEditions: [
      edition('short', 10 * MINUTE),
      edition('mid', 45 * MINUTE),
      edition('long', 3 * HOUR),
      edition('veryLong', 12 * HOUR),
      edition('unknown', undefined),
      // No narration language at all, e.g. a "Multilingual" recording.
      edition('nolang', 20 * MINUTE, ''),
      edition('english', 5 * MINUTE, 'en'),
    ],
    tracks: [],
    isDevelopmentData: false,
  };
}

const index = buildIndex(makeCatalogue());
const all = searchEditions(index, { narrationLanguages: [] });

/**
 * Title order of the fixture works, which is the default (`catalogue`) order.
 * Used where a test asserts a filtered SET rather than a ranking.
 */
const BY_TITLE = [
  'e:english',
  'e:long',
  'e:mid',
  'e:nolang',
  'e:short',
  'e:unknown',
  'e:veryLong',
];

function ids(views: EditionView[]): string[] {
  return views.map((view) => view.edition.id);
}

describe('duration range filtering', () => {
  it('recognises an inactive range', () => {
    expect(isDurationRangeActive(undefined)).toBe(false);
    expect(isDurationRangeActive({})).toBe(false);
    expect(isDurationRangeActive({ minSeconds: 10 })).toBe(true);
    expect(isDurationRangeActive({ maxSeconds: 10 })).toBe(true);
  });

  it('filters by a minimum', () => {
    const results = searchEditions(index, {
      narrationLanguages: [],
      durationRange: { minSeconds: 45 * MINUTE },
    });
    // Set equality in the default title order.
    expect(ids(results)).toEqual(['e:long', 'e:mid', 'e:veryLong']);
  });

  it('filters by a maximum', () => {
    const results = searchEditions(index, {
      narrationLanguages: [],
      durationRange: { maxSeconds: 45 * MINUTE },
    });
    expect(ids(results)).toEqual(['e:english', 'e:mid', 'e:nolang', 'e:short']);
  });

  it('filters by a bounded range', () => {
    const results = searchEditions(index, {
      narrationLanguages: [],
      durationRange: { minSeconds: 20 * MINUTE, maxSeconds: 3 * HOUR },
    });
    expect(ids(results)).toEqual(['e:long', 'e:mid', 'e:nolang']);
  });

  it('keeps every record the default order lists, for reference', () => {
    expect(ids(all)).toEqual(BY_TITLE);
  });

  it('excludes an unknown duration whenever a range is active', () => {
    // An unknown length cannot be shown to lie inside a range.
    const withFilter = searchEditions(index, {
      narrationLanguages: [],
      durationRange: { minSeconds: 1 },
    });
    expect(ids(withFilter)).not.toContain('e:unknown');

    // ...and keeps it visible when no range is applied.
    expect(ids(all)).toContain('e:unknown');
    expect(matchesDurationRange({ edition: { durationSeconds: undefined } } as never, undefined)).toBe(
      true,
    );
  });

  it('treats the bounds as inclusive', () => {
    const exactly = searchEditions(index, {
      narrationLanguages: [],
      durationRange: { minSeconds: 45 * MINUTE, maxSeconds: 45 * MINUTE },
    });
    expect(ids(exactly)).toEqual(['e:mid']);
  });

  it('falls back to a complete track list when the edition total is absent', () => {
    const withTracks = buildIndex({
      ...makeCatalogue(),
      audioEditions: [
        {
          id: 'e:summed',
          workId: 'w:mid',
          narratorIds: [],
          sourceId: 's:1',
          rightsStatus: 'publicDomain',
        },
      ],
      tracks: [
        { id: 't:1', audioEditionId: 'e:summed', title: 'One', sequence: 1, durationSeconds: 600, audioUrl: 'a' },
        { id: 't:2', audioEditionId: 'e:summed', title: 'Two', sequence: 2, durationSeconds: 600, audioUrl: 'b' },
      ],
    });
    const results = searchEditions(withTracks, {
      narrationLanguages: [],
      durationRange: { minSeconds: 15 * MINUTE, maxSeconds: 25 * MINUTE },
    });
    expect(ids(results)).toEqual(['e:summed']);
  });

  it('combines duration with language and narrator facets', () => {
    const results = searchEditions(index, {
      narrationLanguages: ['ru'],
      narratorIds: ['n:1'],
      durationRange: { maxSeconds: 15 * MINUTE },
    });
    expect(ids(results)).toEqual(['e:short']);
  });

  it('combines duration with a genre facet', () => {
    const results = searchEditions(index, {
      narrationLanguages: [],
      genre: 'Drama',
      durationRange: { minSeconds: 20 * MINUTE },
    });
    expect(ids(results)).toEqual(['e:nolang']);
  });
});

describe('preset ranges', () => {
  it('never overlap at the seams', () => {
    // A book of exactly 30 minutes belongs to "30–60" and not to "15–30":
    // consecutive presets must tile the timeline without double-counting.
    const at30 = searchEditions(index, {
      narrationLanguages: [],
      durationRange: rangeFromPreset('15to30'),
    });
    const at60 = searchEditions(index, {
      narrationLanguages: [],
      durationRange: rangeFromPreset('30to60'),
    });
    const overlap = ids(at30).filter((id) => ids(at60).includes(id));
    expect(overlap).toEqual([]);

    const midIndex = buildIndex({
      ...makeCatalogue(),
      audioEditions: [
        {
          id: 'e:30',
          workId: 'w:mid',
          narratorIds: [],
          sourceId: 's:1',
          rightsStatus: 'publicDomain',
          durationSeconds: 30 * MINUTE,
        },
      ],
    });
    const inA = searchEditions(midIndex, { narrationLanguages: [], durationRange: rangeFromPreset('15to30') });
    const inB = searchEditions(midIndex, { narrationLanguages: [], durationRange: rangeFromPreset('30to60') });
    expect(ids(inA)).toEqual([]);
    expect(ids(inB)).toEqual(['e:30']);
  });

  it('assigns the last second of a bucket to the lower preset', () => {
    const justUnder = buildIndex({
      ...makeCatalogue(),
      audioEditions: [
        {
          id: 'e:2999',
          workId: 'w:mid',
          narratorIds: [],
          sourceId: 's:1',
          rightsStatus: 'publicDomain',
          durationSeconds: 30 * MINUTE - 1,
        },
      ],
    });
    const inA = searchEditions(justUnder, { narrationLanguages: [], durationRange: rangeFromPreset('15to30') });
    const inB = searchEditions(justUnder, { narrationLanguages: [], durationRange: rangeFromPreset('30to60') });
    expect(ids(inA)).toEqual(['e:2999']);
    expect(ids(inB)).toEqual([]);
  });

  it('covers the documented preset list', () => {
    expect(DURATION_PRESETS.map((preset) => preset.id)).toEqual([
      'under15',
      '15to30',
      '30to60',
      '1to3h',
      '3to10h',
      'over10h',
    ]);
  });

  it('builds a custom range from minutes', () => {
    expect(rangeFromMinutes(20, 45)).toEqual({
      minSeconds: 20 * MINUTE,
      maxSeconds: 45 * MINUTE,
    });
    expect(rangeFromMinutes(0, 0)).toBeUndefined();
    expect(rangeFromMinutes(30, 10)).toBeUndefined();
  });

  it('detects a contradictory range', () => {
    expect(isRangeContradictory(45, 20)).toBe(true);
    expect(isRangeContradictory(20, 45)).toBe(false);
    expect(isRangeContradictory(0, 10)).toBe(false);
  });

  it('round-trips a preset through its range', () => {
    for (const preset of DURATION_PRESETS) {
      expect(presetIdForRange(rangeFromPreset(preset.id))).toBe(preset.id);
    }
    expect(presetIdForRange(undefined)).toBe('any');
    expect(presetIdForRange({ minSeconds: 777, maxSeconds: 999 })).toBe('custom');
  });
});

describe('duration sorting', () => {
  it('sorts shortest first', () => {
    const sorted = sortEditionViews(all, 'shortest');
    // 5 min (en), 10, 20, 45 min, 3 h, 12 h, then the unknown duration.
    expect(ids(sorted)).toEqual([
      'e:english',
      'e:short',
      'e:nolang',
      'e:mid',
      'e:long',
      'e:veryLong',
      'e:unknown',
    ]);
  });

  it('sorts longest first', () => {
    const sorted = sortEditionViews(all, 'longest');
    expect(ids(sorted)).toEqual([
      'e:veryLong',
      'e:long',
      'e:mid',
      'e:nolang',
      'e:short',
      'e:english',
      'e:unknown',
    ]);
  });

  it('places unknown durations last in both directions', () => {
    // "Shortest" must never lead with a book whose length is simply unknown.
    expect(ids(sortEditionViews(all, 'shortest')).at(-1)).toBe('e:unknown');
    expect(ids(sortEditionViews(all, 'longest')).at(-1)).toBe('e:unknown');
  });

  it('breaks ties on title then id, stably', () => {
    const tied = buildIndex({
      ...makeCatalogue(),
      works: [
        { id: 'w:a', title: 'Same Title', authorIds: [], genres: [] },
        { id: 'w:b', title: 'Same Title', authorIds: [], genres: [] },
        { id: 'w:c', title: 'Another', authorIds: [], genres: [] },
      ],
      audioEditions: [
        { id: 'e:zzz', workId: 'w:a', narratorIds: [], sourceId: 's:1', rightsStatus: 'publicDomain', durationSeconds: 600 },
        { id: 'e:aaa', workId: 'w:b', narratorIds: [], sourceId: 's:1', rightsStatus: 'publicDomain', durationSeconds: 600 },
        { id: 'e:c', workId: 'w:c', narratorIds: [], sourceId: 's:1', rightsStatus: 'publicDomain', durationSeconds: 600 },
      ],
    });
    const views = searchEditions(tied, { narrationLanguages: [] });
    const ascending = sortEditionViews(views, 'shortest');
    const descending = sortEditionViews(views, 'longest');
    // Equal durations fall back to title then id, identically in both orders.
    expect(ids(ascending)).toEqual(ids(descending));
    expect(ids(ascending)).toEqual(['e:c', 'e:aaa', 'e:zzz']);
  });

  it('does not mutate the input array', () => {
    const before = ids(all);
    sortEditionViews(all, 'longest');
    expect(ids(all)).toEqual(before);
  });

  it('applies after filters', () => {
    const results = searchEditions(index, {
      narrationLanguages: ['ru'],
      durationRange: { minSeconds: 1 * MINUTE },
      sort: 'longest',
    });
    // Both the English-only edition and the edition with no verified narration
    // language are filtered out before sorting, so ranking sees four records.
    expect(ids(results)).toEqual(['e:veryLong', 'e:long', 'e:mid', 'e:short']);
  });

  it('still excludes an unknown duration from a sorted result', () => {
    const results = searchEditions(index, {
      narrationLanguages: [],
      durationRange: { minSeconds: 1 * MINUTE },
      sort: 'shortest',
    });
    expect(ids(results)).not.toContain('e:unknown');
  });

  it('does not break the language filter', () => {
    const results = searchEditions(index, { narrationLanguages: ['en'], sort: 'shortest' });
    expect(ids(results)).toEqual(['e:english']);
  });

  it('excludes editions with no narration language from a language filter', () => {
    const results = searchEditions(index, { narrationLanguages: ['ru'] });
    expect(ids(results)).not.toContain('e:nolang');
  });
});

describe('duration formatting', () => {
  it('splits hours and minutes', () => {
    expect(formatDurationShort(12 * MINUTE)).toEqual({ hours: 0, minutes: 12, seconds: 0 });
    expect(formatDurationShort(85 * MINUTE)).toEqual({ hours: 1, minutes: 25, seconds: 0 });
    expect(formatDurationShort(11 * HOUR + 40 * MINUTE)).toEqual({
      hours: 11,
      minutes: 40,
      seconds: 0,
    });
    expect(formatDurationShort(2 * HOUR)).toEqual({ hours: 2, minutes: 0, seconds: 0 });
  });

  it('keeps whole seconds for a sub-minute recording', () => {
    // Rounding 19 seconds to "0 мин" would falsely claim the book has no length.
    expect(formatDurationShort(19)).toEqual({ hours: 0, minutes: 0, seconds: 19 });
    expect(formatDurationShort(59)).toEqual({ hours: 0, minutes: 0, seconds: 59 });
  });

  it('returns nothing for an unknown duration so 0 is never shown', () => {
    expect(formatDurationShort(undefined)).toBeUndefined();
    expect(formatDurationShort(0)).toBeUndefined();
    expect(formatDurationShort(-5)).toBeUndefined();
  });
});

describe('editionDurationForQuery', () => {
  it('prefers the edition total and falls back to a complete sum', () => {
    expect(editionDurationForQuery(all.find((view) => view.edition.id === 'e:mid')!)).toBe(
      45 * MINUTE,
    );
    expect(editionDurationForQuery(all.find((view) => view.edition.id === 'e:unknown')!)).toBeUndefined();
  });
});
