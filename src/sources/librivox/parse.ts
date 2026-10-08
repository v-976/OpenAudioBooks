import type {
  AudioEdition,
  Author,
  Narrator,
  Source,
  Track,
  Work,
} from '../../domain/types';
import { normalizeLanguageCode } from '../../domain/language';
import { resolveEditionDuration } from '../../domain/duration';
import { LIBRIVOX_SOURCE_ID, LIBRIVOX_SOURCE } from './source';
import type {
  LibriVoxAuthor,
  LibriVoxProject,
  LibriVoxReader,
  LibriVoxSection,
} from './types';

/**
 * Pure mapping from LibriVox payloads to domain entities.
 *
 * No network, no storage, no DOM — so every rule below is directly testable.
 * The adapter's job is to fetch and cache; this file's job is to be correct.
 *
 * Ids are namespaced as `librivox:<kind>:<providerId>` so they can never
 * collide with the development fixtures or with any other source.
 */

/** Values the API uses that are not languages in the normal sense. */
const NON_LANGUAGE_VALUES = new Set(['multilingual', 'various languages', 'multiple languages']);

export function workId(providerId: string): string {
  return `${LIBRIVOX_SOURCE_ID}:work:${providerId}`;
}
export function authorId(providerId: string): string {
  return `${LIBRIVOX_SOURCE_ID}:author:${providerId}`;
}
export function narratorId(providerId: string): string {
  return `${LIBRIVOX_SOURCE_ID}:narrator:${providerId}`;
}
export function editionId(providerId: string): string {
  return `${LIBRIVOX_SOURCE_ID}:edition:${providerId}`;
}
export function trackId(providerId: string): string {
  return `${LIBRIVOX_SOURCE_ID}:track:${providerId}`;
}

/** Strips the HTML that LibriVox descriptions contain. */
export function stripHtml(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const text = input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || undefined;
}

function trimmed(value: string | undefined): string | undefined {
  const text = (value ?? '').trim();
  return text || undefined;
}

/** `"First Last"`, or just the last name when there is no first name. */
export function authorName(raw: LibriVoxAuthor | undefined): string | undefined {
  if (!raw) return undefined;
  const first = trimmed(raw.first_name);
  const last = trimmed(raw.last_name);
  const combined = [first, last].filter(Boolean).join(' ').trim();
  return combined || undefined;
}

/**
 * LibriVox uses a pseudo-author named "Various" for collections and anthologies.
 * It is a real record, but it is not a person, so it is kept out of the
 * narrator/author person model and surfaced as a work-level note instead.
 */
export function isPseudoAuthor(raw: LibriVoxAuthor | undefined): boolean {
  const name = authorName(raw);
  return name?.toLowerCase() === 'various';
}

export function mapAuthor(raw: LibriVoxAuthor, role: 'author' | 'translator'): Author | undefined {
  const name = authorName(raw);
  const providerId = trimmed(raw.id);
  if (!name || !providerId) return undefined;

  const metadata: Record<string, string> = { librivoxId: providerId, role };
  const born = trimmed(raw.dob);
  const died = trimmed(raw.dod);
  if (born) metadata.birthYear = born;
  if (died) metadata.deathYear = died;

  return { id: authorId(providerId), name, metadata };
}

export function mapNarrator(raw: LibriVoxReader): Narrator | undefined {
  const name = trimmed(raw.display_name);
  const providerId = trimmed(raw.reader_id);
  if (!name || !providerId) return undefined;
  return { id: narratorId(providerId), name, aliases: [] };
}

/**
 * Narration language of a project.
 *
 * The project-level `language` field is authoritative. The per-section
 * `language` field is unreliable — it is `"English"` on a minority of projects
 * regardless of the real language, including every verified Russian project — and
 * is ignored, because using it would misclassify exactly those recordings.
 *
 * `Multilingual` and similar values are NOT languages. Returning `undefined` for
 * them keeps the edition honest: an unknown narration language rather than a
 * wrong one.
 */
export function mapNarrationLanguage(raw: LibriVoxProject): string | undefined {
  const value = trimmed(raw.language);
  if (!value) return undefined;
  if (NON_LANGUAGE_VALUES.has(value.toLowerCase())) return undefined;
  const normalized = normalizeLanguageCode(value);
  // A bare "Old English" normalises to nothing usable; keep it distinct rather
  // than silently collapsing historical varieties onto modern English.
  if (!normalized) return undefined;
  return normalized === 'en' && /old\s+english|middle\s+english/i.test(value)
    ? undefined
    : normalized;
}

export interface MappedProject {
  work: Work;
  edition: AudioEdition;
  authors: Author[];
  narrators: Narrator[];
  tracks: Track[];
}

/**
 * Maps one LibriVox project into the domain graph.
 *
 * A LibriVox "project" is one recording of one text: it maps to exactly one
 * `Work` and one `AudioEdition`, which is the same shape the rest of the
 * application expects.
 */
export function mapProject(raw: LibriVoxProject, fetchedAt: string): MappedProject | undefined {
  const providerId = trimmed(raw.id);
  const title = trimmed(raw.title);
  if (!providerId || !title) return undefined;

  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  const tracks = mapTracks(providerId, sections);

  const declaredSectionCount = parsePositiveInteger(raw.num_sections);
  const duration = resolveEditionDuration({
    reportedSeconds: raw.totaltimesecs,
    formattedDuration: raw.totaltime,
    tracks,
    ...(declaredSectionCount === undefined ? {} : { declaredSectionCount }),
  });

  const genres = (Array.isArray(raw.genres) ? raw.genres : [])
    .map((genre) => trimmed(genre.name))
    .filter((name): name is string => Boolean(name));

  // `originalLanguage` is NOT derived from the narration language. LibriVox
  // reports one language (the reading) and no separate original-work language,
  // so the work's original language is deliberately left unknown.
  const work: Work = {
    id: workId(providerId),
    title,
    authorIds: [],
    genres,
    ...(stripHtml(raw.description) ? { description: stripHtml(raw.description) } : {}),
    metadata: buildWorkMetadata(raw),
  };

  const authors: Author[] = [];
  const authorIds: string[] = [];
  const pseudoAuthor = (raw.authors ?? []).some((item) => isPseudoAuthor(item));
  for (const candidate of raw.authors ?? []) {
    if (isPseudoAuthor(candidate)) continue;
    const author = mapAuthor(candidate, 'author');
    if (author) {
      authors.push(author);
      authorIds.push(author.id);
    }
  }
  for (const candidate of raw.translators ?? []) {
    const translator = mapAuthor(candidate, 'translator');
    if (translator) {
      authors.push(translator);
      authorIds.push(translator.id);
    }
  }
  work.authorIds = authorIds;
  if (pseudoAuthor) {
    work.metadata = { ...work.metadata, compositeWork: 'various-authors' };
  }

  const narrators = mapNarrators(sections);

  const edition: AudioEdition = {
    id: editionId(providerId),
    workId: work.id,
    narratorIds: narrators.map((narrator) => narrator.id),
    sourceId: LIBRIVOX_SOURCE_ID,
    // LibriVox asserts its recordings are public domain. Reported as asserted,
    // with attribution, not inferred from "free to listen".
    rightsStatus: 'publicDomain',
    licenseName: LIBRIVOX_SOURCE.licenseName,
    licenseUrl: LIBRIVOX_SOURCE.licenseUrl,
    attribution: buildAttribution(narrators, raw),
    ...(mapNarrationLanguage(raw) ? { narrationLanguage: mapNarrationLanguage(raw) as string } : {}),
    ...(trimmed(raw.url_librivox) ? { sourceUrl: trimmed(raw.url_librivox) } : {}),
    ...(trimmed(raw.coverart_jpg) ? { coverUrl: trimmed(raw.coverart_jpg) } : {}),
    ...(duration.seconds === undefined
      ? {}
      : { durationSeconds: duration.seconds, durationOrigin: duration.origin }),
    ...(tracks.length > 0 ? { trackCount: tracks.length } : {}),
    fetchedAt,
  };

  return { work, edition, authors, narrators, tracks };
}

/** Collects the distinct readers credited across a project's sections. */
export function mapNarrators(sections: LibriVoxSection[]): Narrator[] {
  const byId = new Map<string, Narrator>();
  for (const section of sections) {
    for (const reader of section.readers ?? []) {
      const narrator = mapNarrator(reader);
      if (narrator) byId.set(narrator.id, narrator);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function buildWorkMetadata(raw: LibriVoxProject): Record<string, string> {
  const metadata: Record<string, string> = { librivoxId: trimmed(raw.id) ?? '' };
  const textSource = trimmed(raw.url_text_source);
  if (textSource) metadata.textSourceUrl = textSource;
  const year = trimmed(raw.copyright_year);
  if (year && /^\d{1,4}$/.test(year)) metadata.textCopyrightYear = year;
  return metadata;
}

function buildAttribution(narrators: Narrator[], raw: LibriVoxProject): string {
  const readerNames = narrators.map((narrator) => narrator.name);
  const parts = [`LibriVox (public domain recording)`];
  if (readerNames.length > 0) {
    parts.push(
      `read by ${readerNames.slice(0, 4).join(', ')}${readerNames.length > 4 ? ' and others' : ''}`,
    );
  } else {
    parts.push('reader not credited in the source record');
  }
  parts.push('audio hosted by the Internet Archive');
  const year = trimmed(raw.copyright_year);
  if (year && /^\d{1,4}$/.test(year)) parts.push(`source text © ${year}`);
  return parts.join(' · ');
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(String(value).trim());
  if (!Number.isInteger(parsed) || parsed < 0) return undefined;
  return parsed;
}

/**
 * Maps sections to tracks.
 *
 * `section_number` is used as the sequence when it parses, because it reflects
 * the project's intended order; otherwise the array order is used. Sections
 * without a usable `listen_url` are dropped, since a track that cannot be played
 * would only be a broken entry in the UI.
 */
export function mapTracks(providerId: string, sections: LibriVoxSection[]): Track[] {
  const tracks: Track[] = [];

  for (const section of sections) {
    const sectionProviderId = trimmed(section.id);
    const listenUrl = trimmed(section.listen_url);
    if (!sectionProviderId || !listenUrl) continue;

    const declared = parsePositiveInteger(section.section_number);
    // `section_number` reflects the project's intended order; fall back to the
    // array order when it is missing or unusable.
    const sequence =
      declared !== undefined && declared > 0 ? declared : tracks.length + 1;

    const playtime = normalizeSectionSeconds(section.playtime);

    tracks.push({
      id: trackId(sectionProviderId),
      audioEditionId: editionId(providerId),
      title: trimmed(section.title) ?? `Section ${sectionProviderId}`,
      sequence,
      audioUrl: listenUrl,
      ...(playtime === undefined ? {} : { durationSeconds: playtime }),
    });
  }

  return tracks.sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));
}

function normalizeSectionSeconds(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(String(value).trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.round(parsed);
}

/** The `Source` entity every LibriVox edition points at. */
export function libriVoxSource(): Source {
  return LIBRIVOX_SOURCE;
}
