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
3. If your change touches persistence, player behaviour, source adapters or the
   domain model, re-read the relevant section of `ARCHITECTURE.md` first.

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

## 3. Content and rights

4. **Never assume "free to listen" means Public Domain.** Report what the source
   reports. Use `unknown` when the source says nothing. MDS content is
   free-to-listen and is **not** automatically public domain; neither is podcast
   content, nor anything from a donation archive, nor anything else.
5. **Never copy or rehost third-party audiobook files** unless their licence
   explicitly permits redistribution *and* the project owner explicitly approves
   it. Reference remote URLs instead. Caching, mirroring and downloading into the
   repository are all prohibited.
6. **Never add real audiobook metadata, cover images or audio files** to the
   repository. Development data is fictional, `dev:`-prefixed, and on the
   reserved `example.invalid` domain.
7. Never assert rights status the source does not state.

## 4. Architecture boundaries

8. **Provider-specific logic belongs in source adapters**, not UI components. A
   screen must never import from `src/data/devCatalogue.ts` or branch on a
   provider id. If adding a provider requires touching a screen, the adapter
   boundary is in the wrong place — fix the boundary.
9. **Domain entities must not depend on a specific provider**, a DOM API,
   storage, or React. `src/domain/*` imports only from `src/domain/*`.
   This is what keeps the planned Android client possible.
10. **UI must not import `src/persistence/*` or `src/sources/*` directly.** Go
    through the contexts (`useUserData`, `usePlayer`, `useCatalogue`).
11. **Do not perform broad refactors unrelated to the assigned task.** No
    reformatting, no dependency churn, no renaming across the codebase for
    tidiness. If you spot a real problem, report it rather than fixing it in
    passing.

## 5. Persistence

12. **Preserve backwards compatibility of stored user playback data whenever
    practical.** Never drop or rewrite a user's saved positions.
13. **Before changing a persisted data schema, document the migration
    implications.** Append a migration to `MIGRATIONS` in `src/persistence/db.ts`
    with a version, a description and a `dataImpact` note; bump `DB_VERSION`;
    update the migrations section of `ARCHITECTURE.md`; add a test that exercises
    the upgrade. Never edit or reorder existing migrations.
14. Add a reopen test for any persistence change. The actual requirement is that
    state survives closing the app and coming back, so that is what must be
    verified.
15. Never add a network write to a persistence path.

## 6. Security and hygiene

16. **Do not commit secrets, API keys, credentials, tokens or private data.**
    No `.env` files with real values, no tokens in source, no personal data in
    fixtures or tests.
17. Do not weaken the ESLint or TypeScript configuration to make a change pass.
    Fix the code.
18. Do not modify CI, repository settings, credentials or GitHub account settings.

## 7. Dependencies

19. **Keep dependencies minimal and justify substantial new dependencies.** State
    what is being replaced, why existing dependencies are insufficient, the
    licence, maintenance status and size impact. Prefer extending what exists.
20. **Do not add analytics, telemetry, tracking or advertising SDKs.** Ever, as
    a dependency or otherwise.
21. Record every added dependency in `THIRD_PARTY_NOTICES.md` with version and
    licence. Dependencies keep their own licences regardless of this project's.

## 8. Testing and verification

22. Run `npm run check` (lint, typecheck, tests, production build) before
    reporting work as done. Fix errors your change caused. Do not suppress them.
23. Add tests for domain invariants, narrator relationships, resume and skip
    behaviour, persistence across a simulated restart, and rights/attribution
    rendering.
24. Do not weaken or delete an existing test to make a change pass. If a test is
    genuinely wrong, say so explicitly and explain why.

## 9. Honesty

25. **Never claim a capability the project does not have.** Do not claim iOS
    background playback works. Do not claim real audiobook availability before an
    adapter ships. Do not describe alpha software as production-ready.
26. Report unfinished work plainly. A partial implementation described as
    partial is useful; one described as complete is not.
27. Do not fake, stub or simulate a required behaviour and then present it as
    working. Playback resume in particular must be genuinely persisted, not
    mocked.
28. When you are blocked or uncertain, say so and stop. Do not guess about
    rights, licences, or provider behaviour.

## 10. Scope discipline

29. Do not begin provider integration (LibriVox, Internet Archive, MDS, RSS or
    otherwise) unless that is the assigned task.
30. Do not implement the Android client unless that is the assigned task.
31. Do not add a backend unless that is the assigned task and the project owner
    has explained why it is technically required.
32. Architectural changes outside the scope of the assigned task require prior
    explanation, not just a good diff.

---

## Quick orientation for a new agent

```
src/domain/          entities, search, rights vocabulary — pure, no dependencies
src/sources/         SourceAdapter contract and registry
src/data/            bundled development fixtures (fictional, dev: prefixed)
src/persistence/     IndexedDB schema, migrations, repositories
src/player/          playerMachine (pure) + PlayerProvider (media element)
src/app/             providers, contexts, routing, shell
src/pages/           screens
src/components/      shared UI
src/styles/          global CSS
scripts/             local asset generators (no network)
```

Verification command: `npm run check`.

Start with the failure that matters: user playback state must survive a restart.
If a change makes that worse or uncertain, the change is wrong regardless of how
clean it looks.
