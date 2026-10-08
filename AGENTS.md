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

## 4. Content and rights

14. **Never assume "free to listen" means Public Domain.** Report what the source
    reports. Use `unknown` when the source says nothing. MDS content is
    free-to-listen and is **not** automatically public domain; neither is podcast
    content, nor anything from a donation archive, nor anything else.
15. **Never copy or rehost third-party audiobook files** unless their licence
    explicitly permits redistribution *and* the project owner explicitly approves
    it. Reference remote URLs instead. Caching, mirroring and downloading into the
    repository are all prohibited.
16. **Never add real audiobook metadata, cover images or audio files** to the
    repository. Development data is fictional, `dev:`-prefixed, and on the
    reserved `example.invalid` domain.
17. Never assert rights status the source does not state.

## 5. Architecture boundaries

18. **Provider-specific logic belongs in source adapters**, not UI components. A
    screen must never import from `src/data/devCatalogue.ts` or branch on a
    provider id. If adding a provider requires touching a screen, the adapter
    boundary is in the wrong place — fix the boundary.
19. **Domain entities must not depend on a specific provider**, a DOM API,
    storage, or React. `src/domain/*` imports only from `src/domain/*`, apart from
    the type-only import of translation keys in `rights.ts`.
    This is what keeps the planned Android client possible.
20. **UI must not import `src/persistence/*` or `src/sources/*` directly.** Go
    through the contexts (`useUserData`, `usePlayer`, `useCatalogue`) and
    `useCatalogueLanguageFilter()`.
21. **Do not perform broad refactors unrelated to the assigned task.** No
    reformatting, no dependency churn, no renaming across the codebase for
    tidiness. If you spot a real problem, report it rather than fixing it in
    passing.

## 6. Persistence

22. **Preserve backwards compatibility of stored user playback data whenever
    practical.** Never drop or rewrite a user's saved positions.
23. **Before changing a persisted data schema, document the migration
    implications.** Append a migration to `MIGRATIONS` in `src/persistence/db.ts`
    with a version, a description and a `dataImpact` note; bump `DB_VERSION`;
    update the migrations section of `ARCHITECTURE.md`; add a test that exercises
    the upgrade. Never edit or reorder existing migrations.
24. Add a reopen test for any persistence change. The actual requirement is that
    state survives closing the app and coming back, so that is what must be
    verified.
25. Never add a network write to a persistence path.

## 7. Security and hygiene

26. **Do not commit secrets, API keys, credentials, tokens or private data.**
    No `.env` files with real values, no tokens in source, no personal data in
    fixtures or tests.
27. Do not weaken the ESLint or TypeScript configuration to make a change pass.
    Fix the code.
28. Do not modify CI, repository settings, credentials or GitHub account settings.

## 8. Dependencies

29. **Keep dependencies minimal and justify substantial new dependencies.** State
    what is being replaced, why existing dependencies are insufficient, the
    licence, maintenance status and size impact. Prefer extending what exists.
30. **Do not add analytics, telemetry, tracking or advertising SDKs.** Ever, as
    a dependency or otherwise.
31. Record every added dependency in `THIRD_PARTY_NOTICES.md` with version and
    licence. Dependencies keep their own licences regardless of this project's.

## 9. Testing and verification

32. Run `npm run check` (lint, typecheck, tests, production build) before
    reporting work as done. Fix errors your change caused. Do not suppress them.
33. Add tests for domain invariants, narrator relationships, resume and skip
    behaviour, persistence across a simulated restart, rights/attribution
    rendering, language filtering and localization fallback.
34. Do not weaken or delete an existing test to make a change pass. If a test is
    genuinely wrong, say so explicitly and explain why.

## 10. Honesty

35. **Never claim a capability the project does not have.** Do not claim iOS
    background playback works. Do not claim real audiobook availability before an
    adapter ships. Do not describe alpha software as production-ready. Do not
    claim an English or Finnish interface translation exists when only Russian
    is complete.
36. Report unfinished work plainly. A partial implementation described as
    partial is useful; one described as complete is not.
37. Do not fake, stub or simulate a required behaviour and then present it as
    working. Playback resume in particular must be genuinely persisted, not
    mocked.
38. When you are blocked or uncertain, say so and stop. Do not guess about
    rights, licences, or provider behaviour.

## 11. Scope discipline

39. Do not begin provider integration (LibriVox, Internet Archive, MDS, RSS or
    otherwise) unless that is the assigned task.
40. Do not implement the Android client unless that is the assigned task.
41. Do not add a backend unless that is the assigned task and the project owner
    has explained why it is technically required.
42. Architectural changes outside the scope of the assigned task require prior
    explanation, not just a good diff.

---

## Quick orientation for a new agent

```
src/domain/          entities, search, language, rights — pure, no dependencies
src/i18n/             translation keys, locale bundles, plural rules, t()
src/sources/         SourceAdapter contract and registry
src/data/            bundled development fixtures (fictional, dev: prefixed)
src/persistence/     IndexedDB schema, migrations, repositories
src/player/          playerMachine (pure) + PlayerProvider (media element)
src/app/             providers, contexts, language filter, routing, shell
src/pages/           screens
src/components/      shared UI
src/styles/          global CSS
scripts/             local asset generators (no network)
```

Verification command: `npm run check`.

Two failures matter most, and both are structural rather than cosmetic:

1. **User playback state must survive a restart.** If a change makes that worse or
   uncertain, the change is wrong regardless of how clean it looks.
2. **The three language concepts must stay independent.** If a change lets the
   interface language decide the catalogue language, or lets an edition's
   narration language overwrite its work's original language, the change is
   wrong however reasonable it looks.

