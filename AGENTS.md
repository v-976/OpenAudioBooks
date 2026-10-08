# AGENTS.md

Rules for AI coding agents working on OpenAudioBooks.

This file exists because development may be performed by different agents over
time, and because several properties of this project are easy to break by accident
while looking entirely reasonable.

These rules apply alongside [CONTRIBUTING.md](CONTRIBUTING.md). They are
constraints, not preferences. If a task seems to require breaking one, stop and
raise it with the project owner instead of proceeding.

---

## 0. Read before you change anything

1. **Read `README.md` and `ARCHITECTURE.md` before changing architecture.**
2. Read `AGENTS.md` (this file) before changing anything at all.
3. If your change touches persistence, player behaviour, source adapters, the
   domain model or the language/localization layer, re-read the relevant section
   of `ARCHITECTURE.md` first.

If the documented architecture and the code disagree, that is a finding worth
reporting. Do not silently pick one.

## 1. Never remove or weaken these

1. **Narrator-first-class modelling.** Narrators are entities with ids, names
   and aliases. Never reduce a narrator to a string inside a book record.
2. **Local-first privacy.** Playback progress, bookmarks, favourites, history and
   preferences stay on the user's device. No account, no sync, no server writes.
3. **Source attribution.** Sources and audio editions keep rights status, licence
   name, licence URL, attribution text and original source URL, and these stay
   visible in the UI.
4. **Per-audio-edition playback state.** Progress, bookmarks and favourites key
   on `audioEditionId`. Never merge or share them across editions of a work.
5. **The non-commercial requirement.** Do not change the licence to anything
   permitting commercial use, and do not relicense dependencies or project files.

## 2. Never introduce these without explicit project-owner approval

- Telemetry
- Analytics
- Advertising
- User tracking or profiling
- Mandatory cloud accounts
- Any external AI service
- Any new outbound request to a server the project does not control

There is no configuration flag for these. "Only in development" and "only behind a
build flag" are not exemptions. Never add them.

## 3. Language concepts

Three distinct concepts exist. They are different things and must never be
conflated, derived from one another, or reused for one another:

| Concept | Field | Meaning |
| --- | --- | --- |
| Interface language | `Preferences.uiLocale` | Which language the UI is rendered in |
| Work language | `Work.originalLanguage` | The language a literary work was written in |
| Narration language | `AudioEdition.narrationLanguage` | The language actually spoken in the audio |

5. **Never conflate `uiLocale`, `Work.originalLanguage` and
   `AudioEdition.narrationLanguage`.** They answer three different questions and
   live in three different places. Writing one from another is a bug even when
   the value happens to coincide.
6. **Catalogue language filtering is based on the actual narration language of
   the audio edition** — `AudioEdition.narrationLanguage`, and nothing else. Do
   not filter on `Work.originalLanguage`, title language, author nationality,
   author language or source country.
7. **The UI language must not determine the catalogue language.** Switching the
   interface language must never change which audio editions are listed, and
   switching the audiobook languages must never change the interface language.
   The two preferences are stored separately (`uiLocale` and
   `preferredAudioLanguages[]`) and no code path may write one from the other.
8. **A Work may have AudioEditions in many languages**, possibly with different
   narrators and sources. This is the normal case, not an edge case.
9. **`Work.originalLanguage` is optional and must never be inferred** from an
   audio edition's narration language. An unknown original language stays
   unknown; the UI shows "not specified" rather than guessing.
10. **User-facing language names must be localised** ("Русский", not "ru").
    Normalised identifiers are for storage and queries only, and raw codes must
    not leak into the interface.
11. **Russian is the initial default, not a permanent project restriction.** The
    default preferences (`uiLocale: 'ru'`, `preferredAudioLanguages: ['ru']`)
    describe this milestone only. Every structure involved is a list or a
    normalised tag precisely so that more languages need no redesign, and no
    change may assume Russian is the only possible value.
12. **Future source adapters must normalise provider language metadata** before
    exposing an `AudioEdition` to the domain or catalogue. Provider values such
    as "Русский", "rus", "Russian" or "ru-RU" must go through
    `normalizeLanguageCode()`. Provider-specific normalisation belongs in the
    adapter, not in the domain and not in the UI.
13. **All user-facing strings go through the localization layer** (`t()` with a
    typed key from `src/i18n/keys.ts`). Do not hard-code Russian, English or any
    other language inside components, and do not add a user-facing string without
    adding its key and translation. Code identifiers, TypeScript type names,
    route paths and URLs stay in English.

## 4. Duration, sorting and partial catalogues

14. **Duration belongs to the `AudioEdition`,** never to the `Work`. Two
    recordings of the same book can differ in length, and one work can have
    editions in different languages read at different speeds.
15. **An unknown duration is not zero.** It is `undefined`, displayed as
    «Длительность неизвестна», and never rendered as `0 мин`, `0:00` or any other
    number that claims a length the source did not report.
16. **Adapters must normalise duration** into whole seconds, prefer the source's
    own total, and only sum sections when the list is verifiably complete and every
    section duration is known. Never substitute an invented figure.
17. **A reported total is never silently "corrected"** by a disagreeing section
    sum. Keep the total, flag the disagreement, and do not imply false precision.
18. **Duration sorting must work in both directions** — shortest first and
    longest first — and must be applied after every active filter.
19. **Unknown durations always sort last, in both directions.** "Shortest" must
    never lead with a book whose length is simply unknown.
20. **A duration range excludes unknown durations.** An unknown length cannot be
    shown to lie inside a range. With no range applied, unknown durations stay
    visible.
21. **Duration filters compose with every other facet** — text, author, narrator,
    genre, series, narration language, source — and can be reset independently of
    them.
22. **A partially loaded catalogue must never be presented as complete.** While
    the loaded set is a slice of a provider's, any "shortest" or "longest" claim
    applies to the loaded records only, and the interface must say so. Never
    perform a hidden bulk download of thousands of records to satisfy a sort.
23. **Selected sort order is a user preference** and is persisted, but it must
    never override an explicit user choice in the current session.

## 5. Content and rights

24. **Never assume "free to listen" means Public Domain.** Report what the source
    reports. Use `unknown` when the source says nothing. MDS content is
    free-to-listen and is **not** automatically public domain; neither is podcast
    content, nor anything from a donation archive, nor anything else.
25. **Never copy or rehost third-party audiobook files** unless their licence
    explicitly permits redistribution *and* the project owner explicitly approves
    it. Reference remote URLs instead. Caching, mirroring and downloading into the
    repository are all prohibited.
26. **Never add real audiobook metadata, cover images or audio files** to the
    repository. Development data is fictional, `dev:`-prefixed, and on the
    reserved `example.invalid` domain.
27. Never assert rights status the source does not state.

## 6. Architecture boundaries

28. **Provider-specific logic belongs in source adapters**, not UI components. A
    screen must never import from `src/data/devCatalogue.ts` or branch on a
    provider id. If adding a provider requires touching a screen, the adapter
    boundary is in the wrong place — fix the boundary.
29. **Domain entities must not depend on a specific provider**, a DOM API,
    storage, or React. `src/domain/*` imports only from `src/domain/*`, apart from
    the type-only import of translation keys in `rights.ts`.
    This is what keeps the planned Android client possible.
30. **UI must not import `src/persistence/*` or `src/sources/*` directly.** Go
    through the contexts (`useUserData`, `usePlayer`, `useCatalogue`) and
    `useCatalogueLanguageFilter()`.
31. **Do not perform broad refactors unrelated to the assigned task.** No
    reformatting, no dependency churn, no renaming across the codebase for
    tidiness. If you spot a real problem, report it rather than fixing it in
    passing.

## 7. Persistence

32. **Preserve backwards compatibility of stored user playback data whenever
    practical.** Never drop or rewrite a user's saved positions.
33. **Before changing a persisted data schema, document the migration
    implications.** Append a migration to `MIGRATIONS` in `src/persistence/db.ts`
    with a version, a description and a `dataImpact` note; bump `DB_VERSION`;
    update the migrations section of `ARCHITECTURE.md`; add a test that exercises
    the upgrade. Never edit or reorder existing migrations.
34. Add a reopen test for any persistence change. The actual requirement is that
    state survives closing the app and coming back, so that is what must be
    verified.
35. Never add a network write to a persistence path.

## 8. Security and hygiene

36. **Do not commit secrets, API keys, credentials, tokens or private data.**
    No `.env` files with real values, no tokens in source, no personal data in
    fixtures or tests.
37. Do not weaken the ESLint or TypeScript configuration to make a change pass.
    Fix the code.
38. Do not modify CI, repository settings, credentials or GitHub account settings.

## 9. Dependencies

39. **Keep dependencies minimal and justify substantial new dependencies.** State
    what is being replaced, why existing dependencies are insufficient, the
    licence, maintenance status and size impact. Prefer extending what exists.
40. **Do not add analytics, telemetry, tracking or advertising SDKs.** Ever, as
    a dependency or otherwise.
41. Record every added dependency in `THIRD_PARTY_NOTICES.md` with version and
    licence. Dependencies keep their own licences regardless of this project's.

## 10. Testing and verification

42. Run `npm run check` (lint, typecheck, tests, production build) before
    reporting work as done. Fix errors your change caused. Do not suppress them.
43. Add tests for domain invariants, narrator relationships, resume and skip
    behaviour, persistence across a simulated restart, rights/attribution
    rendering, language filtering and localization fallback.
44. Do not weaken or delete an existing test to make a change pass. If a test is
    genuinely wrong, say so explicitly and explain why.

## 11. Honesty

45. **Never claim a capability the project does not have.** Do not claim iOS
    background playback works. Do not claim real audiobook availability before an
    adapter ships. Do not describe alpha software as production-ready. Do not
    claim an English or Finnish interface translation exists when only Russian
    is complete.
46. Report unfinished work plainly. A partial implementation described as
    partial is useful; one described as complete is not.
47. Do not fake, stub or simulate a required behaviour and then present it as
    working. Playback resume in particular must be genuinely persisted, not
    mocked.
48. When you are blocked or uncertain, say so and stop. Do not guess about
    rights, licences, or provider behaviour.

## 12. Source integrations and API limits

49. **Never work around a provider's API limits.** Respect documented rate
    limits, page-size caps and `429`/`Retry-After` behaviour. Never add a proxy,
    a scraper, or server infrastructure of our own to get around a limit or a
    CORS restriction without explicit project-owner approval.
50. **Never download, cache, mirror or re-publish provider audio.** Only remote
    URLs are referenced; playback streams from the host the provider uses.
51. **Never mirror a provider catalogue.** Cache a bounded slice, refresh it
    explicitly, and cap it. A mirror is a different project.
52. **Audit a provider before integrating it, and record the audit.** Verify the
    endpoint, response format, pagination, rate limits, field shapes and rights
    from the live API. Never assume a field exists because the documentation
    implies it: verify it, and record defects found in the data.
53. **Never trust a provider field without checking what it actually contains.**
    A field can be present, documented, usually correct and still wrong often
    enough to matter — LibriVox's per-section `language` says `"English"` on every
    verified Russian recording and on ~8 % of other projects, and trusting it
    would misclassify exactly those. Measure the disagreement rate on real data
    and assert observed behaviour, not the documented intent.
54. **De-duplicate by stable provider id on every page.** Pagination that
    overlaps or skips is normal; assuming `offset` arithmetic is not.

## 13. Scope discipline

55. Do not begin provider integration (LibriVox, Internet Archive, MDS, RSS or
    otherwise) unless that is the assigned task.
56. Do not implement the Android client unless that is the assigned task.
57. Do not add a backend unless that is the assigned task and the project owner
    has explained why it is technically required.
58. Architectural changes outside the scope of the assigned task require prior
    explanation, not just a good diff.

---

## Quick orientation for a new agent

```
src/domain/          entities, search, language, rights, duration — pure
src/i18n/             translation keys, locale bundles, plural rules, t()
src/sources/         SourceAdapter contract, registry, per-provider adapters
  librivox/          types, pure mapping (parse), transport (client), adapter
src/data/            bundled development fixtures (fictional, dev: prefixed)
src/persistence/     IndexedDB schema, migrations, repositories, cache
src/player/          playerMachine (pure) + PlayerProvider (media element)
src/app/             providers, contexts, language filter, routing, shell
src/pages/           screens
src/components/      shared UI
src/styles/          global CSS
scripts/             local asset generators (no network)
docs/                source audits and design notes
```

Verification command: `npm run check`.

Three failures matter most, and all are structural rather than cosmetic:

1. **User playback state must survive a restart.** If a change makes that worse or
   uncertain, the change is wrong regardless of how clean it looks.
2. **The three language concepts must stay independent.** If a change lets the
   interface language decide the catalogue language, or lets an edition's
   narration language overwrite its work's original language, the change is
   wrong however reasonable it looks.
3. **A claim must not outrun the data.** An unknown duration must not become
   `0 мин`, a duration sort over a partial catalogue must not be presented as a
   provider-wide ranking, and a provider field must not be trusted without
   checking what it actually contains.

