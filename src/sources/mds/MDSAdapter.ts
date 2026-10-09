import indexJson from './index.json';
import { normalizeLanguageCode } from '../../domain/language';
import type { Catalogue } from '../../domain/types';
import type { AdapterPage, AdapterQuery, EditionBundle, SourceAdapter } from '../adapter';
import { MDS_SOURCE, MDS_SOURCE_ID, mdsPlaybackUrl } from './source';
import type { MdsIndex } from './types';

const bundledIndex = indexJson as MdsIndex;

export function mdsWorkId(providerId: string): string {
  return `${MDS_SOURCE_ID}:work:${providerId}`;
}

export function mdsEditionId(providerId: string): string {
  return `${MDS_SOURCE_ID}:edition:${providerId}`;
}

export function mdsTrackId(providerId: string): string {
  return `${MDS_SOURCE_ID}:track:${providerId}`;
}

function mdsAuthorId(providerId: string): string {
  return `${MDS_SOURCE_ID}:author:${providerId}`;
}

/** Maps the bundled metadata-only snapshot into provider-neutral domain entities. */
export function catalogueFromMdsIndex(index: MdsIndex): Catalogue {
  const authors = new Map<string, Catalogue['authors'][number]>();
  const works: Catalogue['works'] = [];
  const editions: Catalogue['audioEditions'] = [];
  const tracks: Catalogue['tracks'] = [];

  for (const record of index.records) {
    const authorIds = record.authors.map((author) => {
      const id = mdsAuthorId(author.id);
      authors.set(id, {
        id,
        name: author.name,
        metadata: { sourceUrl: author.sourceUrl },
      });
      return id;
    });
    const workId = mdsWorkId(record.id);
    const editionId = mdsEditionId(record.id);
    const language = record.narrationLanguage
      ? normalizeLanguageCode(record.narrationLanguage)
      : undefined;

    works.push({
      id: workId,
      title: record.title,
      authorIds,
      genres: [],
      metadata: { providerId: record.id, indexedAt: record.indexedAt },
    });
    editions.push({
      id: editionId,
      workId,
      narratorIds: [],
      sourceId: MDS_SOURCE_ID,
      ...(language ? { narrationLanguage: language } : {}),
      ...(record.durationSeconds ? { durationSeconds: record.durationSeconds } : {}),
      ...(record.durationSeconds ? { durationOrigin: 'reported' as const } : {}),
      rightsStatus: 'unknown',
      attribution: MDS_SOURCE.attribution,
      sourceUrl: record.pageUrl,
      trackCount: 1,
      fetchedAt: record.indexedAt,
    });
    tracks.push({
      id: mdsTrackId(record.id),
      audioEditionId: editionId,
      title: record.title,
      sequence: 1,
      ...(record.durationSeconds ? { durationSeconds: record.durationSeconds } : {}),
      audioUrl: mdsPlaybackUrl(record.id),
      sourceUrl: record.pageUrl,
    });
  }

  return {
    authors: [...authors.values()],
    works,
    narrators: [],
    sources: index.records.length > 0 ? [MDS_SOURCE] : [],
    audioEditions: editions,
    tracks,
    isDevelopmentData: false,
  };
}

export class MDSAdapter implements SourceAdapter {
  readonly id = MDS_SOURCE_ID;
  readonly displayName = MDS_SOURCE.name;
  readonly isDevelopmentData = false;
  readonly source = MDS_SOURCE;
  readonly index: MdsIndex;
  readonly catalogue: Catalogue;

  constructor(index: MdsIndex = bundledIndex) {
    this.index = index;
    this.catalogue = catalogueFromMdsIndex(index);
  }

  isEnabled(): boolean {
    return this.index.records.length > 0;
  }

  async listWorks(query: AdapterQuery = {}): Promise<AdapterPage<Catalogue['works'][number]>> {
    const text = query.text?.trim().toLocaleLowerCase('ru');
    const matchingIds = text
      ? new Set(
          this.index.records
            .filter((record) =>
              [record.title, ...record.authors.map((author) => author.name)].some((value) =>
                value.toLocaleLowerCase('ru').includes(text),
              ),
            )
            .map((record) => mdsWorkId(record.id)),
        )
      : undefined;
    const items = matchingIds
      ? this.catalogue.works.filter((work) => matchingIds.has(work.id))
      : this.catalogue.works;
    return { items: query.limit ? items.slice(0, query.limit) : items };
  }

  async listAudioEditions(workId: string): Promise<AdapterPage<Catalogue['audioEditions'][number]>> {
    return {
      items: this.catalogue.audioEditions.filter(
        (edition) => edition.workId === (workId.startsWith('mds:') ? workId : mdsWorkId(workId)),
      ),
    };
  }

  async listNarrators(): Promise<Catalogue['narrators']> {
    // The public MDS record pages do not identify a narrator. Do not infer one.
    return [];
  }

  async listTracks(editionId: string): Promise<Catalogue['tracks']> {
    const target = editionId.startsWith('mds:') ? editionId : mdsEditionId(editionId);
    return this.catalogue.tracks.filter((track) => track.audioEditionId === target);
  }

  async getEdition(editionId: string): Promise<EditionBundle | undefined> {
    const target = editionId.startsWith('mds:') ? editionId : mdsEditionId(editionId);
    const edition = this.catalogue.audioEditions.find((item) => item.id === target);
    if (!edition) return undefined;
    const work = this.catalogue.works.find((item) => item.id === edition.workId);
    if (!work) return undefined;
    return {
      work,
      edition,
      narrators: [],
      tracks: this.catalogue.tracks.filter((track) => track.audioEditionId === target),
    };
  }

  async fetchCatalogue(): Promise<Catalogue> {
    return this.catalogue;
  }
}
