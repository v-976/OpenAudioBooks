import { describe, expect, it } from 'vitest';
import {
  authorName,
  editionId,
  isPseudoAuthor,
  mapAuthor,
  mapNarrationLanguage,
  mapNarrators,
  mapProject,
  mapTracks,
  narratorId,
  stripHtml,
  workId,
} from './parse';
import {
  COLLECTION_PROJECT,
  MISMATCHED_TOTAL_PROJECT,
  MULTILINGUAL_PROJECT,
  OLD_ENGLISH_PROJECT,
  RUSSIAN_PROJECT,
  SPARSE_PROJECT,
  TRANSLATED_PROJECT,
  UNUSABLE_SECTIONS_PROJECT,
} from './fixtures';

const NOW = '2026-10-08T00:00:00.000Z';

describe('ids', () => {
  it('namespaces every entity by source', () => {
    expect(workId('559')).toBe('librivox:work:559');
    expect(editionId('559')).toBe('librivox:edition:559');
    expect(narratorId('295')).toBe('librivox:narrator:295');
    // The namespace keeps LibriVox ids apart from the development fixtures.
    expect(workId('559').startsWith('librivox:')).toBe(true);
    expect(workId('559').startsWith('dev:')).toBe(false);
  });
});

describe('mapNarrationLanguage', () => {
  it('uses the project-level language, not the section language', () => {
    // sections[].language is unreliable: it is "English" on every verified
    // Russian project, and on a minority of others. Trusting it would
    // misclassify exactly those recordings.
    expect(RUSSIAN_PROJECT.sections?.[0]?.language).toBe('English');
    expect(mapNarrationLanguage(RUSSIAN_PROJECT)).toBe('ru');
  });

  it('ignores a section language that contradicts an English project too', () => {
    // The field is not a reliable fallback in either direction.
    expect(COLLECTION_PROJECT.sections?.every((s) => s.language === 'English')).toBe(true);
    expect(mapNarrationLanguage(COLLECTION_PROJECT)).toBe('en');
  });

  it('normalises English display names', () => {
    expect(mapNarrationLanguage({ language: 'English' })).toBe('en');
    expect(mapNarrationLanguage({ language: 'German' })).toBe('de');
    expect(mapNarrationLanguage({ language: 'Finnish' })).toBe('fi');
    expect(mapNarrationLanguage({ language: 'Spanish' })).toBe('es');
  });

  it('refuses to invent a language for "Multilingual"', () => {
    // "Multilingual" is not a language. Reporting one would be a false claim.
    expect(mapNarrationLanguage(MULTILINGUAL_PROJECT)).toBeUndefined();
  });

  it('does not collapse Old English onto modern English', () => {
    expect(mapNarrationLanguage(OLD_ENGLISH_PROJECT)).toBeUndefined();
  });

  it('returns undefined for a missing or blank language', () => {
    expect(mapNarrationLanguage({})).toBeUndefined();
    expect(mapNarrationLanguage({ language: '   ' })).toBeUndefined();
  });

  it('is independent of the work, which LibriVox does not report', () => {
    const mapped = mapProject(RUSSIAN_PROJECT, NOW)!;
    // LibriVox states one language only: the reading. The work's original
    // language is therefore left unknown rather than copied from the narration.
    expect(mapped.work.originalLanguage).toBeUndefined();
    expect(mapped.edition.narrationLanguage).toBe('ru');
  });
});

describe('authors', () => {
  it('combines first and last name', () => {
    expect(authorName({ first_name: 'Fyodor', last_name: 'Dostoyevsky' })).toBe(
      'Fyodor Dostoyevsky',
    );
  });

  it('copes with a blank first name', () => {
    expect(authorName({ first_name: '', last_name: 'Various' })).toBe('Various');
    expect(authorName({ first_name: '  ', last_name: 'X' })).toBe('X');
  });

  it('identifies the "Various" pseudo-author', () => {
    expect(isPseudoAuthor({ first_name: '', last_name: 'Various' })).toBe(true);
    expect(isPseudoAuthor({ first_name: 'A', last_name: 'Various' })).toBe(false);
  });

  it('does not create an Author record for the pseudo-author', () => {
    const mapped = mapProject(COLLECTION_PROJECT, NOW)!;
    // "Various" is not a person, so it must not enter the person model.
    expect(mapped.authors.map((author) => author.name)).not.toContain('Various');
    expect(mapped.work.metadata?.compositeWork).toBe('various-authors');
  });

  it('keeps a translator as a distinct role', () => {
    const mapped = mapProject(TRANSLATED_PROJECT, NOW)!;
    const translator = mapped.authors.find((author) => author.metadata?.role === 'translator');
    expect(translator?.name).toBe('Translated By');
  });

  it('skips a record with no usable name', () => {
    expect(mapAuthor({ id: '1', first_name: '', last_name: '' }, 'author')).toBeUndefined();
  });
});

describe('narrators and readers', () => {
  it('collects distinct readers across sections', () => {
    const narrators = mapNarrators(COLLECTION_PROJECT.sections ?? []);
    expect(narrators.map((narrator) => narrator.name).sort()).toEqual([
      'Ben Douglas',
      'Heath Gardner',
      'Tina Tilney',
    ]);
  });

  it('supports several readers on a single section', () => {
    const third = (COLLECTION_PROJECT.sections ?? [])[2];
    const narrators = mapNarrators([third]);
    expect(narrators.map((narrator) => narrator.name).sort()).toEqual([
      'Ben Douglas',
      'Heath Gardner',
    ]);
  });

  it('resolves narrators as first-class entities with stable ids', () => {
    const mapped = mapProject(RUSSIAN_PROJECT, NOW)!;
    expect(mapped.narrators).toHaveLength(1);
    expect(mapped.narrators[0].id).toBe('librivox:narrator:295');
    expect(mapped.edition.narratorIds).toEqual(['librivox:narrator:295']);
  });

  it('ignores reader entries with no usable name or id', () => {
    expect(
      mapNarrators([
        { id: '1', readers: [{ reader_id: '1', display_name: '' }, { reader_id: '' }] },
      ]),
    ).toEqual([]);
  });
});

describe('tracks and durations', () => {
  it('maps sections to tracks in sequence order', () => {
    const tracks = mapTracks('559', RUSSIAN_PROJECT.sections ?? []);
    expect(tracks.map((track) => track.sequence)).toEqual([1, 2, 3]);
    expect(tracks[0].durationSeconds).toBe(30);
    expect(tracks[0].audioEditionId).toBe(editionId('559'));
  });

  it('drops sections with no playable audio URL', () => {
    const tracks = mapTracks('903', UNUSABLE_SECTIONS_PROJECT.sections ?? []);
    expect(tracks).toEqual([]);
  });

  it('falls back to array order when section_number is unusable', () => {
    const tracks = mapTracks('x', [
      { id: 'b', title: 'B', listen_url: 'https://a/2.mp3' },
      { id: 'a', title: 'A', listen_url: 'https://a/1.mp3' },
    ]);
    expect(tracks.map((track) => track.sequence)).toEqual([1, 2]);
  });

  it('records a composite work when the pseudo-author is used', () => {
    const mapped = mapProject(COLLECTION_PROJECT, NOW)!;
    expect(mapped.work.metadata?.compositeWork).toBe('various-authors');
  });

  it('prefers the source total over the section sum', () => {
    const mapped = mapProject(RUSSIAN_PROJECT, NOW)!;
    // Sections sum to 71; the source reports 73.
    expect(mapped.edition.durationSeconds).toBe(73);
    expect(mapped.edition.durationOrigin).toBe('reported');
  });

  it('keeps the reported total when it disagrees strongly with the section sum', () => {
    const mapped = mapProject(MISMATCHED_TOTAL_PROJECT, NOW)!;
    expect(mapped.edition.durationSeconds).toBe(178995);
    expect(mapped.edition.durationOrigin).toBe('reported');
  });

  it('leaves duration unknown rather than inventing it', () => {
    const mapped = mapProject(SPARSE_PROJECT, NOW)!;
    expect(mapped.edition.durationSeconds).toBeUndefined();
    expect(mapped.edition.durationOrigin).toBeUndefined();
  });
});

describe('mapProject', () => {
  it('rejects a record with no id or title', () => {
    expect(mapProject({ title: 'No id' }, NOW)).toBeUndefined();
    expect(mapProject({ id: '1' }, NOW)).toBeUndefined();
    expect(mapProject({ id: '', title: '' }, NOW)).toBeUndefined();
  });

  it('records rights as LibriVox asserts them, with attribution', () => {
    const mapped = mapProject(RUSSIAN_PROJECT, NOW)!;
    expect(mapped.edition.rightsStatus).toBe('publicDomain');
    expect(mapped.edition.attribution).toContain('LibriVox');
    expect(mapped.edition.attribution).toContain('Yakovlev Valery');
    expect(mapped.edition.attribution).toContain('Internet Archive');
    expect(mapped.edition.sourceUrl).toContain('librivox.org');
  });

  it('keeps the source page url rather than re-hosting audio', () => {
    const mapped = mapProject(RUSSIAN_PROJECT, NOW)!;
    expect(mapped.edition.sourceUrl).toBe(
      'https://librivox.org/zapiski-iz-podpolya-by-fyodor_dostoevsky/',
    );
    // Track audio references are remote archive.org URLs, untouched.
    expect(mapped.tracks[0].audioUrl).toMatch(/^https:\/\/www\.archive\.org\//);
  });

  it('records the text source and copyright year as provenance', () => {
    const mapped = mapProject(RUSSIAN_PROJECT, NOW)!;
    expect(mapped.work.metadata?.textSourceUrl).toContain('az.lib.ru');
    expect(mapped.work.metadata?.textCopyrightYear).toBe('1849');
  });

  it('strips HTML from the description', () => {
    const mapped = mapProject(RUSSIAN_PROJECT, NOW)!;
    expect(mapped.work.description).toContain('Notes from Underground');
    expect(mapped.work.description).not.toContain('<i>');
    expect(stripHtml('<b>a</b><br />b')).toBe('a\nb');
    expect(stripHtml(undefined)).toBeUndefined();
  });

  it('maps genres and the cover', () => {
    const mapped = mapProject(RUSSIAN_PROJECT, NOW)!;
    expect(mapped.work.genres).toEqual(['General Fiction']);
    expect(mapped.edition.coverUrl).toContain('archive.org');
  });

  it('links the work to its authors', () => {
    const mapped = mapProject(RUSSIAN_PROJECT, NOW)!;
    expect(mapped.work.authorIds).toEqual(['librivox:author:439']);
  });

  it('survives a project with no sections at all', () => {
    const mapped = mapProject(SPARSE_PROJECT, NOW)!;
    expect(mapped.tracks).toEqual([]);
    expect(mapped.edition.narratorIds).toEqual([]);
    expect(mapped.edition.trackCount).toBeUndefined();
    expect(mapped.edition.narrationLanguage).toBe('de');
  });
});
