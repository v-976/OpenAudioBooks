# OpenAudioBooks — Architecture

Alpha 0.1.1. This document describes how the codebase is organised, why, and
where the seams are for the work that comes next.

Read this before changing architecture, and read
[AGENTS.md](AGENTS.md) for the rules that constrain such changes.

---

## 1. Design goals

1. **Narrator-first.** A narrator is a record with an identity, not a string in a
   book. Everything the app offers about narrators follows from that.
2. **Provider-agnostic core.** No domain type may encode a concept that only
   exists for one source. Adding a provider must not require touching the UI.
3. **Local-first.** Playback state lives on the user's device. No account, no
   server, no network writes.
4. **Honest rights metadata.** "Free to listen" is not "public domain", and the
   data model says so.
5. **Multilingual by construction.** Interface language, work language and
   narration language are three independent concepts. Russian is the initial
   default, not a design constraint.
6. **Simple over clever.** A static frontend, a small dependency set, and
   understandable code.

## 2. Layer map

```
┌──────────────────────────────────────────────────────────┐
│  UI          src/pages, src/components, src/app/AppShell  │
│              reads contexts; never imports adapters       │
├──────────────────────────────────────────────────────────┤
│  Localization src/i18n/*                                  │
│              typed keys, locale bundles, plurals, t()     │
├──────────────────────────────────────────────────────────┤
│  Application src/app/*Provider, src/player/PlayerProvider │
│              orchestration + context boundaries            │
├──────────────────────────────────────────────────────────┤
│  Domain      src/domain/*                                  │
│              entities, indexes, search, language, rights   │
│              pure; no DOM, no storage, no provider names   │
├──────────────────────────────────────────────────────────┤
│  Sources     src/sources/adapter.ts (contract),            │
│              src/data/devCatalogue.ts (bundled fixture)    │
├──────────────────────────────────────────────────────────┤
│  Persistence src/persistence/*                             │
│              IndexedDB schema + migrations + repositories  │
└──────────────────────────────────────────────────────────┘
```

Dependencies point downward only. `src/domain` imports nothing from `src/app`,
`src/pages`, `src/sources` or `src/persistence` — the single exception is a
*type-only* import of translation keys in `rights.ts`, which carries no runtime
coupling — which is what keeps the domain testable in isolation and keeps the
Android client reusable. `src/i18n` depends only on `src/domain/language` and
`src/i18n/keys`, so an Android client can reuse the domain without dragging a web
translation layer along.

### Technology choices and why

| Choice | Rationale |
| --- | --- |
| TypeScript, `strict` + `noUncheckedIndexedAccess`-adjacent flags | The domain model is the project's main asset; types should enforce its invariants at compile time |
| React 19 + Vite 7 | Conservative, extremely well-supported, small and fast. Vite gives a trivial dev loop and a static build with no server component |
| React Router 7 (declarative routes) | Deep links to `/narrators/:id`, `/works/:id`, `/editions/:id`, `/sources/:id` are a stated requirement; routing is not worth reimplementing |
| React Context + hooks, no state library | The state graph is shallow: catalogue → user data → player. A reducer or external store would be added complexity with no benefit yet |
| Hand-written IndexedDB layer, no `idb`-style wrapper | The schema is four stores. ~150 lines of promise adapters is cheaper than a dependency and makes the migration story explicit |
| Vitest + jsdom + fake-indexeddb | Runs alongside Vite config; in-memory IndexedDB lets persistence be tested for real, including reopen and migration paths |
| Hand-written service worker | The caching requirements are small and specific. A generated SW would obscure the "never touch cross-origin audio" guarantee, which is a rule, not a preference |
| CSS hand-written, system font stack, no framework | Mobile-first readability and 44px touch targets matter more than polish this phase. No external fonts means no third-party requests |

Deliberate non-choices: no backend, no database, no auth, no analytics, no
service SDK, no component library, no CSS framework.

Runtime dependencies are `react`, `react-dom` and `react-router-dom`. Everything
else is a build or test dependency.

## 3. Domain entities

Defined in `src/domain/types.ts`. All ids are strings, namespaced by source
(`<sourceId>:<localId>`) so two providers describing the same person never
collide. User-created records use a `user:` prefix.

| Entity | Purpose | Key fields |
| --- | --- | --- |
| `Author` | The writer | `id`, `name`, optional `metadata` |
| `Narrator` | The performer | `id`, `name`, `biography?`, `imageUrl?`, `aliases[]` |
| `Work` | The abstract literary work | `id`, `title`, `authorIds[]`, `description?`, `genres[]`, `originalLanguage?`, `series?` |
| `Source` | Where audio comes from | `id`, `name`, `sourceUrl`, `sourceType`, `rightsStatus`, `licenseName?`, `licenseUrl?`, `attribution?`, `availabilityNotes?` |
| `AudioEdition` | A concrete narrated recording | `id`, `workId`, `narratorIds[]`, `sourceId`, **`narrationLanguage`**, `releaseYear?`, `publisher?`, `coverUrl?`, `durationSeconds?`, **own** `rightsStatus`/`licenseName`/`licenseUrl`, `sourceUrl?`, `fetchedAt?` |
| `Track` | A chapter | `id`, `audioEditionId`, `title`, `sequence`, `durationSeconds?`, `audioUrl`, `sourceUrl?`, `narrationLanguage?` (override only) |
| `UserState` | Local playback state | `audioEditionId`, `trackId`, `positionSeconds`, `lastPlayedAt`, `playbackRate`, `completed`, `favorite` |
| `Bookmark` | A saved position | `id`, `audioEditionId`, `trackId`, `positionSeconds`, `createdAt`, `note?` |

### Relationships

```
Author ──< Work.authorIds
Work ──1 AudioEdition ──< Track
AudioEdition ──< Narrator          (narratorIds, many-to-many)
AudioEdition ──1 Source
AudioEdition ──1 UserState         (playback state, bookmarks)
```

Invariants that must hold:

- An `AudioEdition` belongs to exactly one `Work` and one `Source`, and has one
  or more narrators (possibly many).
- One `Work` may have many `AudioEdition`s. They are distinct listenings with
  distinct narrators, sources, **narration languages** and rights.
- `UserState`, bookmarks and favourites key on `audioEditionId`, never on
  `workId`. Two editions of one work never share playback state.
- `Work.originalLanguage` is the language of the text;
  `AudioEdition.narrationLanguage` is the language of the recording. They are
  separate fields, `originalLanguage` is optional, and neither is ever derived
  from the other. See §12.
- A track's narration language is its edition's language unless the source
  explicitly declared otherwise.

### Rights vocabulary

`RightsStatus` (`src/domain/types.ts`, labels in `src/domain/rights.ts`):

| Value | Meaning |
| --- | --- |
| `publicDomain` | Source asserts public-domain status |
| `creativeCommons` | Released under a CC licence; check the licence URL |
| `licensedFree` | Free to listen under some other licence |
| `permissionGranted` | Rights holder granted free distribution |
| `unknown` | **The source has not stated a status.** Not an assumption of public domain |

MDS ("Модель для сборки") content is the canonical example of why `unknown` and
`licensedFree` must exist: it is free to listen and is *not* automatically public
domain. Adapters must report what the source reports, and default to `unknown`.

Rights are modelled on both `Source` and `AudioEdition` because a single source
can host items with different terms. The edition's value wins for that edition.

## 4. Source adapter architecture

`src/sources/adapter.ts` defines the contract. Adapters are the only place
allowed to know how a provider works.

```ts
interface SourceAdapter {
  readonly id: string;
  readonly displayName: string;
  readonly isDevelopmentData: boolean;
  readonly source: Source;

  isEnabled(): boolean;
  listWorks(query?): Promise<AdapterPage<Work>>;
  listAudioEditions(workId, query?): Promise<AdapterPage<AudioEdition>>;
  listNarrators(editionId): Promise<Narrator[]>;
  listTracks(editionId): Promise<Track[]>;
  getEdition(editionId): Promise<EditionBundle | undefined>;
  fetchCatalogue?(query?): Promise<Catalogue>;
}
```

Rules an adapter must follow:

1. Map native payloads into domain types. Native shapes must not leak past the
   adapter boundary.
2. Report rights status honestly; default to `unknown`.
3. Return **remote URLs only**. Never download, cache or re-host audio.
4. Resolve narrators as first-class `Narrator` records, including aliases, so
   narrator browsing works from the moment data arrives.
5. **Normalise language metadata** through `normalizeLanguageCode()` before
   setting `AudioEdition.narrationLanguage`, and never derive
   `Work.originalLanguage` from it. Leave an unknown work language unknown.
6. Namespace every id with the adapter's `source.id`.
7. Return `{ unsupported: true }` rather than throwing when a provider genuinely
   cannot answer a query.

`AdapterRegistry` (`src/sources/adapter.ts`) holds the enabled adapters.
`CatalogueProvider` builds the registry and merges the catalogues returned by
adapters; it is unaware of any specific provider. `CatalogueContext` exposes the
merged result to the UI, so screens never import adapter code.

To add a provider: implement the interface, register it in `createRegistry()` in
`src/app/CatalogueProvider.tsx`, and add fixture data. No screen should change.

### Catalogue index and search

`src/domain/search.ts` builds a `CatalogueIndex` (maps for works, authors,
narrators, sources, and reverse indexes: editions by work, narrator, author,
source and genre; tracks by edition). `searchEditions()` takes explicit facets
and combines them, which is what makes `author + narrator`, `genre + narrator`,
`source + narrator` and every one of those combined with a narration language work
without special-casing:

```ts
searchEditions(index, { authorIds: [...], narratorIds: [...] })
searchEditions(index, { genre: 'Historical', narratorIds: [...] })
searchEditions(index, { sourceIds: [...], narratorIds: [...] })
searchEditions(index, { narratorIds: [...], narrationLanguages: ['ru'] })
```

Free-text search matches titles, descriptions, genres, series, author names,
narrator names **and aliases**, source name, publisher and track titles.

## 5. Persistence layer

Two mechanisms, chosen by size and need.

**IndexedDB** (`src/persistence/db.ts`) for structured, sizeable local state.
Database `openaudiobooks`, currently version 1:

| Store | Key | Indexes |
| --- | --- | --- |
| `userState` | `audioEditionId` | `lastPlayedAt` |
| `bookmarks` | `id` | `audioEditionId`, `createdAt` |
| `history` | `id` | `audioEditionId`, `playedAt` |
| `meta` | `key` | — |

**localStorage** (`src/persistence/preferencesRepository.ts`) for a handful of
scalars: playback rate, skip intervals, the last-played pointer, and the two
language preferences. Needed synchronously before first paint, and not personal
data. Values are clamped on read, and a corrupted or unavailable store falls back
to defaults rather than breaking startup. See §12 for the 0.1.0 → 0.1.1 data
impact.

### Migrations

`MIGRATIONS` in `src/persistence/db.ts` is an append-only ledger. Each entry has
a version, a description and a **`dataImpact`** note that must state what happens
to existing records. `openDatabase()` applies every migration above the stored
version inside the `upgradeneeded` transaction.

Rules for changing the schema:

1. Append a migration. Never edit or reorder existing entries.
2. Bump `DB_VERSION` to match the highest migration version.
3. Write the `dataImpact` note.
4. Add a test that exercises the upgrade path.
5. Note the migration in this document.

Records also carry a `recordVersion` so a shape change can be normalised on read
(`migrateUserState` in `src/persistence/userStateRepository.ts`) instead of
discarding older data. Backwards compatibility of stored user playback data is a
requirement, not a nicety.

`history` is pruned to `MAX_HISTORY_ENTRIES` (200) so local storage cannot grow
without bound.

## 6. Player state architecture

Two layers, separated so the interesting logic is testable without a browser.

**`src/player/playerMachine.ts` — pure functions.** No DOM, no storage. Resume
resolution (`resolveResumeTarget`), track navigation (`nextTrack`,
`previousTrack`), skip that spills across track boundaries (`computeSkip`),
edition progress, completion detection, duration formatting, position clamping.
This is where "where do we resume?" is actually decided, and it is unit-tested.

**`src/player/PlayerProvider.tsx` — one media element, persisted state.** Owns a
single `<audio>` element rendered in the DOM (not `new Audio()`, so Media Session
and lock-screen integration work on mobile) and exposes intent-based methods
through `PlayerContext`: `play`, `pause`, `toggle`, `seekTo`, `skipForward`,
`skipBackward`, `nextTrack`, `previousTrack`, `selectTrack`, `setPlaybackRate`,
`flushProgress`. Screens never touch `HTMLMediaElement`.

### How position survives a restart

```
timeupdate ─┐
play/pause ─┤
seek ───────┼─► persist(audioEditionId, trackId, positionSeconds, playbackRate)
track change┤        │
rate change ─┘        ├─► IndexedDB userState  (keyed by audioEditionId)
                      └─► localStorage preferences.lastAudioEditionId

visibilitychange (hidden) ─┐
pagehide ──────────────────┴─► forced flush
```

`PROGRESS_SAVE_INTERVAL_MS` is 4000 ms for in-flight updates; anything that
represents a deliberate user action forces a write immediately. `pagehide` is the
last reliable hook before iOS Safari may discard the page.

The media element itself is never persisted. Only the
`(audioEditionId, trackId, positionSeconds)` triple is, which is exactly what
`resolveResumeTarget` needs to restore state:

| Stored situation | Resumed at |
| --- | --- |
| No stored state | First track, 0:00 |
| Stored track still exists | That track at that position |
| Stored track no longer exists | First track, 0:00 |
| Stored position at/past track end | Next track, 0:00 |
| Last track finished | First track, 0:00 (edition complete) |

### Completion and resume semantics

`play(editionId)` with no explicit track or offset resolves against the position
stored for that edition, so a bare "Play" or "Resume" from any screen lands on
the right chapter at the right second. An explicit `trackId` always wins, which
is what "Play from start", the track list and per-track buttons use.

Completion is **not** inferred from an arbitrary position reaching a large
value. `isEditionFinished(tracks, current, position, duration)` only returns true
on the edition's final track, within 2 seconds of its length, using the real
media duration in preference to catalogue metadata. Finishing chapter 1 of a
three-chapter book does not complete the book. The player passes that decision
into the repository as `markCompleted`; the repository never infers it, because
it has no access to the track list.

A completed edition rewinds to position 0, so resuming it starts the book again
rather than sitting at the final second.

Progress, bookmarks and favourites are all keyed on the audio edition, so two
editions of the same work are fully independent.

## 7. UI structure

Mobile-first, bottom navigation with four destinations: **Library**, **Search**,
**Now Playing**, **My Books**. A mini player sits above the navigation whenever
an edition is loaded.

Routes (`src/app/AppRoutes.tsx`):

| Path | Screen |
| --- | --- |
| `/` | Library / Home |
| `/search` | Search with facet filters |
| `/now-playing` | Transport, track list, bookmarks |
| `/my-books` | Continue listening, favourites, finished, local-data controls |
| `/settings` | Interface language, audiobook languages, local-data info |
| `/browse/:kind` | Narrator / author / source index (`narrators`, `authors`, `sources`) |
| `/narrators/:narratorId` | Narrator detail with all narrated editions |
| `/authors/:authorId` | Author detail |
| `/works/:workId` | Work detail with all its audio editions |
| `/editions/:editionId` | Audio edition detail, rights and track list |
| `/sources/:sourceId` | Source detail, attribution and rights |
| `/about` | Project information and status |

Tests live beside the code as `*.test.ts` / `*.test.tsx` and run in jsdom with
an in-memory IndexedDB, making no network requests. `src/player/persistence.test.tsx`
drives the real provider stack and the real media element, which is how
cross-restart resume is verified rather than asserted.

Entity ids contain colons, so route segments are `encodeURIComponent`-encoded and
decoded on read. Route paths and ids are **not** localised: they stay stable
English identifiers so deep links and the Android client keep working regardless
of interface language.

Touch targets are 44px minimum. Focus is visible. Colours come from CSS custom
properties with a light and dark scheme. Visual polish was intentionally
deprioritised; `prefers-reduced-motion` is respected.

## 8. Development data

`src/data/devCatalogue.ts` ships a small fictional catalogue, all ids prefixed
`dev:` and all URLs on the reserved `example.invalid` domain. Since 0.1.1 it is
built to demonstrate the language architecture rather than English-first
browsing:

- 7 authors, 7 works, 7 narrators, 4 sources, 12 audio editions, 27 tracks
- **`Тайна маяка`**: `originalLanguage: 'en'` with Russian, English *and* Finnish
  editions, each narrated by a different narrator. This is the proof that work
  language ≠ narration language and that one work spans several languages.
- **`Тихая книга`**: no `originalLanguage` at all, with Russian and German
  editions — "unknown" is a valid state.
- **`Тихая гавань`**: `originalLanguage: 'fi'` with Russian *and* Finnish
  editions — the mismatch in the opposite direction.
- one narrator appearing across several works, sources and languages
- a two-book series, and editions in `ru`, `en`, `fi`, `de`
- all four non-public-domain rights states, including a deliberate `unknown`

`DevCatalogueAdapter` implements the same `SourceAdapter` contract as a real
provider, which is the point: it proves the seam is real.

Audio fixtures are sine tones generated by `scripts/generate-fixtures.mjs` into
`public/audio/dev/`. Icons are placeholder marks generated by
`scripts/generate-icons.mjs`. Neither contains third-party material.

`Catalogue.isDevelopmentData` propagates to the UI, which labels the catalogue as
fixtures. This must be removed or made a build flag before any release.

## 9. PWA implementation

- `public/manifest.webmanifest` — standalone display, start URL `/`, theme and
  background colours, `any` and `maskable` icons.
- `public/icons/` — generated placeholders at 192, 512 and 180 (apple-touch-icon).
- `public/sw.js` — precaches the shell; cache-first same-origin assets;
  navigations network-first with a cached shell fallback; **every cross-origin
  request passes straight through to the network**.
- `index.html` — `viewport-fit=cover`, `theme-color`, `color-scheme`, and iOS
  metadata (`apple-mobile-web-app-capable`, `apple-mobile-web-app-title`,
  `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`).
- `src/styles/global.css` — `env(safe-area-inset-*)` insets for notched
  devices; `100dvh` for correct mobile viewport height.
- `src/pwa.ts` — registers the worker in production builds only.

The service worker never caches or proxies third-party audio. Known iOS
limitations are documented in the README.

## 10. Future Android considerations

Android is not started. The architecture was chosen with it in mind:

**Directly reusable.** `src/domain/*` (including `language.ts`, so an Android
client gets the same normalisation and language filtering rules),
`src/persistence/*` (the repository functions take an `IDBDatabase`; a React
Native SQLite adapter could implement the same repository interfaces),
`src/sources/*` (adapters are plain async functions), and
`src/player/playerMachine.ts` (pure functions).

**Needs replacing.** `PlayerProvider` (React Native uses `react-native-track-player`
or ExoPlayer/Media3 with a background service), routing
(`@react-navigation/native`), styling, the service worker, and `src/i18n/*` —
a native client would use its own platform localization while reusing the
`LanguageCode` vocabulary from the domain.

**Keep the boundaries.** An Android app should depend on `domain` and
`sources/adapter`, never on `app/*Provider`, `player/PlayerProvider` or anything
in `pages/`. If a future change makes `src/domain` import React, that is the
moment this plan stops working.

**Bigger source adapters may need shared logic** — HTTP clients, rate limiting,
retry, caching. Put that in `src/sources/http/` rather than in each adapter, so
Android can reuse it. It must remain free of DOM APIs and free of telemetry.

## 11. Extension points

| To do this | Do it here |
| --- | --- |
| Add a real provider | New file in `src/sources/`, register in `CatalogueProvider.createRegistry()`, normalise language metadata with `normalizeLanguageCode()` |
| Add a field to the domain | `src/domain/types.ts`, plus a read migration if persisted |
| Add a screen | `src/pages/`, then add a route in `AppRoutes.tsx` |
| Change search | `src/domain/search.ts` only |
| Change catalogue language filtering | `src/app/catalogueLanguage.ts` and `searchEditions` |
| Change the wording of any string | `src/i18n/keys.ts` (add a key + translation), never a component |
| Add a UI language | `src/i18n/` bundle + `PLURAL_RULES` + `TRANSLATED_UI_LOCALES` |
| Add a catalogue language | `LANGUAGES` in `src/domain/language.ts` + `LANGUAGE_NAMES` in `src/i18n/index.ts` |
| Change resume/skip behaviour | `src/player/playerMachine.ts` only |
| Change what is stored | A new migration in `src/persistence/db.ts` with a `dataImpact` note |

## 12. Language architecture

Added in Alpha 0.1.1. This is the part most likely to be broken by accident,
because conflating any two of these fields looks entirely reasonable.

### Three concepts, three homes

```
Preferences.uiLocale              → which language the interface is rendered in
Work.originalLanguage (optional)  → the language a work was written in
AudioEdition.narrationLanguage    → the language actually spoken in the audio
```

`src/domain/language.ts` owns normalised identifiers and nothing else. It never
infers one concept from another and never expresses a user preference.

`normalizeLanguageCode()` is the single normalisation point for anything entering
the domain:

| Input | Result |
| --- | --- |
| `ru`, `RU`, `  ru  ` | `ru` |
| `ru-RU`, `ru_RU` | `ru` |
| `rus` (ISO 639-2/3) | `ru` |
| `Russian`, `Русский` | `ru` |
| `eo` (unknown, well-formed) | `eo` — carried through, not dropped |
| `42`, `''`, `'!!!'` | `undefined` — nothing usable |

Provider-specific mapping is deliberately **not** implemented. A future adapter
adds a mapping for its own codes and then calls `normalizeLanguageCode()`.

`Track.narrationLanguage` is an override that normally does not exist;
`trackNarrationLanguage(track, edition)` is the only place the
track-inherits-from-edition fallback lives, so callers cannot invent a third
interpretation.

### Preferences

```ts
interface Preferences {
  playbackRate: number;
  skipForwardSeconds: number;
  skipBackwardSeconds: number;
  lastAudioEditionId?: string;
  uiLocale: string;                  // interface language
  preferredAudioLanguages: string[]; // narration languages, user-ordered
}
```

Defaults for this milestone: `uiLocale: 'ru'`, `preferredAudioLanguages: ['ru']`.
Both are shapes that need no redesign for more languages: the locale is a
normalised tag, the audiobook languages are a list.

The two are written by different code and never by the same call. `SettingsPage`
calls `updatePreferences({ uiLocale })` and `languageFilter.toggle(code)` (which
calls `updatePreferences({ preferredAudioLanguages })`) separately, and there is
no derived-value path between them.

An **empty** `preferredAudioLanguages` array is a legitimate stored value meaning
"no restriction", not "no results". `searchEditions` treats an omitted list and an
empty list identically: no language filter.

### Catalogue filtering

`src/app/catalogueLanguage.ts` is the single place the preference becomes a query:

```ts
const languageFilter = useCatalogueLanguageFilter();
const views = useFilteredEditions({ narratorIds: [narrator.id] });
```

`apply()` merges `preferredAudioLanguages` into any existing facet set, so all of
these work without special-casing:

```ts
searchEditions(index, { narratorIds: [...], narrationLanguages: ['ru'] });
searchEditions(index, { authorIds: [...],   narrationLanguages: ['ru'] });
searchEditions(index, { genre: '...',       narrationLanguages: ['ru'] });
searchEditions(index, { sourceIds: [...],   narrationLanguages: ['ru'] });
```

Screens that list catalogue audio editions (Library, Search, Work, Narrator,
Author, Source) all go through this hook. **My Books deliberately does not**: it
lists what the user actually listened to, and hiding a book because they later
changed a catalogue filter would silently lose their own history.

Browse index counts (narrators, authors, sources, genres) describe the whole
catalogue rather than the filtered view, so a filtered-to-zero narrator never
looks like a narrator who does not exist.

`Work.originalLanguage` is never used as a filter. It is display-only.

### Localization

`src/i18n/` is a dependency-free layer:

| File | Role |
| --- | --- |
| `keys.ts` | The key set, derived from the Russian catalogue, plus value types |
| `ru.ts` | The complete Russian bundle |
| `en.ts` | A deliberately **incomplete** English bundle |
| `index.ts` | Fallback chain, plural rules, interpolation, language names |
| `i18nContext.ts` | Context object and `useI18n()` |
| `I18nProvider.tsx` | The provider component |

Design points:

- **Typed keys.** `TranslationKey` is `keyof typeof ru`, so adding a Russian
  string automatically makes it required in every other locale and a typo is a
  compile error. Components cannot invent a key.
- **Fallback chain.** Requested locale → `FALLBACK_UI_LOCALE` (Russian) → the key
  itself. `en.ts` exists partly so that this path is exercised by tests rather
  than only in theory.
- **Honest completeness.** `isLocaleComplete()` compares a bundle against the
  key set, and `selectableUiLocales()` offers only complete translations. English
  audio exists in the catalogue but English UI is not offered, because it is not
  finished.
- **Plurals.** `TranslationValue` may be a map of CLDR plural categories, and
  `PLURAL_RULES` chooses the form per locale. Russian one/few/many matters here:
  "1 аудиоиздание", "2 аудиокниги", "5 аудиокниг" would be visibly wrong with an
  English `s` suffix.
- **Language display names.** `languageName(code, uiLocale)` returns "Русский" /
  "Английский" / "Финский". Raw codes are for storage and queries; the
  interface falls back to the English name for an unknown code rather than
  showing an error.
- **Code stays English.** Keys, identifiers, type names, route paths and URLs are
  English. Only values are translated. `<html lang>` and the manifest `lang`
  describe the shipped default; the runtime locale lives in preferences.

### Migration / data impact, 0.1.0 → 0.1.1

| | |
| --- | --- |
| IndexedDB schema | **Unchanged.** `DB_VERSION` stays 1, no migration entry added |
| IndexedDB user data | Untouched: playback positions, bookmarks, favourites and history all survive |
| localStorage preferences | Same key `openaudiobooks.preferences.v1`; two fields **added** |
| `uiLocale` absent | Filled with `ru` at read time |
| `preferredAudioLanguages` absent | Filled with `['ru']` at read time |
| `preferredAudioLanguages: []` | Preserved as `[]` ("no restriction"), not restored to the default |
| Unusable language values | Replaced by normalised defaults rather than trusted |
| `AudioEdition.language` → `narrationLanguage` | Renamed domain field. Not persisted, so no stored data is affected |
| `EditionFilters.language` → `narrationLanguages[]` | Widened from one value to a list; call sites updated |

There is deliberately **no** IndexedDB migration: preferences live in
localStorage, not in the database schema, so nothing persisted changed shape in a
way that requires a version bump. A test seeds a literal Alpha 0.1.0 preferences
record and asserts every original field survives while the new fields receive
defaults.

## 13. Explicit non-goals for this phase

No backend. No accounts. No cloud sync. No scraping. No Android client. No real
provider integration. No analytics, telemetry or third-party services. No
re-hosting of audiobook files. Visual polish is secondary to accessibility and
touch targets.
