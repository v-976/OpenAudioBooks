import type {
  AudioEdition,
  Author,
  Catalogue,
  Narrator,
  Source,
  Track,
  Work,
} from '../domain/types';
import type { AdapterPage, AdapterQuery, SourceAdapter } from '../sources/adapter';

/**
 * DEVELOPMENT DATA ONLY — NOT AUDIOBOOK CONTENT.
 *
 * Everything in this file is fictional and exists purely to exercise the
 * catalogue, narrator browsing and playback-persistence architecture during
 * the Alpha 0.1.0 bootstrap. Titles, people and descriptions are invented.
 * Audio references point at synthesised tone fixtures under
 * `public/audio/dev/`, not at any real recording.
 *
 * Real provider adapters (LibriVox, Internet Archive, MDS, ...) will be added
 * behind the same `SourceAdapter` interface in later milestones and must map
 * their own data into the same domain types.
 */

export const DEV_SOURCE_IDS = {
  publicDomainArchive: 'dev:archive-open',
  donatedLibrary: 'dev:donated-library',
  unknownRights: 'dev:undetermined-rights',
  podcastRss: 'dev:podcast-rss',
} as const;

const DEV_FIXTURE_BASE = 'audio/dev';

const sources: Source[] = [
  {
    id: DEV_SOURCE_IDS.publicDomainArchive,
    name: 'Open Archive (development fixture)',
    sourceUrl: 'https://example.invalid/open-archive',
    sourceType: 'publicDomainArchive',
    rightsStatus: 'publicDomain',
    licenseName: 'Public domain (development fixture)',
    licenseUrl: 'https://example.invalid/open-archive/rights',
    attribution: 'Development fixture source. No real content.',
    availabilityNotes: 'Fictional source used only in development builds.',
  },
  {
    id: DEV_SOURCE_IDS.donatedLibrary,
    name: 'Community Donations Library (development fixture)',
    sourceUrl: 'https://example.invalid/donations',
    sourceType: 'donatedLibrary',
    rightsStatus: 'licensedFree',
    licenseName: 'Donated recording, free to listen (development fixture)',
    licenseUrl: 'https://example.invalid/donations/terms',
    attribution: 'Development fixture source. No real content.',
    availabilityNotes: 'Demonstrates a source that is free to listen but not public domain.',
  },
  {
    id: DEV_SOURCE_IDS.unknownRights,
    name: 'Undetermined Rights Archive (development fixture)',
    sourceUrl: 'https://example.invalid/undetermined',
    sourceType: 'other',
    rightsStatus: 'unknown',
    attribution: 'Development fixture source. No real content.',
    availabilityNotes:
      'Demonstrates an edition whose rights status is genuinely unknown and must not be treated as public domain.',
  },
  {
    id: DEV_SOURCE_IDS.podcastRss,
    name: 'Independent Podcast Feed (development fixture)',
    sourceUrl: 'https://example.invalid/feed.xml',
    sourceType: 'podcastRss',
    rightsStatus: 'permissionGranted',
    licenseName: 'Granted by the rights holder for free distribution (development fixture)',
    attribution: 'Development fixture source. No real content.',
  },
];

const authors: Author[] = [
  { id: 'dev:author:harriet-vane', name: 'Harriet Vane' },
  { id: 'dev:author:tobias-rell', name: 'Tobias Rell' },
  { id: 'dev:author:amina-okonkwo', name: 'Amina Okonkwo' },
  { id: 'dev:author:sigurd-halvard', name: 'Sigurd Halvard' },
  { id: 'dev:author:leila-farrow', name: 'Leila Farrow' },
];

const narrators: Narrator[] = [
  {
    id: 'dev:narrator:mireille-fontaine',
    name: 'Mireille Fontaine',
    biography: 'Fictional narrator created for development fixtures.',
    aliases: ['M. Fontaine', 'Fontaine, Mireille'],
    imageUrl: 'https://example.invalid/img/mireille-fontaine.png',
  },
  {
    id: 'dev:narrator:dmitri-salazar',
    name: 'Dmitri Salazar',
    biography: 'Fictional narrator created for development fixtures.',
    aliases: ['D. Salazar'],
  },
  {
    id: 'dev:narrator:priya-raman',
    name: 'Priya Raman',
    biography: 'Fictional narrator created for development fixtures.',
    aliases: ['Priya A. Raman'],
    imageUrl: 'https://example.invalid/img/priya-raman.png',
  },
  {
    id: 'dev:narrator:oliver-brant',
    name: 'Oliver Brant',
    aliases: ['O. Brant', 'Brant, Oliver'],
  },
  {
    id: 'dev:narrator:shared-narrator',
    name: 'Josephine Marsh',
    biography:
      'Fictional narrator appearing across several works and sources, to demonstrate narrator-centric browsing.',
    aliases: ['Jo Marsh'],
  },
];

const works: Work[] = [
  {
    id: 'dev:work:salt-and-lanterns',
    title: 'Salt and Lanterns',
    authorIds: ['dev:author:harriet-vane'],
    description:
      'Fictional development entry. A coastal town keeps a lighthouse that nobody remembers switching on.',
    genres: ['Fiction', 'Mystery'],
    originalLanguage: 'en',
    metadata: { fixture: 'true' },
  },
  {
    id: 'dev:work:the-quiet-ledger',
    title: 'The Quiet Ledger',
    authorIds: ['dev:author:tobias-rell'],
    description: 'Fictional development entry. An accountant finds an entry that should not exist.',
    genres: ['Fiction', 'Historical'],
    originalLanguage: 'en',
    series: { name: 'Ledger Trilogy', position: 1 },
  },
  {
    id: 'dev:work:borrowed-weather',
    title: 'Borrowed Weather',
    authorIds: ['dev:author:amina-okonkwo'],
    description: 'Fictional development entry. Two cities argue about whose rain it is.',
    genres: ['Science Fiction', 'Short Fiction'],
    originalLanguage: 'en',
  },
  {
    id: 'dev:work:northern-grammar',
    title: 'Northern Grammar',
    authorIds: ['dev:author:sigurd-halvard', 'dev:author:leila-farrow'],
    description: 'Fictional development entry. A bilingual travelogue of an invented coastline.',
    genres: ['Travel', 'Nonfiction'],
    originalLanguage: 'no',
  },
  {
    id: 'dev:work:the-second-quiet-ledger',
    title: 'The Second Quiet Ledger',
    authorIds: ['dev:author:tobias-rell'],
    description: 'Fictional development entry. Sequel placeholder for series browsing.',
    genres: ['Fiction', 'Historical'],
    originalLanguage: 'en',
    series: { name: 'Ledger Trilogy', position: 2 },
  },
];

const audioEditions: AudioEdition[] = [
  {
    id: 'dev:edition:salt-and-lanterns:archive-en',
    workId: 'dev:work:salt-and-lanterns',
    narratorIds: ['dev:narrator:mireille-fontaine'],
    sourceId: DEV_SOURCE_IDS.publicDomainArchive,
    language: 'en',
    releaseYear: 1911,
    publisher: 'Development Fixture Press',
    coverUrl: 'https://example.invalid/cover/salt-and-lanterns.png',
    durationSeconds: 19,
    rightsStatus: 'publicDomain',
    licenseName: 'Public domain',
    sourceUrl: 'https://example.invalid/open-archive/salt-and-lanterns',
    trackCount: 3,
  },
  {
    id: 'dev:edition:salt-and-lanterns:donated-en',
    workId: 'dev:work:salt-and-lanterns',
    narratorIds: ['dev:narrator:dmitri-salazar'],
    sourceId: DEV_SOURCE_IDS.donatedLibrary,
    language: 'en',
    releaseYear: 2019,
    publisher: 'Community Donations Library',
    durationSeconds: 15,
    rightsStatus: 'licensedFree',
    licenseName: 'Donated recording, free to listen',
    licenseUrl: 'https://example.invalid/donations/terms',
    sourceUrl: 'https://example.invalid/donations/salt-and-lanterns',
    trackCount: 3,
  },
  {
    id: 'dev:edition:the-quiet-ledger:archive-en',
    workId: 'dev:work:the-quiet-ledger',
    narratorIds: ['dev:narrator:shared-narrator'],
    sourceId: DEV_SOURCE_IDS.publicDomainArchive,
    language: 'en',
    releaseYear: 1908,
    durationSeconds: 20,
    rightsStatus: 'publicDomain',
    licenseName: 'Public domain',
    sourceUrl: 'https://example.invalid/open-archive/the-quiet-ledger',
    trackCount: 3,
  },
  {
    id: 'dev:edition:the-quiet-ledger:undetermined-de',
    workId: 'dev:work:the-quiet-ledger',
    narratorIds: ['dev:narrator:oliver-brant', 'dev:narrator:priya-raman'],
    sourceId: DEV_SOURCE_IDS.unknownRights,
    language: 'de',
    releaseYear: 2021,
    durationSeconds: 9,
    rightsStatus: 'unknown',
    sourceUrl: 'https://example.invalid/undetermined/the-quiet-ledger',
    trackCount: 2,
    fetchedAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'dev:edition:borrowed-weather:podcast-en',
    workId: 'dev:work:borrowed-weather',
    narratorIds: ['dev:narrator:priya-raman', 'dev:narrator:shared-narrator'],
    sourceId: DEV_SOURCE_IDS.podcastRss,
    language: 'en',
    releaseYear: 2023,
    durationSeconds: 12,
    rightsStatus: 'permissionGranted',
    licenseName: 'Granted by rights holder',
    sourceUrl: 'https://example.invalid/borrowed-weather/episode-1',
    trackCount: 2,
  },
  {
    id: 'dev:edition:northern-grammar:archive-no',
    workId: 'dev:work:northern-grammar',
    narratorIds: ['dev:narrator:shared-narrator', 'dev:narrator:oliver-brant'],
    sourceId: DEV_SOURCE_IDS.publicDomainArchive,
    language: 'no',
    releaseYear: 1927,
    durationSeconds: 11,
    rightsStatus: 'publicDomain',
    licenseName: 'Public domain',
    sourceUrl: 'https://example.invalid/open-archive/northern-grammar',
    trackCount: 2,
  },
  {
    id: 'dev:edition:the-second-quiet-ledger:archive-en',
    workId: 'dev:work:the-second-quiet-ledger',
    narratorIds: ['dev:narrator:mireille-fontaine'],
    sourceId: DEV_SOURCE_IDS.publicDomainArchive,
    language: 'en',
    releaseYear: 1912,
    durationSeconds: 12,
    rightsStatus: 'publicDomain',
    licenseName: 'Public domain',
    sourceUrl: 'https://example.invalid/open-archive/the-second-quiet-ledger',
    trackCount: 2,
  },
];

function track(
  id: string,
  editionId: string,
  title: string,
  sequence: number,
  fixture: string,
  sourceUrl: string,
): Track {
  return {
    id,
    audioEditionId: editionId,
    title,
    sequence,
    audioUrl: `${DEV_FIXTURE_BASE}/${fixture}`,
    sourceUrl,
  };
}

const tracks: Track[] = [
  track(
    'dev:track:salt-archive:1',
    'dev:edition:salt-and-lanterns:archive-en',
    'Chapter 1 — The Keeper',
    1,
    'tone-a.wav',
    'https://example.invalid/open-archive/salt-and-lanterns/1',
  ),
  track(
    'dev:track:salt-archive:2',
    'dev:edition:salt-and-lanterns:archive-en',
    'Chapter 2 — Fog Signal',
    2,
    'tone-b.wav',
    'https://example.invalid/open-archive/salt-and-lanterns/2',
  ),
  track(
    'dev:track:salt-archive:3',
    'dev:edition:salt-and-lanterns:archive-en',
    'Chapter 3 — Low Water',
    3,
    'tone-c.wav',
    'https://example.invalid/open-archive/salt-and-lanterns/3',
  ),
  track(
    'dev:track:salt-donated:1',
    'dev:edition:salt-and-lanterns:donated-en',
    'Part 1 — Harbour Road',
    1,
    'tone-b.wav',
    'https://example.invalid/donations/salt-and-lanterns/1',
  ),
  track(
    'dev:track:salt-donated:2',
    'dev:edition:salt-and-lanterns:donated-en',
    'Part 2 — The Ledger House',
    2,
    'tone-d.wav',
    'https://example.invalid/donations/salt-and-lanterns/2',
  ),
  track(
    'dev:track:salt-donated:3',
    'dev:edition:salt-and-lanterns:donated-en',
    'Part 3 — Salt and Lanterns',
    3,
    'tone-e.wav',
    'https://example.invalid/donations/salt-and-lanterns/3',
  ),
  track(
    'dev:track:quiet-ledger-archive:1',
    'dev:edition:the-quiet-ledger:archive-en',
    'Entry 1',
    1,
    'tone-c.wav',
    'https://example.invalid/open-archive/the-quiet-ledger/1',
  ),
  track(
    'dev:track:quiet-ledger-archive:2',
    'dev:edition:the-quiet-ledger:archive-en',
    'Entry 2',
    2,
    'tone-a.wav',
    'https://example.invalid/open-archive/the-quiet-ledger/2',
  ),
  track(
    'dev:track:quiet-ledger-archive:3',
    'dev:edition:the-quiet-ledger:archive-en',
    'Entry 3',
    3,
    'tone-e.wav',
    'https://example.invalid/open-archive/the-quiet-ledger/3',
  ),
  track(
    'dev:track:quiet-ledger-undetermined:1',
    'dev:edition:the-quiet-ledger:undetermined-de',
    'Kapitel 1 — Die stille Zahlung',
    1,
    'tone-d.wav',
    'https://example.invalid/undetermined/the-quiet-ledger/1',
  ),
  track(
    'dev:track:quiet-ledger-undetermined:2',
    'dev:edition:the-quiet-ledger:undetermined-de',
    'Kapitel 2 — Das Gegenkonto',
    2,
    'tone-a.wav',
    'https://example.invalid/undetermined/the-quiet-ledger/2',
  ),
  track(
    'dev:track:borrowed-weather-podcast:1',
    'dev:edition:borrowed-weather:podcast-en',
    'Episode 1 — Borrowing',
    1,
    'tone-b.wav',
    'https://example.invalid/borrowed-weather/episode-1',
  ),
  track(
    'dev:track:borrowed-weather-podcast:2',
    'dev:edition:borrowed-weather:podcast-en',
    'Episode 2 — Repaying',
    2,
    'tone-c.wav',
    'https://example.invalid/borrowed-weather/episode-2',
  ),
  track(
    'dev:track:northern-grammar-archive:1',
    'dev:edition:northern-grammar:archive-no',
    'Kapittel 1',
    1,
    'tone-a.wav',
    'https://example.invalid/open-archive/northern-grammar/1',
  ),
  track(
    'dev:track:northern-grammar-archive:2',
    'dev:edition:northern-grammar:archive-no',
    'Kapittel 2',
    2,
    'tone-e.wav',
    'https://example.invalid/open-archive/northern-grammar/2',
  ),
  track(
    'dev:track:second-quiet-ledger:1',
    'dev:edition:the-second-quiet-ledger:archive-en',
    'Entry 1 — Reopened',
    1,
    'tone-d.wav',
    'https://example.invalid/open-archive/the-second-quiet-ledger/1',
  ),
  track(
    'dev:track:second-quiet-ledger:2',
    'dev:edition:the-second-quiet-ledger:archive-en',
    'Entry 2 — Settled',
    2,
    'tone-b.wav',
    'https://example.invalid/open-archive/the-second-quiet-ledger/2',
  ),
];

/** Durations mirror the generated tone fixtures (6/8/5/7/4 seconds). */
const FIXTURE_DURATION: Record<string, number> = {
  'tone-a.wav': 6,
  'tone-b.wav': 8,
  'tone-c.wav': 5,
  'tone-d.wav': 7,
  'tone-e.wav': 4,
};

const tracksWithDurations: Track[] = tracks.map((item) => ({
  ...item,
  durationSeconds: FIXTURE_DURATION[item.audioUrl.split('/').pop() ?? ''],
}));

export const devCatalogue: Catalogue = {
  authors,
  works,
  narrators,
  sources,
  audioEditions,
  tracks: tracksWithDurations,
  isDevelopmentData: true,
};

function matchesText(text: string | undefined, query?: string): boolean {
  if (!query) return true;
  return (text ?? '').toLowerCase().includes(query.trim().toLowerCase());
}

/**
 * Bundled development adapter.
 *
 * It satisfies the same contract as future real adapters, which is the point:
 * adding LibriVox or Internet Archive must not require touching the UI.
 */
export class DevCatalogueAdapter implements SourceAdapter {
  readonly id = 'dev-catalogue';
  readonly displayName = 'Development fixture catalogue';
  readonly isDevelopmentData = true;
  readonly source: Source = {
    id: 'dev:meta-source',
    name: 'Bundled development data (not a real provider)',
    sourceUrl: 'https://example.invalid/',
    sourceType: 'other',
    rightsStatus: 'unknown',
    attribution: 'All bundled entries are fictional development fixtures.',
    availabilityNotes: 'Present in every build for now; will be flagged off before release.',
  };

  private readonly catalogue = devCatalogue;

  isEnabled(): boolean {
    return true;
  }

  async listWorks(query: AdapterQuery = {}): Promise<AdapterPage<Work>> {
    const items = this.catalogue.works.filter((work) => matchesText(work.title, query.text));
    return { items };
  }

  async listAudioEditions(workId: string): Promise<AdapterPage<AudioEdition>> {
    return {
      items: this.catalogue.audioEditions.filter((edition) => edition.workId === workId),
    };
  }

  async listNarrators(editionId: string): Promise<Narrator[]> {
    const edition = this.catalogue.audioEditions.find((item) => item.id === editionId);
    if (!edition) return [];
    return edition.narratorIds
      .map((id) => this.catalogue.narrators.find((narrator) => narrator.id === id))
      .filter((narrator): narrator is Narrator => Boolean(narrator));
  }

  async listTracks(editionId: string): Promise<Track[]> {
    return this.catalogue.tracks
      .filter((item) => item.audioEditionId === editionId)
      .sort((a, b) => a.sequence - b.sequence);
  }

  async getEdition(editionId: string) {
    const edition = this.catalogue.audioEditions.find((item) => item.id === editionId);
    if (!edition) return undefined;
    const work = this.catalogue.works.find((item) => item.id === edition.workId);
    if (!work) return undefined;
    return {
      work,
      edition,
      narrators: await this.listNarrators(editionId),
      tracks: await this.listTracks(editionId),
    };
  }

  async fetchCatalogue(): Promise<Catalogue> {
    return this.catalogue;
  }
}
