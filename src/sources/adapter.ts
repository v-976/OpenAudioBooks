import type { AudioEdition, Catalogue, Narrator, Source, Track, Work } from '../domain/types';

/**
 * Source adapter contract.
 *
 * Adapters are the ONLY place allowed to know how a particular provider works.
 * UI components must never import adapter code or branch on provider specifics
 * (AGENTS.md rule 6). Domain entities must stay free of provider concepts
 * (AGENTS.md rule 7).
 */

export interface AdapterQuery {
  /** Free text query as entered by the user. */
  text?: string;
  /** Restrict to a single provider-local entity id, when supported. */
  entityId?: string;
  /** Maximum number of audio editions to return per page. */
  limit?: number;
  /** Opaque pagination cursor returned by a previous call. */
  cursor?: string;
}

export interface AdapterPage<T> {
  items: T[];
  cursor?: string;
  /** True when the adapter cannot answer this query at all. */
  unsupported?: boolean;
}

export interface EditionBundle {
  work: Work;
  edition: AudioEdition;
  narrators: Narrator[];
  tracks: Track[];
}

/**
 * A catalogue provider.
 *
 * Implementations are expected to:
 *  - map their payloads into domain types, never leak native shapes;
 *  - report rights status honestly, defaulting to `unknown`;
 *  - return remote URLs only. Adapters must not download or re-host audio.
 */
export interface SourceAdapter {
  /** Stable adapter key, also used as the namespace for ids. */
  readonly id: string;
  /** The `Source` entity this adapter feeds into the catalogue. */
  readonly source: Source;
  /** Human-readable name for UI/debug surfaces. */
  readonly displayName: string;
  /** True when the adapter is bundled development/mock data. */
  readonly isDevelopmentData: boolean;
  /** Whether the adapter can serve catalogue data right now. */
  isEnabled(): boolean;
  /** Normalised, page-able list of works known to the provider. */
  listWorks(query?: AdapterQuery): Promise<AdapterPage<Work>>;
  /** All audio editions the provider exposes for a work. */
  listAudioEditions(workId: string, query?: AdapterQuery): Promise<AdapterPage<AudioEdition>>;
  /** Narrators referenced by an edition, resolved as first-class entities. */
  listNarrators(editionId: string): Promise<Narrator[]>;
  /** Playable tracks for an edition, in sequence order. */
  listTracks(editionId: string): Promise<Track[]>;
  /** Work + edition + narrators + tracks, as needed by detail screens. */
  getEdition(editionId: string): Promise<EditionBundle | undefined>;
  /**
   * Optional full-catalogue fetch, used to seed/refresh a cached index.
   * Adapters that cannot enumerate their catalogue should omit this.
   */
  fetchCatalogue?(query?: AdapterQuery): Promise<Catalogue>;
}

/** Registry of adapters available to the running application. */
export class AdapterRegistry {
  private readonly adapters = new Map<string, SourceAdapter>();

  register(adapter: SourceAdapter): void {
    if (this.adapters.has(adapter.id)) {
      throw new Error(`Source adapter "${adapter.id}" is already registered.`);
    }
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): SourceAdapter | undefined {
    return this.adapters.get(id);
  }

  list(): SourceAdapter[] {
    return [...this.adapters.values()];
  }

  enabled(): SourceAdapter[] {
    return this.list().filter((adapter) => adapter.isEnabled());
  }
}
