import type {
  AudioEdition,
  Author,
  Catalogue,
  Narrator,
  Source,
  Track,
  Work,
} from './types';

/**
 * Read-only query helpers over a normalised `Catalogue`.
 *
 * The UI must not reach into raw adapter payloads; everything it needs is
 * derived here, which keeps the narrator-first-class requirement enforceable
 * in one place.
 */

export interface EditionView {
  edition: AudioEdition;
  work: Work;
  authors: Author[];
  narrators: Narrator[];
  source?: Source;
  tracks: Track[];
}

export interface CatalogueIndex {
  catalogue: Catalogue;
  worksById: Map<string, Work>;
  authorsById: Map<string, Author>;
  narratorsById: Map<string, Narrator>;
  sourcesById: Map<string, Source>;
  editionsById: Map<string, AudioEdition>;
  editionsByWorkId: Map<string, AudioEdition[]>;
  editionsByNarratorId: Map<string, AudioEdition[]>;
  editionsBySourceId: Map<string, AudioEdition[]>;
  editionsByAuthorId: Map<string, AudioEdition[]>;
  editionsByGenre: Map<string, AudioEdition[]>;
  tracksByEditionId: Map<string, Track[]>;
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const bucket = map.get(key);
  if (bucket) {
    bucket.push(value);
  } else {
    map.set(key, [value]);
  }
}

function sortBySequence(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));
}

export function buildIndex(catalogue: Catalogue): CatalogueIndex {
  const index: CatalogueIndex = {
    catalogue,
    worksById: new Map(),
    authorsById: new Map(),
    narratorsById: new Map(),
    sourcesById: new Map(),
    editionsById: new Map(),
    editionsByWorkId: new Map(),
    editionsByNarratorId: new Map(),
    editionsBySourceId: new Map(),
    editionsByAuthorId: new Map(),
    editionsByGenre: new Map(),
    tracksByEditionId: new Map(),
  };

  for (const work of catalogue.works) index.worksById.set(work.id, work);
  for (const author of catalogue.authors) index.authorsById.set(author.id, author);
  for (const narrator of catalogue.narrators) index.narratorsById.set(narrator.id, narrator);
  for (const source of catalogue.sources) index.sourcesById.set(source.id, source);

  for (const edition of catalogue.audioEditions) {
    index.editionsById.set(edition.id, edition);
    push(index.editionsByWorkId, edition.workId, edition);
    push(index.editionsBySourceId, edition.sourceId, edition);
    for (const narratorId of edition.narratorIds) {
      push(index.editionsByNarratorId, narratorId, edition);
    }
  }

  for (const edition of catalogue.audioEditions) {
    const work = index.worksById.get(edition.workId);
    if (!work) continue;
    for (const authorId of work.authorIds) {
      push(index.editionsByAuthorId, authorId, edition);
    }
    for (const genre of work.genres) {
      push(index.editionsByGenre, genre.toLowerCase(), edition);
    }
  }

  for (const track of catalogue.tracks) {
    push(index.tracksByEditionId, track.audioEditionId, track);
  }
  for (const [editionId, tracks] of index.tracksByEditionId) {
    index.tracksByEditionId.set(editionId, sortBySequence(tracks));
  }

  return index;
}

export function tracksForEdition(index: CatalogueIndex, editionId: string): Track[] {
  return index.tracksByEditionId.get(editionId) ?? [];
}

export function totalDurationSeconds(index: CatalogueIndex, editionId: string): number {
  return tracksForEdition(index, editionId).reduce(
    (total, track) => total + (track.durationSeconds ?? 0),
    0,
  );
}

export function editionsForWork(index: CatalogueIndex, workId: string): AudioEdition[] {
  return index.editionsByWorkId.get(workId) ?? [];
}

export function editionsForNarrator(index: CatalogueIndex, narratorId: string): AudioEdition[] {
  return index.editionsByNarratorId.get(narratorId) ?? [];
}

export function editionsForAuthor(index: CatalogueIndex, authorId: string): AudioEdition[] {
  return index.editionsByAuthorId.get(authorId) ?? [];
}

export function editionsForSource(index: CatalogueIndex, sourceId: string): AudioEdition[] {
  return index.editionsBySourceId.get(sourceId) ?? [];
}

export function editionsForGenre(index: CatalogueIndex, genre: string): AudioEdition[] {
  return index.editionsByGenre.get(genre.trim().toLowerCase()) ?? [];
}

export function narratorsForEdition(index: CatalogueIndex, editionId: string): Narrator[] {
  const edition = index.editionsById.get(editionId);
  if (!edition) return [];
  return edition.narratorIds
    .map((id) => index.narratorsById.get(id))
    .filter((narrator): narrator is Narrator => Boolean(narrator));
}

export function authorsForWork(index: CatalogueIndex, workId: string): Author[] {
  const work = index.worksById.get(workId);
  if (!work) return [];
  return work.authorIds
    .map((id) => index.authorsById.get(id))
    .filter((author): author is Author => Boolean(author));
}

export function viewForEdition(index: CatalogueIndex, editionId: string): EditionView | undefined {
  const edition = index.editionsById.get(editionId);
  if (!edition) return undefined;
  const work = index.worksById.get(edition.workId);
  if (!work) return undefined;
  return {
    edition,
    work,
    authors: authorsForWork(index, work.id),
    narrators: narratorsForEdition(index, edition.id),
    source: index.sourcesById.get(edition.sourceId),
    tracks: tracksForEdition(index, edition.id),
  };
}

/** Convenience lookup used by screens that hold only an edition id. */
export function findEditionView(index: CatalogueIndex, editionId: string): EditionView | undefined {
  return viewForEdition(index, editionId);
}

export interface EditionFilters {
  text?: string;
  authorIds?: string[];
  narratorIds?: string[];
  genre?: string;
  sourceIds?: string[];
  series?: string;
  /**
   * Narration languages to include, matched against
   * `AudioEdition.narrationLanguage` ONLY.
   *
   * An empty or omitted list means "do not filter by language", which is
   * different from a list that happens to contain nothing: the caller decides
   * when language filtering applies, so an empty user preference can be
   * rendered as "no restriction" rather than "no results".
   */
  narrationLanguages?: string[];
}

/**
 * Narration-first search: a free-text query is matched against edition
 * metadata, but narrator and author filters are explicit facets so that
 * `author + narrator`, `genre + narrator` and `source + narrator` queries all
 * work without special-casing in the UI.
 */
export function searchEditions(index: CatalogueIndex, filters: EditionFilters): EditionView[] {
  const text = filters.text?.trim().toLowerCase();
  const authorIds = filters.authorIds ?? [];
  const narratorIds = filters.narratorIds ?? [];
  const sourceIds = filters.sourceIds ?? [];
  // Filtered on narration language only. Never on Work.originalLanguage, title
  // language, author nationality or source country.
  const narrationLanguages = filters.narrationLanguages ?? [];
  const genre = filters.genre?.trim().toLowerCase();
  const series = filters.series?.trim().toLowerCase();

  const results: EditionView[] = [];
  for (const edition of index.catalogue.audioEditions) {
    if (authorIds.length > 0) {
      const work = index.worksById.get(edition.workId);
      const workAuthors = work?.authorIds ?? [];
      if (!authorIds.some((id) => workAuthors.includes(id))) continue;
    }
    if (narratorIds.length > 0) {
      if (!narratorIds.some((id) => edition.narratorIds.includes(id))) continue;
    }
    if (sourceIds.length > 0 && !sourceIds.includes(edition.sourceId)) continue;
    if (narrationLanguages.length > 0 && !narrationLanguages.includes(edition.narrationLanguage)) {
      continue;
    }

    const work = index.worksById.get(edition.workId);
    if (!work) continue;
    if (genre && !work.genres.some((g) => g.toLowerCase() === genre)) continue;
    if (series && (work.series?.name ?? '').toLowerCase() !== series) continue;

    const view: EditionView = {
      edition,
      work,
      authors: authorsForWork(index, work.id),
      narrators: narratorsForEdition(index, edition.id),
      source: index.sourcesById.get(edition.sourceId),
      tracks: tracksForEdition(index, edition.id),
    };
    if (text && !matchesText(view, text)) continue;
    results.push(view);
  }

  return results.sort((a, b) =>
    a.work.title.localeCompare(b.work.title) ||
    a.edition.narrationLanguage.localeCompare(b.edition.narrationLanguage),
  );
}

function matchesText(view: EditionView, text: string): boolean {
  const haystack = [
    view.work.title,
    view.work.description ?? '',
    ...view.work.genres,
    view.work.series?.name ?? '',
    ...view.authors.map((author) => author.name),
    ...view.narrators.flatMap((narrator) => [narrator.name, ...narrator.aliases]),
    view.source?.name ?? '',
    view.edition.publisher ?? '',
    ...view.tracks.map((track) => track.title),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(text);
}

/** All distinct genres across the catalogue, sorted for stable UI ordering. */
export function allGenres(index: CatalogueIndex): string[] {
  const genres = new Set<string>();
  for (const work of index.catalogue.works) {
    for (const genre of work.genres) genres.add(genre);
  }
  return [...genres].sort((a, b) => a.localeCompare(b));
}

/**
 * Distinct narration languages present in the catalogue, sorted.
 *
 * Derived from `AudioEdition.narrationLanguage`, so this is a property of the
 * audio a user can actually listen to, not of the works or the authors.
 */
export function availableNarrationLanguages(index: CatalogueIndex): string[] {
  const languages = new Set<string>();
  for (const edition of index.catalogue.audioEditions) {
    languages.add(edition.narrationLanguage);
  }
  return [...languages].sort((a, b) => a.localeCompare(b));
}

/** Number of audio editions available in a given narration language. */
export function editionsInNarrationLanguage(
  index: CatalogueIndex,
  languageCode: string,
): AudioEdition[] {
  return index.catalogue.audioEditions.filter(
    (edition) => edition.narrationLanguage === languageCode,
  );
}
