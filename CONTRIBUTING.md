# Contributing to OpenAudioBooks

Thanks for helping. This is an alpha-stage, non-commercial, public project, and
the rules below exist to keep it that way.

**Before you change architecture, read [README.md](README.md),
[ARCHITECTURE.md](ARCHITECTURE.md) and [AGENTS.md](AGENTS.md).** AGENTS.md
applies to humans and coding agents alike.

## What this project is

A free, public, non-commercial aggregator and player for audiobooks that are
legally free to listen to from external sources. It does not host audiobook
content. It streams from sources that legitimately provide it.

## Hard rules

These are not style preferences. Changes that break them will not be merged.

1. **Narrators stay first-class.** Never store a narrator as arbitrary text
   inside an audiobook record.
2. **Local-first stays local.** No accounts, no cloud sync, no sending playback
   data, bookmarks or history anywhere.
3. **Attribution stays visible.** Sources and editions keep their rights status,
   licence, attribution and original URL.
4. **Playback state stays per audio edition.** Progress for edition A must never
   affect edition B of the same work.
5. **The project stays non-commercial.** Do not change the licence to anything
   that permits commercial use.
6. **Free to listen never means public domain.** Report what the source reports;
   use `unknown` when it says nothing.
7. **No telemetry, analytics, advertising or tracking.** Not "just for
   development". Never, without explicit project-owner approval.
8. **No re-hosting third-party audiobooks.** Only with an explicit licence
   permitting redistribution *and* explicit project-owner approval.
9. **Provider logic lives in source adapters**, never in UI components.
10. **Domain entities must not depend on a provider**, a DOM API, or React.
11. **No unrelated refactors.** Keep changes scoped to the task.
12. **Preserve stored user data** when you can, and document migration impact
    before changing a persisted schema.
13. **No secrets.** No API keys, tokens or credentials, ever.

## Development setup

Requires Node.js 20.19+.

```bash
npm install
npm run dev
```

Before opening a pull request:

```bash
npm run check      # lint + typecheck + test + build
```

All four must pass. `npm run check` is the same command CI should run.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server on :5173 |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc -b`, no emit |
| `npm test` | Vitest |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build on :4173 |
| `npm run check` | All of the above in order |
| `npm run gen:fixtures` | Regenerate development tone and icon assets |

## Where things go

| Change | Location |
| --- | --- |
| Add a source provider | New file in `src/sources/`; register in `src/app/CatalogueProvider.tsx` |
| Add or change a domain entity | `src/domain/types.ts` |
| Change search or faceting | `src/domain/search.ts` |
| Change resume, skip or progress maths | `src/player/playerMachine.ts` |
| Change what is persisted | New migration in `src/persistence/db.ts` |
| Add a screen | `src/pages/`, then a route in `src/app/AppRoutes.tsx` |
| Styling | `src/styles/global.css` |

## Tests

Tests live next to the code as `*.test.ts` / `*.test.tsx`. Run in jsdom with an
in-memory IndexedDB; nothing hits the network.

Write tests for anything that touches:

- domain invariants (especially narrator relationships)
- resume, skip and progress behaviour
- persistence, including a simulated restart and migration paths
- rights and attribution rendering

A persistence change without a reopen test is not done: closing the app and
coming back is the actual requirement.

## Adding a dependency

The bar is high. Justify it in the pull request: what it replaces, why the
standard library or existing dependencies are insufficient, its licence, its
maintenance status, and its bundle size impact. Prefer extending existing
dependencies over adding new ones.

Every dependency must be added to
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) with its version and licence.

## Adding a source provider

1. Implement `SourceAdapter` (`src/sources/adapter.ts`).
2. Map into domain types only. Narrators must resolve to `Narrator` records
   with aliases.
3. Report rights honestly, defaulting to `unknown`. Do not classify MDS or any
   other free-to-listen content as public domain without a source that says so.
4. Return remote URLs. Do not download or cache audio files.
5. Namespace ids with your `source.id`.
6. Register in `createRegistry()`.
7. Add tests for the mapping, and add the provider's licence to
   `THIRD_PARTY_NOTICES.md`.
8. Do not modify UI components to accommodate the provider.

## Commit and PR hygiene

- One logical change per pull request.
- Describe what you changed, why, and how you verified it.
- Say plainly if something is unfinished or knowingly partial.
- Do not reformat unrelated files; do not bump unrelated dependency versions.
- Update `README.md` / `ARCHITECTURE.md` when behaviour or structure changes.
- Update `AGENTS.md` if you are changing a rule, not just implementing one.

## Development data

`src/data/devCatalogue.ts` is fictional fixture data on `example.invalid`. Do not
replace it with real audiobook metadata without a working adapter. Do not add
real cover images or audio files to the repository. Never mix fixture data into
a release build.

## Licensing of contributions

Contributions are accepted under the project's licence, the PolyForm Noncommercial
License 1.0.0. By submitting a contribution you confirm you have the right to
license it that way. Do not contribute code you do not have the right to license
under those terms, and do not contribute third-party content.
