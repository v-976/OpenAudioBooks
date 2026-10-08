/**
 * Raw LibriVox API payload shapes.
 *
 * These types describe the wire format ONLY. They must never escape
 * `src/sources/librivox/` — everything above the adapter deals in domain types.
 *
 * Verified against the live API on 2026-10-08 (see
 * `docs/librivox-api-research.md`). Fields are typed as optional or as
 * possibly-empty strings because the API omits or blanks many of them:
 * `first_name` is `""` for the pseudo-author "Various", `dob`/`dod` are `""`,
 * `translators` is `[]`, and numeric values arrive as strings.
 */

export interface LibriVoxAuthor {
  id?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  dod?: string;
}

export interface LibriVoxReader {
  reader_id?: string;
  display_name?: string;
}

export interface LibriVoxSection {
  id?: string;
  section_number?: string;
  title?: string;
  /** Per-section playback time in seconds, as a string. */
  playtime?: string;
  /**
   * Per-section reading language, as an English display name.
   *
   * UNRELIABLE. It usually matches the project language, but on a minority of
   * projects it is `"English"` whatever is actually spoken — including every
   * verified Russian project. Deliberately ignored by the adapter; the
   * project-level `language` is authoritative. See the research document.
   */
  language?: string;
  listen_url?: string;
  file_name?: string | null;
  readers?: LibriVoxReader[];
}

export interface LibriVoxGenre {
  id?: string;
  name?: string;
}

export interface LibriVoxProject {
  id?: string;
  title?: string;
  description?: string;
  /** English display name of the READING language, e.g. "Russian". Authoritative. */
  language?: string;
  url_text_source?: string;
  copyright_year?: string;
  num_sections?: string;
  url_rss?: string;
  url_zip_file?: string;
  url_project?: string;
  url_librivox?: string;
  url_iarchive?: string;
  url_other?: string | Record<string, unknown> | unknown[];
  /** Formatted total, e.g. "4:23:52". Used only as a fallback. */
  totaltime?: string;
  /** Integer total seconds, as a string. Preferred over `totaltime`. */
  totaltimesecs?: string;
  authors?: LibriVoxAuthor[];
  translators?: LibriVoxAuthor[];
  genres?: LibriVoxGenre[];
  sections?: LibriVoxSection[];
  coverart_jpg?: string;
  coverart_thumbnail?: string;
}

export interface LibriVoxAudiobooksResponse {
  books?: LibriVoxProject[];
  /** Present on API-level errors such as an empty result set. */
  error?: string;
}

/** Project id used to key the raw cache before domain mapping. */
export interface LibriVoxCacheRecord {
  id: string;
  /** Raw project payload, verbatim, so re-mapping needs no refetch. */
  project: LibriVoxProject;
  /** When this record was written locally. */
  fetchedAt: string;
  /** Whether the record was stored as part of a `since` incremental scan. */
  fromSince?: boolean;
}
