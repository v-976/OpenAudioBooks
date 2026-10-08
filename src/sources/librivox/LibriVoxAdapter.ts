import type { Catalogue } from '../../domain/types';
import type {
  AdapterPage,
  AdapterQuery,
  EditionBundle,
  SourceAdapter,
} from '../adapter';
import { LIBRIVOX_SOURCE, LIBRIVOX_SOURCE_ID } from './source';
import { mapProject, editionId, workId } from './parse';
import { scanProjects, fetchProjects, type ScanResult } from './client';
import { readCachedProjects, writeCachedProjects } from '../../persistence/catalogueCacheRepository';
import type { LibriVoxProject } from './types';

/**
 * LibriVox source adapter.
 *
 * Responsibilities are deliberately narrow: fetch (queued, rate-limited,
 * de-duplicated), cache, and map. All mapping rules live in `parse.ts` and all
 * transport rules in `client.ts`, so both are testable without a network.
 *
 * Hard constraints:
 *  - audio is never downloaded, cached or re-hosted; only remote URLs;
 *  - narration language comes from the project-level field, never from
 *    `sections[].language`, which is unreliable and contradicts the project
 *    language on every verified Russian project;
 *  - `Work.originalLanguage` is never derived from the narration language;
 *  - every scan is bounded, and the result reports that it is partial.
 */

export interface LibriVoxAdapterOptions {
  /** Pages to fetch per scan. Bounded on purpose. */
  maxPages?: number;
  /** Records per page. Capped at the API maximum of 500. */
  pageSize?: number;
  /** Milliseconds before a request is abandoned. */
  timeoutMs?: number;
  /** Injected for tests; defaults to the real JSONP transport. */
  scan?: typeof scanProjects;
  fetchOne?: typeof fetchProjects;
}

export class LibriVoxAdapter implements SourceAdapter {
  readonly id = LIBRIVOX_SOURCE_ID;
  readonly displayName = 'LibriVox';
  readonly isDevelopmentData = false;
  readonly source = LIBRIVOX_SOURCE;

  private readonly options: LibriVoxAdapterOptions;
  /** Last scan outcome, so the UI can say the catalogue is partial. */
  private lastScan: ScanResult | undefined;
  private inFlight: Promise<ScanResult> | undefined;

  constructor(options: LibriVoxAdapterOptions = {}) {
    this.options = options;
  }

  isEnabled(): boolean {
    // The adapter is enabled whenever the page can execute the JSONP transport.
    return typeof document !== 'undefined' && typeof window !== 'undefined';
  }

  /** Outcome of the most recent catalogue scan, for partial-catalogue labelling. */
  getScanState(): ScanResult | undefined {
    return this.lastScan;
  }

  private async scan(params: Parameters<typeof scanProjects>[0]): Promise<ScanResult> {
    const scanFn = this.options.scan ?? scanProjects;
    const result = await scanFn(params, {
      maxPages: this.options.maxPages ?? 3,
      ...(this.options.pageSize === undefined ? {} : { limit: this.options.pageSize }),
      ...(this.options.timeoutMs === undefined ? {} : { timeoutMs: this.options.timeoutMs }),
    });
    this.lastScan = result;
    return result;
  }

  /**
   * Loads a bounded, cached slice of the catalogue.
   *
   * Cache-first so the catalogue is usable offline, with an explicit refresh
   * path. Concurrent callers share one scan, so several screens opening at once
   * cannot multiply requests.
   */
  async loadCatalogue(options: { refresh?: boolean; signal?: AbortSignal } = {}): Promise<Catalogue> {
    if (options.refresh) {
      const result = await this.scan({ limit: this.options.pageSize ?? 50 });
      await writeCachedProjects(
        result.projects.map((project) => ({
          id: String(project.id),
          project,
          fetchedAt: new Date().toISOString(),
        })),
      );
      return this.catalogueFrom(result.projects);
    }

    const cached = await readCachedProjects();
    if (cached.length > 0) {
      this.lastScan = {
        projects: cached.map((record) => record.project),
        pages: 0,
        truncated: false,
        duplicatesSkipped: 0,
      };
      return this.catalogueFrom(cached.map((record) => record.project));
    }

    if (!this.inFlight) {
      this.inFlight = this.scan({ limit: this.options.pageSize ?? 50 }).finally(() => {
        this.inFlight = undefined;
      });
    }
    const result = await this.inFlight;
    await writeCachedProjects(
      result.projects.map((project) => ({
        id: String(project.id),
        project,
        fetchedAt: new Date().toISOString(),
      })),
    );
    return this.catalogueFrom(result.projects);
  }

  /**
   * Maps raw projects into one normalised catalogue.
   *
   * Shared authors/narrators are merged by id, so a reader who performed many
   * books is one `Narrator` record reachable from many editions.
   */
  catalogueFrom(projects: LibriVoxProject[]): Catalogue {
    const authors = new Map<string, Catalogue['authors'][number]>();
    const narrators = new Map<string, Catalogue['narrators'][number]>();
    const sources = new Map<string, Catalogue['sources'][number]>();
    const works: Catalogue['works'] = [];
    const editions: Catalogue['audioEditions'] = [];
    const tracks: Catalogue['tracks'] = [];
    const fetchedAt = new Date().toISOString();

    for (const project of projects) {
      const mapped = mapProject(project, fetchedAt);
      if (!mapped) continue;

      // Re-merge: a later project may carry a biography-free duplicate record.
      for (const author of mapped.authors) {
        const existing = authors.get(author.id);
        authors.set(author.id, existing ? { ...existing, ...author } : author);
      }
      for (const narrator of mapped.narrators) {
        const existing = narrators.get(narrator.id);
        narrators.set(narrator.id, existing ? { ...existing, ...narrator } : narrator);
      }

      if (!works.some((work) => work.id === mapped.work.id)) works.push(mapped.work);
      if (!editions.some((edition) => edition.id === mapped.edition.id)) {
        editions.push(mapped.edition);
      }
      sources.set(mapped.edition.sourceId, LIBRIVOX_SOURCE);
      for (const track of mapped.tracks) {
        if (!tracks.some((item) => item.id === track.id)) tracks.push(track);
      }
    }

    // LibriVox alone is not development data, but a catalogue that contains only
    // LibriVox must not be reported as such.
    return {
      authors: [...authors.values()],
      works,
      narrators: [...narrators.values()],
      sources: [...sources.values()],
      audioEditions: editions,
      tracks,
      isDevelopmentData: false,
    };
  }

  async listWorks(query: AdapterQuery = {}): Promise<AdapterPage<Catalogue['works'][number]>> {
    const catalogue = await this.loadCatalogue();
    const text = query.text?.trim().toLowerCase();
    const items = text
      ? catalogue.works.filter((work) => work.title.toLowerCase().includes(text))
      : catalogue.works;
    return { items };
  }

  async listAudioEditions(
    work: string,
  ): Promise<AdapterPage<Catalogue['audioEditions'][number]>> {
    const catalogue = await this.loadCatalogue();
    const providerId = String(work).startsWith(`${LIBRIVOX_SOURCE_ID}:`)
      ? String(work)
      : workId(work);
    return { items: catalogue.audioEditions.filter((edition) => edition.workId === providerId) };
  }

  async listNarrators(edition: string): Promise<Catalogue['narrators']> {
    const catalogue = await this.loadCatalogue();
    const target = String(edition).startsWith(`${LIBRIVOX_SOURCE_ID}:`)
      ? String(edition)
      : editionId(edition);
    const found = catalogue.audioEditions.find((item) => item.id === target);
    if (!found) return [];
    return found.narratorIds
      .map((id) => catalogue.narrators.find((narrator) => narrator.id === id))
      .filter((narrator): narrator is Catalogue['narrators'][number] => Boolean(narrator));
  }

  async listTracks(edition: string): Promise<Catalogue['tracks']> {
    const catalogue = await this.loadCatalogue();
    const target = String(edition).startsWith(`${LIBRIVOX_SOURCE_ID}:`)
      ? String(edition)
      : editionId(edition);
    return catalogue.tracks
      .filter((track) => track.audioEditionId === target)
      .sort((a, b) => a.sequence - b.sequence);
  }

  async getEdition(edition: string): Promise<EditionBundle | undefined> {
    const catalogue = await this.loadCatalogue();
    const target = String(edition).startsWith(`${LIBRIVOX_SOURCE_ID}:`)
      ? String(edition)
      : editionId(edition);
    const found = catalogue.audioEditions.find((item) => item.id === target);
    if (!found) return undefined;
    const work = catalogue.works.find((item) => item.id === found.workId);
    if (!work) return undefined;
    const narrators = found.narratorIds
      .map((id) => catalogue.narrators.find((narrator) => narrator.id === id))
      .filter((narrator): narrator is Catalogue['narrators'][number] => Boolean(narrator));
    const tracks = catalogue.tracks
      .filter((track) => track.audioEditionId === found.id)
      .sort((a, b) => a.sequence - b.sequence);
    return { work, edition: found, narrators, tracks };
  }

  /** Fetches one project by id and caches it, for a direct deep link. */
  async fetchProject(providerId: string): Promise<LibriVoxProject | undefined> {
    const fetchFn = this.options.fetchOne ?? fetchProjects;
    const [project] = await fetchFn(
      { id: providerId, extended: true, coverart: true },
      this.options.timeoutMs === undefined ? {} : { timeoutMs: this.options.timeoutMs },
    );
    if (!project) return undefined;
    await writeCachedProjects([
      { id: providerId, project, fetchedAt: new Date().toISOString() },
    ]);
    return project;
  }

  async fetchCatalogue(): Promise<Catalogue> {
    return this.loadCatalogue();
  }
}
