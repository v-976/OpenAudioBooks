/**
 * OpenAudioBooks core domain model.
 *
 * These types are provider-agnostic on purpose: no field here may encode a
 * concept that only exists for one source adapter. Adapters map their native
 * payloads into these shapes.
 *
 * Entity boundaries that must not be collapsed:
 *  - Author and Narrator are separate people records (see AGENTS.md rule 2).
 *  - A Work is the literary/abstract work; an AudioEdition is a concrete
 *    narrated recording of that Work from one Source.
 *  - Playback progress belongs to an AudioEdition, never to a Work.
 */

export type EntityId = string;

/** ISO-8601 timestamp string. */
export type Timestamp = string;

/** BCP-47-ish language tag, e.g. `en`, `ru`, `de`. */
export type LanguageCode = string;

export interface Author {
  id: EntityId;
  name: string;
  /** Optional free-form metadata supplied by the source adapter. */
  metadata?: Record<string, string>;
}

export interface Series {
  name: string;
  /** 1-based position within the series when known. */
  position?: number;
}

export interface Work {
  id: EntityId;
  title: string;
  authorIds: EntityId[];
  description?: string;
  genres: string[];
  /** Language of the original text of the work, when known. */
  originalLanguage?: LanguageCode;
  series?: Series;
  metadata?: Record<string, string>;
}

export interface Narrator {
  id: EntityId;
  name: string;
  biography?: string;
  /** Reference (usually a URL) to a narrator image. Never bundled content. */
  imageUrl?: string;
  /** Alternative names / transliterations / "also known as". */
  aliases: string[];
  metadata?: Record<string, string>;
}

/**
 * Legal status of a source or an individual audio edition.
 *
 * `unknown` is a first-class, expected value. "Free to listen" never implies
 * `publicDomain` (AGENTS.md rule 4).
 */
export type RightsStatus =
  | 'publicDomain'
  | 'creativeCommons'
  | 'licensedFree'
  | 'permissionGranted'
  | 'unknown';

export type SourceType =
  | 'publicDomainArchive'
  | 'donatedLibrary'
  | 'authorProvided'
  | 'podcastRss'
  | 'other';

export interface Source {
  id: EntityId;
  name: string;
  /** Canonical home page of the source. */
  sourceUrl: string;
  sourceType: SourceType;
  rightsStatus: RightsStatus;
  /** Human-readable licence/terms summary plus a link where available. */
  licenseName?: string;
  licenseUrl?: string;
  /** Required attribution text shown in the UI. */
  attribution?: string;
  /** Free-text availability notes, e.g. region or takedown state. */
  availabilityNotes?: string;
}

export interface AudioEdition {
  id: EntityId;
  workId: EntityId;
  narratorIds: EntityId[];
  sourceId: EntityId;
  language: LanguageCode;
  /** Release/publication information as reported by the source. */
  releaseYear?: number;
  publisher?: string;
  /** Cover art reference. Referenced remotely, never re-hosted by us. */
  coverUrl?: string;
  /** Total duration in seconds, when the source reports it. */
  durationSeconds?: number;
  /**
   * Per-edition legal/access metadata. An edition may differ from its source
   * (for example a source that hosts both public-domain and restricted items).
   */
  rightsStatus: RightsStatus;
  licenseName?: string;
  licenseUrl?: string;
  /** URL of the edition's page on the source. */
  sourceUrl?: string;
  /** Number of tracks as reported by the source, if not expanded yet. */
  trackCount?: number;
  /** Sync/refresh timestamp for adapter-provided data. */
  fetchedAt?: Timestamp;
}

export interface Track {
  id: EntityId;
  audioEditionId: EntityId;
  title: string;
  /** 1-based ordering within the edition. */
  sequence: number;
  /** Duration in seconds when known; may be 0 before metadata load. */
  durationSeconds?: number;
  /** Direct audio URL/reference. Streamed from its legitimate source. */
  audioUrl: string;
  /** Page on the source describing this track. */
  sourceUrl?: string;
}

/**
 * Local, per-audio-edition playback state. Persisted in IndexedDB.
 * Nothing here is ever transmitted anywhere.
 */
export interface UserState {
  audioEditionId: EntityId;
  trackId: EntityId;
  /** Playback position within the current track, in seconds. */
  positionSeconds: number;
  lastPlayedAt: Timestamp;
  playbackRate: number;
  /** True once the user (or the near-end heuristic) finishes the edition. */
  completed: boolean;
  favorite: boolean;
}

/** Version tag stored alongside persisted records so migrations can adapt. */
export interface UserStateRecord extends UserState {
  /** Schema version of the persisted record itself. */
  recordVersion: number;
}

export interface Bookmark {
  id: EntityId;
  audioEditionId: EntityId;
  trackId: EntityId;
  /** Position within the track, in seconds. */
  positionSeconds: number;
  createdAt: Timestamp;
  note?: string;
}

/** Small, non-identifying preferences. Stored in localStorage by design. */
export interface Preferences {
  playbackRate: number;
  skipForwardSeconds: number;
  skipBackwardSeconds: number;
  /** Remembered as an explicit "continue listening" target. */
  lastAudioEditionId?: EntityId;
}

export const DEFAULT_PREFERENCES: Preferences = {
  playbackRate: 1,
  skipForwardSeconds: 30,
  skipBackwardSeconds: 15,
};

/**
 * The complete catalogue as consumed by the UI: normalised, cross-referenced
 * and provider-agnostic.
 */
export interface Catalogue {
  authors: Author[];
  works: Work[];
  narrators: Narrator[];
  sources: Source[];
  audioEditions: AudioEdition[];
  tracks: Track[];
  /** Marks catalogue contents as development/mock data, never real content. */
  isDevelopmentData: boolean;
}
