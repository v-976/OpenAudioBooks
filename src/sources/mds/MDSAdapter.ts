import { normalizeLanguageCode } from '../../domain/language';
import type { Catalogue } from '../../domain/types';
import type { AdapterPage, AdapterQuery, EditionBundle, SourceAdapter } from '../adapter';
import { MDS_SOURCE, MDS_SOURCE_ID, mdsPlaybackUrl } from './source';
import type { MdsIndex } from './types';

export type MdsIndexLoader = () => Promise<MdsIndex>;

async function loadBundledIndex(): Promise<MdsIndex> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/mds-index.json`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as MdsIndex;
}

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
  private index?: MdsIndex;
  private catalogue?: Catalogue;
  private readonly loadIndex: MdsIndexLoader;
  private loading?: Promise<Catalogue>;

  constructor(index?: MdsIndex, loadIndex: MdsIndexLoader = loadBundledIndex) {
    this.index = index;
    this.catalogue = index ? catalogueFromMdsIndex(index) : undefined;
    this.loadIndex = loadIndex;
  }

  isEnabled(): boolean {
    return true;
  }

  private async getCatalogue(): Promise<Catalogue> {
    if (this.catalogue) return this.catalogue;
    if (!this.loading) {
      this.loading = this.loadIndex().then((index) => {
        this.index = index;
        this.catalogue = catalogueFromMdsIndex(index);
        return this.catalogue;
      });
    }
    return this.loading;
  }

  async listWorks(query: AdapterQuery = {}): Promise<AdapterPage<Catalogue['works'][number]>> {
    const catalogue = await this.getCatalogue();
    const index = this.index;
    if (!index) return { items: [] };
    const text = query.text?.trim().toLocaleLowerCase('ru');
    const matchingIds = text
      ? new Set(
          index.records
            .filter((record) =>
              [record.title, ...record.authors.map((author) => author.name)].some((value) =>
                value.toLocaleLowerCase('ru').includes(text),
              ),
            )
            .map((record) => mdsWorkId(record.id)),
        )
      : undefined;
    const items = matchingIds
      ? catalogue.works.filter((work) => matchingIds.has(work.id))
      : catalogue.works;
    return { items: query.limit ? items.slice(0, query.limit) : items };
  }

  async listAudioEditions(workId: string): Promise<AdapterPage<Catalogue['audioEditions'][number]>> {
    const catalogue = await this.getCatalogue();
    return {
      items: catalogue.audioEditions.filter(
        (edition) => edition.workId === (workId.startsWith('mds:') ? workId : mdsWorkId(workId)),
      ),
    };
  }

  async listNarrators(): Promise<Catalogue['narrators']> {
    // The public MDS record pages do not identify a narrator. Do not infer one.
    return [];
  }

  async listTracks(editionId: string): Promise<Catalogue['tracks']> {
    const catalogue = await this.getCatalogue();
    const target = editionId.startsWith('mds:') ? editionId : mdsEditionId(editionId);
    return catalogue.tracks.filter((track) => track.audioEditionId === target);
  }

  async getEdition(editionId: string): Promise<EditionBundle | undefined> {
    const catalogue = await this.getCatalogue();
    const target = editionId.startsWith('mds:') ? editionId : mdsEditionId(editionId);
    const edition = catalogue.audioEditions.find((item) => item.id === target);
    if (!edition) return undefined;
    const work = catalogue.works.find((item) => item.id === edition.workId);
    if (!work) return undefined;
    return {
      work,
      edition,
      narrators: [],
      tracks: catalogue.tracks.filter((track) => track.audioEditionId === target),
    };
  }

  async fetchCatalogue(): Promise<Catalogue> {
    return this.getCatalogue();
  }
}
