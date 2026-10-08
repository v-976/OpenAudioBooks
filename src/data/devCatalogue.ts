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
 * catalogue, narrator browsing, the language architecture and playback
 * persistence during development. Titles, people and descriptions are invented.
 * Audio references point at synthesised tone fixtures under
 * `public/audio/dev/`, not at any real recording.
 *
 * The fixture set deliberately demonstrates the three independent language
 * concepts (see src/domain/language.ts):
 *
 *   - Work "Тайна маяка" has `originalLanguage: 'en'` (fictional) yet has a
 *     Russian narration and an English narration. Original language is never
 *     derived from narration language.
 *   - A Russian-language Work with no known original language, showing that
 *     `originalLanguage` is optional and that "unknown" is valid.
 *   - A Finnish narration of a work whose original language differs again.
 *   - One work with several audio editions in different languages, narrated by
 *     different people, from different sources.
 *
 * Real provider adapters (LibriVox, Internet Archive, MDS, ...) will be added
 * behind the same `SourceAdapter` interface in later milestones and must map
 * their own data into the same domain types, normalising provider language
 * metadata with `normalizeLanguageCode()` before exposing an AudioEdition.
 */

export const DEV_SOURCE_IDS = {
  publicDomainArchive: 'dev:archive-open',
  donatedLibrary: 'dev:donated-library',
  unknownRights: 'dev:undetermined-rights',
  podcastRss: 'dev:podcast-rss',
} as const;

/**
 * Bundled development tone fixtures.
 *
 * Root-relative on purpose. A bare relative path would be resolved against the
 * current route, so the same track would 404 everywhere except `/` — which is
 * exactly the kind of bug that only shows up once playback is started from a
 * nested screen.
 */
const DEV_FIXTURE_BASE = '/audio/dev';

const sources: Source[] = [
  {
    id: DEV_SOURCE_IDS.publicDomainArchive,
    name: 'Открытый архив (тестовый источник)',
    sourceUrl: 'https://example.invalid/open-archive',
    sourceType: 'publicDomainArchive',
    rightsStatus: 'publicDomain',
    licenseName: 'Общественное достояние (тестовый источник)',
    licenseUrl: 'https://example.invalid/open-archive/rights',
    attribution: 'Тестовый источник. Реального содержимого нет.',
    availabilityNotes: 'Вымышленный источник, используется только в тестовых сборках.',
  },
  {
    id: DEV_SOURCE_IDS.donatedLibrary,
    name: 'Библиотека пожертвований сообщества (тестовый источник)',
    sourceUrl: 'https://example.invalid/donations',
    sourceType: 'donatedLibrary',
    rightsStatus: 'licensedFree',
    licenseName: 'Переданная запись, бесплатное прослушивание (тестовый источник)',
    licenseUrl: 'https://example.invalid/donations/terms',
    attribution: 'Тестовый источник. Реального содержимого нет.',
    availabilityNotes:
      'Показывает источник, который бесплатен для прослушивания, но не является общественным достоянием.',
  },
  {
    id: DEV_SOURCE_IDS.unknownRights,
    name: 'Архив с неопределёнными правами (тестовый источник)',
    sourceUrl: 'https://example.invalid/undetermined',
    sourceType: 'other',
    rightsStatus: 'unknown',
    attribution: 'Тестовый источник. Реального содержимого нет.',
    availabilityNotes:
      'Показывает издание, правовой статус которого действительно неизвестен и не должен считаться общественным достоянием.',
  },
  {
    id: DEV_SOURCE_IDS.podcastRss,
    name: 'Независимая подкаст-лента (тестовый источник)',
    sourceUrl: 'https://example.invalid/feed.xml',
    sourceType: 'podcastRss',
    rightsStatus: 'permissionGranted',
    licenseName: 'Разрешение правообладателя на бесплатное распространение (тестовый источник)',
    attribution: 'Тестовый источник. Реального содержимого нет.',
  },
];

const authors: Author[] = [
  { id: 'dev:author:harriet-vane', name: 'Harriet Vane' },
  { id: 'dev:author:tobias-rell', name: 'Tobias Rell' },
  { id: 'dev:author:amina-okonkwo', name: 'Amina Okonkwo' },
  { id: 'dev:author:sigurd-halvard', name: 'Sigurd Halvard' },
  { id: 'dev:author:leila-farrow', name: 'Leila Farrow' },
  { id: 'dev:author:vera-solovyova', name: 'Вера Соловьёва' },
  { id: 'dev:author:petri-lehtinen', name: 'Petri Lehtinen' },
];

const narrators: Narrator[] = [
  {
    id: 'dev:narrator:mireille-fontaine',
    name: 'Mireille Fontaine',
    biography: 'Вымышленный диктор, созданный для тестовых данных.',
    aliases: ['M. Fontaine', 'Fontaine, Mireille'],
    imageUrl: 'https://example.invalid/img/mireille-fontaine.png',
  },
  {
    id: 'dev:narrator:dmitri-salazar',
    name: 'Дмитрий Салазар',
    biography: 'Вымышленный диктор, созданный для тестовых данных.',
    aliases: ['Д. Салазар', 'Dmitri Salazar'],
  },
  {
    id: 'dev:narrator:priya-raman',
    name: 'Priya Raman',
    biography: 'Вымышленный диктор, созданный для тестовых данных.',
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
      'Вымышленный диктор, читающий несколько произведений на разных языках, чтобы показать навигацию по дикторам, не зависящую от языка.',
    aliases: ['Jo Marsh'],
  },
  {
    id: 'dev:narrator:anastasia-petrova',
    name: 'Анастасия Петрова',
    biography: 'Вымышленный диктор, созданный для тестовых данных.',
    aliases: ['А. Петрова'],
  },
  {
    id: 'dev:narrator:aino-virtanen',
    name: 'Aino Virtanen',
    biography: 'Вымышленный диктор, созданный для тестовых данных.',
    aliases: ['A. Virtanen'],
  },
];

const works: Work[] = [
  {
    // Original language ENGLISH, but narrated in Russian, English and Finnish.
    // This single work is the clearest proof that original language and
    // narration language are independent.
    id: 'dev:work:mysterious-lighthouse',
    title: 'Тайна маяка',
    authorIds: ['dev:author:harriet-vane'],
    description:
      'Вымышленная тестовая запись. Прибрежный посёлок хранит маяк, который никто не помнит включённым.',
    genres: ['Художественная литература', 'Детектив'],
    originalLanguage: 'en',
    metadata: { fixture: 'true' },
  },
  {
    // Russian-language work. Original language deliberately omitted: unknown is
    // a valid state and must not be inferred from the narration.
    id: 'dev:work:quiet-ledger',
    title: 'Тихая книга',
    authorIds: ['dev:author:tobias-rell'],
    description:
      'Вымышленная тестовая запись. Бухгалтер находит проводку, которой не должно существовать.',
    genres: ['Художественная литература', 'Историческая проза'],
    series: { name: 'Трилогия о книге', position: 1 },
  },
  {
    id: 'dev:work:borrowed-weather',
    title: 'Чужая погода',
    authorIds: ['dev:author:amina-okonkwo'],
    description: 'Вымышленная тестовая запись. Два города спорят, чей это дождь.',
    genres: ['Фантастика', 'Рассказы'],
    originalLanguage: 'en',
  },
  {
    // Original language Norwegian, no Russian or English edition.
    id: 'dev:work:northern-grammar',
    title: 'Северная грамматика',
    authorIds: ['dev:author:sigurd-halvard', 'dev:author:leila-farrow'],
    description:
      'Вымышленная тестовая запись. Двуязычное путешествие по вымышленному побережью.',
    genres: ['Путешествия', 'Документальная проза'],
    originalLanguage: 'no',
  },
  {
    // Russian original, with a Russian and a German edition.
    id: 'dev:work:second-quiet-ledger',
    title: 'Вторая тихая книга',
    authorIds: ['dev:author:tobias-rell'],
    description: 'Вымышленная тестовая запись. Продолжение для проверки навигации по сериям.',
    genres: ['Художественная литература', 'Историческая проза'],
    series: { name: 'Трилогия о книге', position: 2 },
  },
  {
    // Russian work, Russian-only edition: the default view must show it.
    id: 'dev:work:evening-post',
    title: 'Вечерняя почта',
    authorIds: ['dev:author:vera-solovyova'],
    description:
      'Вымышленная тестовая запись. Русскоязычное произведение с единственным русским изданием.',
    genres: ['Художественная литература', 'Проза'],
    originalLanguage: 'ru',
  },
  {
    // Original language Finnish, with a Russian narration: work language differs
    // from narration language in the opposite direction.
    id: 'dev:work:quiet-harbour',
    title: 'Тихая гавань',
    authorIds: ['dev:author:petri-lehtinen'],
    description:
      'Вымышленная тестовая запись. Финское произведение с русским и финским озвучиванием.',
    genres: ['Художественная литература'],
    originalLanguage: 'fi',
  },
];

const audioEditions: AudioEdition[] = [
  {
    id: 'dev:edition:mysterious-lighthouse:ru',
    workId: 'dev:work:mysterious-lighthouse',
    narratorIds: ['dev:narrator:dmitri-salazar'],
    sourceId: DEV_SOURCE_IDS.publicDomainArchive,
    narrationLanguage: 'ru',
    releaseYear: 1911,
    publisher: 'Тестовое издательство',
    coverUrl: 'https://example.invalid/cover/mysterious-lighthouse.png',
    durationSeconds: 19,
    rightsStatus: 'publicDomain',
    licenseName: 'Общественное достояние',
    sourceUrl: 'https://example.invalid/open-archive/mysterious-lighthouse/ru',
    trackCount: 3,
  },
  {
    id: 'dev:edition:mysterious-lighthouse:en',
    workId: 'dev:work:mysterious-lighthouse',
    narratorIds: ['dev:narrator:mireille-fontaine'],
    sourceId: DEV_SOURCE_IDS.donatedLibrary,
    narrationLanguage: 'en',
    releaseYear: 1911,
    publisher: 'Тестовое издательство',
    durationSeconds: 15,
    rightsStatus: 'licensedFree',
    licenseName: 'Переданная запись, бесплатное прослушивание',
    licenseUrl: 'https://example.invalid/donations/terms',
    sourceUrl: 'https://example.invalid/donations/mysterious-lighthouse/en',
    trackCount: 3,
  },
  {
    id: 'dev:edition:mysterious-lighthouse:fi',
    workId: 'dev:work:mysterious-lighthouse',
    narratorIds: ['dev:narrator:aino-virtanen'],
    sourceId: DEV_SOURCE_IDS.publicDomainArchive,
    narrationLanguage: 'fi',
    releaseYear: 1911,
    durationSeconds: 11,
    rightsStatus: 'publicDomain',
    licenseName: 'Общественное достояние',
    sourceUrl: 'https://example.invalid/open-archive/mysterious-lighthouse/fi',
    trackCount: 2,
  },
  {
    id: 'dev:edition:quiet-ledger:ru',
    workId: 'dev:work:quiet-ledger',
    narratorIds: ['dev:narrator:anastasia-petrova'],
    sourceId: DEV_SOURCE_IDS.publicDomainArchive,
    narrationLanguage: 'ru',
    releaseYear: 1908,
    durationSeconds: 20,
    rightsStatus: 'publicDomain',
    licenseName: 'Общественное достояние',
    sourceUrl: 'https://example.invalid/open-archive/quiet-ledger/ru',
    trackCount: 3,
  },
  {
    // German edition of a work with no known original language: shows that a
    // narration language can exist without a stated work language, and that
    // rights status is tracked per edition.
    id: 'dev:edition:quiet-ledger:de',
    workId: 'dev:work:quiet-ledger',
    narratorIds: ['dev:narrator:oliver-brant', 'dev:narrator:priya-raman'],
    sourceId: DEV_SOURCE_IDS.unknownRights,
    narrationLanguage: 'de',
    releaseYear: 2021,
    durationSeconds: 9,
    rightsStatus: 'unknown',
    sourceUrl: 'https://example.invalid/undetermined/quiet-ledger/de',
    trackCount: 2,
    fetchedAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'dev:edition:borrowed-weather:ru',
    workId: 'dev:work:borrowed-weather',
    narratorIds: ['dev:narrator:shared-narrator'],
    sourceId: DEV_SOURCE_IDS.podcastRss,
    narrationLanguage: 'ru',
    releaseYear: 2023,
    durationSeconds: 12,
    rightsStatus: 'permissionGranted',
    licenseName: 'Разрешение правообладателя',
    sourceUrl: 'https://example.invalid/borrowed-weather/ru',
    trackCount: 2,
  },
  {
    id: 'dev:edition:borrowed-weather:en',
    workId: 'dev:work:borrowed-weather',
    narratorIds: ['dev:narrator:priya-raman', 'dev:narrator:shared-narrator'],
    sourceId: DEV_SOURCE_IDS.podcastRss,
    narrationLanguage: 'en',
    releaseYear: 2023,
    durationSeconds: 12,
    rightsStatus: 'permissionGranted',
    licenseName: 'Разрешение правообладателя',
    sourceUrl: 'https://example.invalid/borrowed-weather/en',
    trackCount: 2,
  },
  {
    id: 'dev:edition:northern-grammar:ru',
    workId: 'dev:work:northern-grammar',
    narratorIds: ['dev:narrator:shared-narrator', 'dev:narrator:oliver-brant'],
    sourceId: DEV_SOURCE_IDS.publicDomainArchive,
    narrationLanguage: 'ru',
    releaseYear: 1927,
    durationSeconds: 11,
    rightsStatus: 'publicDomain',
    licenseName: 'Общественное достояние',
    sourceUrl: 'https://example.invalid/open-archive/northern-grammar/ru',
    trackCount: 2,
  },
  {
    id: 'dev:edition:second-quiet-ledger:ru',
    workId: 'dev:work:second-quiet-ledger',
    narratorIds: ['dev:narrator:mireille-fontaine'],
    sourceId: DEV_SOURCE_IDS.publicDomainArchive,
    narrationLanguage: 'ru',
    releaseYear: 1912,
    durationSeconds: 12,
    rightsStatus: 'publicDomain',
    licenseName: 'Общественное достояние',
    sourceUrl: 'https://example.invalid/open-archive/second-quiet-ledger/ru',
    trackCount: 2,
  },
  {
    id: 'dev:edition:evening-post:ru',
    workId: 'dev:work:evening-post',
    narratorIds: ['dev:narrator:anastasia-petrova', 'dev:narrator:dmitri-salazar'],
    sourceId: DEV_SOURCE_IDS.donatedLibrary,
    narrationLanguage: 'ru',
    releaseYear: 2020,
    durationSeconds: 9,
    rightsStatus: 'licensedFree',
    licenseName: 'Переданная запись, бесплатное прослушивание',
    licenseUrl: 'https://example.invalid/donations/terms',
    sourceUrl: 'https://example.invalid/donations/evening-post/ru',
    trackCount: 2,
  },
  {
    // Russian narration of a Finnish original work.
    id: 'dev:edition:quiet-harbour:ru',
    workId: 'dev:work:quiet-harbour',
    narratorIds: ['dev:narrator:dmitri-salazar'],
    sourceId: DEV_SOURCE_IDS.donatedLibrary,
    narrationLanguage: 'ru',
    releaseYear: 2018,
    durationSeconds: 12,
    rightsStatus: 'licensedFree',
    licenseName: 'Переданная запись, бесплатное прослушивание',
    sourceUrl: 'https://example.invalid/donations/quiet-harbour/ru',
    trackCount: 2,
  },
  {
    // Finnish narration of the same Finnish work, alongside the Russian edition.
    id: 'dev:edition:quiet-harbour:fi',
    workId: 'dev:work:quiet-harbour',
    narratorIds: ['dev:narrator:aino-virtanen'],
    sourceId: DEV_SOURCE_IDS.publicDomainArchive,
    narrationLanguage: 'fi',
    releaseYear: 2018,
    durationSeconds: 11,
    rightsStatus: 'publicDomain',
    licenseName: 'Общественное достояние',
    sourceUrl: 'https://example.invalid/open-archive/quiet-harbour/fi',
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
    'dev:track:lighthouse-ru:1',
    'dev:edition:mysterious-lighthouse:ru',
    'Глава 1 — Хранитель',
    1,
    'tone-a.wav',
    'https://example.invalid/open-archive/mysterious-lighthouse/ru/1',
  ),
  track(
    'dev:track:lighthouse-ru:2',
    'dev:edition:mysterious-lighthouse:ru',
    'Глава 2 — Сигнал в тумане',
    2,
    'tone-b.wav',
    'https://example.invalid/open-archive/mysterious-lighthouse/ru/2',
  ),
  track(
    'dev:track:lighthouse-ru:3',
    'dev:edition:mysterious-lighthouse:ru',
    'Глава 3 — Малая вода',
    3,
    'tone-c.wav',
    'https://example.invalid/open-archive/mysterious-lighthouse/ru/3',
  ),
  track(
    'dev:track:lighthouse-en:1',
    'dev:edition:mysterious-lighthouse:en',
    'Chapter 1 — The Keeper',
    1,
    'tone-b.wav',
    'https://example.invalid/donations/mysterious-lighthouse/en/1',
  ),
  track(
    'dev:track:lighthouse-en:2',
    'dev:edition:mysterious-lighthouse:en',
    'Chapter 2 — Fog Signal',
    2,
    'tone-d.wav',
    'https://example.invalid/donations/mysterious-lighthouse/en/2',
  ),
  track(
    'dev:track:lighthouse-en:3',
    'dev:edition:mysterious-lighthouse:en',
    'Chapter 3 — Low Water',
    3,
    'tone-e.wav',
    'https://example.invalid/donations/mysterious-lighthouse/en/3',
  ),
  track(
    'dev:track:lighthouse-fi:1',
    'dev:edition:mysterious-lighthouse:fi',
    'Luku 1 — Vartija',
    1,
    'tone-d.wav',
    'https://example.invalid/open-archive/mysterious-lighthouse/fi/1',
  ),
  track(
    'dev:track:lighthouse-fi:2',
    'dev:edition:mysterious-lighthouse:fi',
    'Luku 2 — Merisumu',
    2,
    'tone-a.wav',
    'https://example.invalid/open-archive/mysterious-lighthouse/fi/2',
  ),
  track(
    'dev:track:quiet-ledger-ru:1',
    'dev:edition:quiet-ledger:ru',
    'Проводка 1',
    1,
    'tone-c.wav',
    'https://example.invalid/open-archive/quiet-ledger/ru/1',
  ),
  track(
    'dev:track:quiet-ledger-ru:2',
    'dev:edition:quiet-ledger:ru',
    'Проводка 2',
    2,
    'tone-a.wav',
    'https://example.invalid/open-archive/quiet-ledger/ru/2',
  ),
  track(
    'dev:track:quiet-ledger-ru:3',
    'dev:edition:quiet-ledger:ru',
    'Проводка 3',
    3,
    'tone-e.wav',
    'https://example.invalid/open-archive/quiet-ledger/ru/3',
  ),
  track(
    'dev:track:quiet-ledger-de:1',
    'dev:edition:quiet-ledger:de',
    'Kapitel 1 — Die stille Zahlung',
    1,
    'tone-d.wav',
    'https://example.invalid/undetermined/quiet-ledger/de/1',
  ),
  track(
    'dev:track:quiet-ledger-de:2',
    'dev:edition:quiet-ledger:de',
    'Kapitel 2 — Das Gegenkonto',
    2,
    'tone-a.wav',
    'https://example.invalid/undetermined/quiet-ledger/de/2',
  ),
  track(
    'dev:track:borrowed-weather-ru:1',
    'dev:edition:borrowed-weather:ru',
    'Выпуск 1 — Одолжили',
    1,
    'tone-b.wav',
    'https://example.invalid/borrowed-weather/ru/1',
  ),
  track(
    'dev:track:borrowed-weather-ru:2',
    'dev:edition:borrowed-weather:ru',
    'Выпуск 2 — Вернули',
    2,
    'tone-c.wav',
    'https://example.invalid/borrowed-weather/ru/2',
  ),
  track(
    'dev:track:borrowed-weather-en:1',
    'dev:edition:borrowed-weather:en',
    'Episode 1 — Borrowing',
    1,
    'tone-d.wav',
    'https://example.invalid/borrowed-weather/en/1',
  ),
  track(
    'dev:track:borrowed-weather-en:2',
    'dev:edition:borrowed-weather:en',
    'Episode 2 — Repaying',
    2,
    'tone-e.wav',
    'https://example.invalid/borrowed-weather/en/2',
  ),
  track(
    'dev:track:northern-grammar-ru:1',
    'dev:edition:northern-grammar:ru',
    'Глава 1',
    1,
    'tone-a.wav',
    'https://example.invalid/open-archive/northern-grammar/ru/1',
  ),
  track(
    'dev:track:northern-grammar-ru:2',
    'dev:edition:northern-grammar:ru',
    'Глава 2',
    2,
    'tone-e.wav',
    'https://example.invalid/open-archive/northern-grammar/ru/2',
  ),
  track(
    'dev:track:second-quiet-ledger-ru:1',
    'dev:edition:second-quiet-ledger:ru',
    'Проводка 1 — Возобновлена',
    1,
    'tone-d.wav',
    'https://example.invalid/open-archive/second-quiet-ledger/ru/1',
  ),
  track(
    'dev:track:second-quiet-ledger-ru:2',
    'dev:edition:second-quiet-ledger:ru',
    'Проводка 2 — Закрыта',
    2,
    'tone-b.wav',
    'https://example.invalid/open-archive/second-quiet-ledger/ru/2',
  ),
  track(
    'dev:track:evening-post-ru:1',
    'dev:edition:evening-post:ru',
    'Письмо 1',
    1,
    'tone-c.wav',
    'https://example.invalid/donations/evening-post/ru/1',
  ),
  track(
    'dev:track:evening-post-ru:2',
    'dev:edition:evening-post:ru',
    'Письмо 2',
    2,
    'tone-d.wav',
    'https://example.invalid/donations/evening-post/ru/2',
  ),
  track(
    'dev:track:quiet-harbour-ru:1',
    'dev:edition:quiet-harbour:ru',
    'Глава 1',
    1,
    'tone-a.wav',
    'https://example.invalid/donations/quiet-harbour/ru/1',
  ),
  track(
    'dev:track:quiet-harbour-ru:2',
    'dev:edition:quiet-harbour:ru',
    'Глава 2',
    2,
    'tone-b.wav',
    'https://example.invalid/donations/quiet-harbour/ru/2',
  ),
  track(
    'dev:track:quiet-harbour-fi:1',
    'dev:edition:quiet-harbour:fi',
    'Luku 1',
    1,
    'tone-c.wav',
    'https://example.invalid/open-archive/quiet-harbour/fi/1',
  ),
  track(
    'dev:track:quiet-harbour-fi:2',
    'dev:edition:quiet-harbour:fi',
    'Luku 2',
    2,
    'tone-e.wav',
    'https://example.invalid/open-archive/quiet-harbour/fi/2',
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

/**
 * Fails loudly if a fixture ever ends up with a relative audio URL again.
 * `toBeTruthy` alone would not catch `audio/dev/tone-a.wav`.
 */
for (const item of tracksWithDurations) {
  if (!item.audioUrl.startsWith('/')) {
    throw new Error(
      `Development fixture track "${item.id}" must use a root-relative audioUrl, got "${item.audioUrl}".`,
    );
  }
}

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
 * adding a real provider must not require touching the UI. Note that even here
 * narration language values are normalised through the domain utility rather
 * than hard-coded, so the adapter path is the one that will be exercised.
 */
export class DevCatalogueAdapter implements SourceAdapter {
  readonly id = 'dev-catalogue';
  readonly displayName = 'Тестовый каталог';
  readonly isDevelopmentData = true;
  readonly source: Source = {
    id: 'dev:meta-source',
    name: 'Встроенные тестовые данные (не реальный источник)',
    sourceUrl: 'https://example.invalid/',
    sourceType: 'other',
    rightsStatus: 'unknown',
    attribution: 'Все встроенные записи — вымышленные тестовые данные.',
    availabilityNotes: 'Присутствуют во всех сборках; должны быть отключены перед выпуском.',
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
