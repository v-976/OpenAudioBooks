# OpenAudioBooks — Architecture

Alpha 0.1.0. This document describes how the codebase is organised, why, and
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
5. **Simple over clever.** A static frontend, a small dependency set, and
   understandable code.

## 2. Layer map

```
┌──────────────────────────────────────────────────────────┐
│  UI          src/pages, src/components, src/app/AppShell  │
│              reads contexts; never imports adapters       │
├──────────────────────────────────────────────────────────┤
│  Application src/app/*Provider, src/player/PlayerProvider │
│              orchestration + context boundaries            │
├──────────────────────────────────────────────────────────┤
│  Domain      src/domain/*                                  │
│              entities, indexes, search, rights vocabulary  │
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
`src/pages`, `src/sources` or `src/persistence`, which is what keeps the domain
testable in isolation and keeps the Android client reusable.

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
| `AudioEdition` | A concrete narrated recording | `id`, `workId`, `narratorIds[]`, `sourceId`, `language`, `releaseYear?`, `publisher?`, `coverUrl?`, `durationSeconds?`, **own** `rightsStatus`/`licenseName`/`licenseUrl`, `sourceUrl?`, `fetchedAt?` |
| `Track` | A chapter | `id`, `audioEditionId`, `title`, `sequence`, `durationSeconds?`, `audioUrl`, `sourceUrl?` |
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
  distinct narrators, sources, languages and rights.
- `UserState`, bookmarks and favourites key on `audioEditionId`, never on
  `workId`. Two editions of one work never share playback state.
- `Work.originalLanguage` is the language of the text; `AudioEdition.language` is
  the language of the recording. They are separate fields on purpose.

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
5. Namespace every id with the adapter's `source.id`.
6. Return `{ unsupported: true }` rather than throwing when a provider genuinely
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
and combines them, which is what makes `author + narrator`, `genre + narrator` and
`source + narrator` work without special-casing:

```ts
searchEditions(index, { authorIds: [...], narratorIds: [...] })
searchEditions(index, { genre: 'Historical', narratorIds: [...] })
searchEditions(index, { sourceIds: [...], narratorIds: [...] })
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

**localStorage** (`src/persistence/preferencesRepository.ts`) for four scalars:
playback rate and skip intervals, plus a last-played pointer. Needed
synchronously before first paint, and not personal data. Values are clamped on
read, and a corrupted or unavailable store falls back to defaults rather than
breaking startup.

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
decoded on read.

Touch targets are 44px minimum. Focus is visible. Colours come from CSS custom
properties with a light and dark scheme. Visual polish was intentionally
deprioritised this phase; `prefers-reduced-motion` is respected.

## 8. Development data

`src/data/devCatalogue.ts` ships a small fictional catalogue, all ids prefixed
`dev:` and all URLs on the reserved `example.invalid` domain. It demonstrates:

- 5 authors, 5 works, 5 narrators, 4 sources, 7 audio editions, 17 tracks
- one work with **two** audio editions narrated by **different** narrators from
  **different** sources
- one narrator appearing across several works and sources, for narrator browsing
- one edition per language (`en`, `de`, `no`) and a series with two books
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

**Directly reusable.** `src/domain/*`, `src/persistence/*` (the repository
functions take an `IDBDatabase`; a React Native SQLite adapter could implement
the same repository interfaces), `src/sources/*` (adapters are plain async
functions), and `src/player/playerMachine.ts` (pure functions).

**Needs replacing.** `PlayerProvider` (React Native uses `react-native-track-player`
or ExoPlayer/Media3 with a background service), routing
(`@react-navigation/native`), styling, and the service worker.

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
| Add a real provider | New file in `src/sources/`, register in `CatalogueProvider.createRegistry()` |
| Add a field to the domain | `src/domain/types.ts`, plus a read migration if persisted |
| Add a screen | `src/pages/`, then add a route in `AppRoutes.tsx` |
| Change search | `src/domain/search.ts` only |
| Change resume/skip behaviour | `src/player/playerMachine.ts` only |
| Change what is stored | A new migration in `src/persistence/db.ts` with a `dataImpact` note |

## 12. Explicit non-goals for this phase

No backend. No accounts. No cloud sync. No scraping. No Android client. No real
provider integration. No analytics, telemetry or third-party services. No
re-hosting of audiobook files. Visual polish is secondary to accessibility and
touch targets.
