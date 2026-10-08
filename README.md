# OpenAudioBooks

**Alpha 0.1.1 — development build. Not production-ready. No real audiobooks are
available in this build yet.**

OpenAudioBooks is a free, public, **non-commercial** application for discovering,
cataloguing and listening to audiobooks that are legally available to listen to
for free from external sources.

It is an **aggregator and a player**, not a host. OpenAudioBooks does not claim
ownership of audiobook content and does not store audiobook files. Audio is
streamed from the source that legitimately provides it, and every source and
audio edition carries its own rights, attribution and licence information.

---

## Status

| | |
| --- | --- |
| Version | 0.1.1 (Alpha) |
| Interface language | Russian (complete). English/Finnish interface translations are **not** finished and are not offered |
| Preferred audiobook language | Russian, adjustable per device to any of the languages in the catalogue |
| Client | Progressive Web App, mobile-first for iPhone Safari, works in modern desktop browsers |
| Real providers | **None integrated yet.** The catalogue shows bundled, clearly-marked development fixtures |
| Android | Not started. Planned after the web client is stable |
| Accounts | None, by design |

This milestone corrected and extended the language model before any real
catalogue ingestion begins. The Alpha 0.1.0 foundation — domain model, source
adapters, local-first persistence, playback resume, PWA — is unchanged and its
tests still pass. Real provider integration remains deliberately out of scope.

## Languages: three separate concepts

OpenAudioBooks is **not** a Russian-only application. It is a multilingual
catalogue with a multilingual interface, and this milestone sets the initial
user-facing configuration to Russian.

Three concepts exist, and the code keeps them apart on purpose:

| Concept | Where it lives | Question it answers |
| --- | --- | --- |
| **Interface language** | `Preferences.uiLocale` | What language is the UI rendered in? |
| **Work language** | `Work.originalLanguage` (optional) | What language was the book written in? |
| **Narration language** | `AudioEdition.narrationLanguage` | What language is actually spoken in the audio? |

They are independent settings and are never derived from one another. A Ray
Bradbury novel can have a Russian narration, an English narration and a Finnish
narration, all attached to the **same** Work, because identity matching is
reliable — and all three remain separate audio editions with their own narrators,
sources, rights and playback state.

Consequences that are visible in the interface:

- The catalogue language filter matches **narration language only**. It never
  filters on work language, title language, author nationality or source country.
- Changing the audiobook languages never changes the interface language, and the
  interface language never decides which audio you see.
- The default view shows Russian-narrated audio. A Finnish narrator who only has
  Finnish recordings correctly appears to a Russian-only listener as having
  nothing to offer here.
- A work whose original language the source does not state shows "не указано".
  Unknown is a valid state; it is never guessed from an edition.

## Privacy and local-first design

There is **no account**, no sign-in, no server-side profile and no cloud sync.

Stored on your own device:

- playback position, current track and playback speed per audio edition
- bookmarks
- favourites
- listening history
- playback preferences

Stored in IndexedDB (`openaudiobooks` database) for anything structured, and in
`localStorage` for a handful of small scalars only. Nothing is transmitted
anywhere. There is no telemetry, no analytics, no advertising, no tracking and no
user profiling. Listening history never leaves the device. "My Books" has a
**Delete all local data** button that wipes it.

## Content and source principles

- **Free to listen does not mean public domain.** Every audio edition and every
  source carries a rights status: `publicDomain`, `creativeCommons`,
  `licensedFree`, `permissionGranted` or `unknown`. Unknown is a first-class
  value and is labelled as such rather than guessed.
- **Attribution travels with the content.** Sources carry licence name, licence
  URL, attribution text and availability notes, all shown in the interface.
- **No re-hosting.** OpenAudioBooks links to and streams from original sources.
  It does not download, mirror or redistribute third-party audiobook files.
- **Per-edition rights.** An edition may differ from its source, so rights are
  modelled on the audio edition and not only on the source.

## Narrator-centric catalogue

Narrators are **first-class entities**, not free text inside a book record. Each
one has an id, name, optional biography, optional image reference and aliases.
The catalogue supports narrator → all narrated editions, and searches combining
narrator with author, genre, source or language.

A literary work may have several audio editions, each with its own narrators,
source, language, cover and duration:

```
WORK  "Salt and Lanterns"
  ├─ Audio edition (en) → Narrator: Mireille Fontaine  → Source: Open Archive
  └─ Audio edition (en) → Narrator: Dmitri Salazar    → Source: Donations Library
```

**Playback progress belongs to the audio edition**, so progress, bookmarks and
favourites for the two editions above are completely independent.

## Interface language

The user interface is in Russian in this milestone. Settings exposes:

- **Язык интерфейса** — currently Русский, the only complete translation.
- **Языки аудиокниг** — Русский, Английский, Финский, … multi-select.

Both live in `/settings` and are stored separately on the device. The interface
says plainly that only the Russian translation is complete; it does not pretend
English or Finnish localisation is finished.

The localization layer (`src/i18n/`) holds typed keys, one complete locale plus a
deliberately partial English bundle that exercises the fallback chain, CLDR-style
Russian plural rules, and localised language names ("Русский", not "ru"). No
localization dependency was added.

## Planned sources

Not integrated in this phase. Each will be added as a source adapter behind one
interface, without changing the UI:

- LibriVox
- Internet Archive
- MDS / «Модель для сборки»
- other legitimate free audiobook archives
- legitimate podcast/RSS sources
- author- or publisher-provided free audio

## Running locally

Requires Node.js 20.19 or newer.

```bash
npm install
npm run dev          # development server on http://localhost:5173
```

Other scripts:

```bash
npm run lint         # ESLint
npm run typecheck    # TypeScript, no emit
npm test             # Vitest
npm run build        # production build into dist/
npm run preview      # serve the production build on :4173
npm run check        # lint + typecheck + test + build
npm run gen:fixtures # regenerate the development tone/icon assets
```

The application is entirely static. There is no backend to run. `npm run preview`
serves `dist/` over HTTP, which is what you want for testing service-worker
behaviour; `npm run dev` skips service-worker registration by design.

### Tests

148 tests covering the domain model and narrator faceting, language
normalisation and filtering, localization fallback and Russian plurals,
resume/skip/completion maths, IndexedDB persistence (including cross-restart
behaviour and migration bookkeeping), and screen rendering for narrator, work,
edition, source and settings pages. They run in jsdom with an in-memory IndexedDB
and make no network requests.

## PWA notes and known limitations

The app is installable: web app manifest, placeholder icons, standalone display,
`viewport-fit=cover` with safe-area insets, and iOS home-screen metadata.

Audio on iOS is subject to platform limits that OpenAudioBooks does not override
and does not claim to override:

- **Background playback is unreliable.** iOS Safari suspends the page after a
  period in the background. Playback may stop when the screen locks, when the app
  is switched away, or under memory pressure. iOS offers no general background
  audio mode for web apps comparable to Android.
- **Autoplay requires a user gesture.** The first play must come from a tap, as in
  any mobile browser.
- **Media Session / lock-screen controls are partial on iOS.** They are wired up
  where the browser exposes `navigator.mediaSession`; do not expect full
  lock-screen integration on iPhone.
- **Storage is per browser profile.** Clearing Safari data, using private
  browsing, or switching browsers discards playback positions and bookmarks. This
  is a deliberate consequence of having no account and no cloud sync.
- **The service worker caches the app shell only.** It never caches, proxies or
  rewrites third-party audio, and it reports nothing anywhere.

## Project documentation

| File | Purpose |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Domain model, adapters, persistence, player state, future Android |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute, what is expected of a change |
| [AGENTS.md](AGENTS.md) | Rules for AI coding agents working on this repository |
| [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) | Dependency licences |
| [LICENSE](LICENSE) | Source-code licence |

## Licence

OpenAudioBooks source code is licensed under the **PolyForm Noncommercial License
1.0.0**, in `LICENSE`, copied verbatim from
<https://polyformproject.org/licenses/noncommercial/1.0.0> (verified against the
official plain-text version).

This was chosen because the project must be public, source-available and
non-commercial, and commercial use of the source code must not be permitted.
MIT, Apache-2.0, BSD, GPL, LGPL and AGPL all permit commercial use and so were
not suitable without explicit project-owner approval.

PolyForm Noncommercial 1.0.0 permits personal use, hobby and amateur projects,
and use by charitable, educational, public research, public safety and health,
environmental, and government organisations, regardless of funding.

**Audiobook content licensing is independent of this source-code licence.**
Nothing here grants rights to any audiobook, recording or cover image.
