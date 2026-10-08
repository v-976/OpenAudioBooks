# LibriVox API — research findings

Audit performed for Alpha 0.2.0, on 2026-10-08, using a small number of
read-only requests against the live API. This document records what was
**verified**, what was found to be broken, and the decisions taken as a result.

No bulk download was performed. No audio file was downloaded. Total requests
used for the audit: roughly 20, each separated by several seconds.

---

## 1. Endpoints and formats

| Endpoint | Purpose | Verified |
| --- | --- | --- |
| `https://librivox.org/api/feed/audiobooks` | Projects (works + recordings) | yes |
| `https://librivox.org/api/feed/audiotracks` | Individual tracks | documented, not needed (sections are inlined with `extended=1`) |
| `https://librivox.org/api/feed/authors` | Author records | documented, not needed |

Formats: `xml` (default), `json`, `jsonp`, `serialized`, `php`. **JSON and JSONP
verified.**

Parameters verified: `id`, `since`, `title`, `author`, `genre`, `fields`,
`extended`, `coverart`, `limit`, `offset`, `format`, `sort_order`.

**There is no server-side `language` parameter.** Language filtering can only be
done client-side after fetching. This is a hard constraint on catalogue design
and is the reason the audiobook-language filter filters on the locally loaded
catalogue.

## 2. Pagination, limits and rate limits

| Property | Verified value |
| --- | --- |
| Default page size | 50 |
| Maximum `limit` | **500** |
| `limit` above 500 | HTTP **400** with `{"error":"Too many records requested…"}` |
| Pagination | `offset` (SQL-like) |
| `sort_order` | `asc` (default) / `desc` |
| Rate-limit headers | **none present** |
| Documented policy | "separate your requests by several seconds"; HTTP 429 "may" be introduced |
| Catalogue size | > 22,500 projects (offset 22000 returns a record); the official blog states "more than 21,000 completed projects" |
| Incremental updates | `since` (UNIX timestamp) — **verified working** |

A forum comment on the September 2026 API post reports intermittent `522`/`525`
errors, so 5xx handling is required, not optional.

### 2.1 Pagination is not exact — duplicates and gaps

Verified with overlapping pages:

```
offset=495 limit=10 -> 619,620,621,622,624,625,626,627,628,629   (623 absent)
offset=500 limit=10 -> 625,626,627,628,629,630,632,634,635,637
overlap: 625,626,627,628,629
```

`offset` is **not** a stable index into a fixed ordering: pages can overlap and
contain gaps. Consequences for the adapter:

- De-duplicate by project id across every page; never assume `offset + limit`
  arithmetic.
- Detect and skip ids already seen, so a scan cannot emit the same project twice.
- Do not infer "the catalogue ends here" from an empty page; stop on a repeated
  page signature or an explicit cap instead.

This is implemented in `src/sources/librivox/client.ts` and covered by tests.

## 3. CORS — the important finding

**`https://librivox.org` sends no `Access-Control-Allow-Origin` header**, not even
when an `Origin` header is supplied. Verified twice.

Consequence: a browser `fetch()` from the application would be blocked by the
same-origin policy. `librivox.org` is served through Cloudflare with no CORS
configuration.

### 3.1 Verified solution that needs no proxy: JSONP

The API's own documented `jsonp` format works cross-origin, because a
`<script src>` load is not subject to CORS:

```
GET /api/feed/audiobooks/?format=jsonp&callback=oabOnBooks&limit=1&fields=id,title
->  oabOnBooks({"books":[{"id":"47","title":"Count of Monte Cristo"}]})
```

Verified: the `callback` parameter is honoured and the response is
`NAME(<json>)`.

This is used instead of `fetch`. It is **not** a third-party proxy and requires
**no new server infrastructure**, which keeps the project inside its stated
constraints. The trade-offs are recorded in `ARCHITECTURE.md` §13: the response
is evaluated as JavaScript, so the callback name is unique per request, the
`<script>` element is always removed, requests have a hard timeout, and no
`eval` is used.

Note that `format=jsonp` **without** `callback` returns a bare `({…})`, which is
not callable. The `callback` parameter is mandatory for this transport.

### 3.2 Audio playback is unaffected

Verified with a HEAD request against a real `listen_url`:

```
HTTP 200
Content-Type: audio/mpeg
Access-Control-Allow-Origin: *
Accept-Ranges: bytes
```

Archive.org sends `Access-Control-Allow-Origin: *` and supports range requests,
so `<audio src>` plays directly and seeking works. No proxy is needed for audio.

## 4. Field audit

Verified on real records (ids 47, 300, 546, 559, plus a 500-record page).

| Field | Type observed | Used for |
| --- | --- | --- |
| `id` | string | namespaced entity ids |
| `title` | string | `Work.title` |
| `description` | HTML string | `Work.description` (tags stripped) |
| `language` | English display name, e.g. `"Russian"` | **`AudioEdition.narrationLanguage`** |
| `copyright_year` | string, may be empty | edition metadata |
| `num_sections` | string integer | completeness check for duration summing |
| `totaltimesecs` | integer string | **`AudioEdition.durationSeconds`** |
| `totaltime` | `"4:23:52"` | not used (parsed value is redundant) |
| `authors[]` | `{id, first_name, last_name, dob, dod}` | `Author` |
| `translators[]` | same shape, usually `[]` | `Author` with a translator flag |
| `genres[]` | `{id, name}` (needs `extended=1`) | `Work.genres` |
| `sections[]` | needs `extended=1`, see below | `Track` + readers |
| `url_librivox` | string | `AudioEdition.sourceUrl` |
| `url_text_source` | string | text provenance (Gutenberg, az.lib.ru, …) |
| `url_iarchive` | string, needs `extended=1` | attribution |
| `coverart_jpg` | string, needs `coverart=1` | `AudioEdition.coverUrl` |

### 4.1 `sections[]` — per-section readers exist

```json
{
  "id": "128929",
  "section_number": "1",
  "title": "part 1 chapter 1-2 ",
  "playtime": "972",
  "listen_url": "https://www.archive.org/download/notes_underground_russian/01-dostoevsky-zapiski-iz-podpolya-I-01-02_64kb.mp3",
  "language": "English",
  "readers": [{ "reader_id": "295", "display_name": "Yakovlev Valery" }]
}
```

- **Per-section readers are available.** Multiple readers per project are the
  norm, not an exception: verified 63 distinct readers on project 47 and 16 on
  project 300 (a collection). This is exactly the case the narrator-first model
  exists for.
- `playtime` is per-section seconds.
- `listen_url` is a direct, playable archive.org URL.
- `num_sections` equalled the number of sections returned in every verified
  record, so completeness can be checked before summing durations.

### 4.2 Defect found: `sections[].language` is unreliable

**Do not use `sections[].language`.** The field usually matches the project
language, but it does not always, and where it does not it is filled with
`"English"` regardless of what is actually spoken.

Verified across the first 50 projects (those with sections):

| | Count |
| --- | --- |
| Section language agrees with project language | 45 |
| **Section language disagrees** | **4** (ids 82 German→English, 89 Spanish→English, 121 Spanish→English, 122 French→English) |

Verified across all five Russian projects found during the audit:

| Project id | `language` (project) | `sections[].language` |
| --- | --- | --- |
| 559 Zapiski iz podpolya | `"Russian"` | `"English"` |
| 557 «Белые ночи» | `"Russian"` | `"English"` |
| 546 Krasavitse | `"Russian"` | `"English"` |
| 251 Poezdka v Polesye | `"Russian"` | `"English"` |
| 210 «Детство» | `"Russian"` | `"English"` |

Every Russian project disagrees, and a handful of other languages disagree too.
This is volunteer data-entry, not a documented default: most rows are correct,
which is exactly what makes the field dangerous — it looks reliable and passes a
casual check, and it fails precisely on the recordings this project most needs
to get right.

**Decision:** the project-level `language` field is authoritative for narration
language. The adapter reads it and ignores `sections[].language` entirely. This
is asserted in code and covered by a test.

An earlier draft of this document claimed the field was *always* `"English"`.
That was wrong — it was generalised from the Russian records alone. The
conclusion is unchanged and the reasoning above replaces it.

### 4.3 Language values observed

From one 500-record page: `English` (446), `German` (20), `French` (8),
`Russian` (5), `Spanish` (5), `Multilingual` (3), `Italian` (2), `Finnish` (2),
`Chinese` (2), `Japanese` (2), `Latin` (2), `Dutch` (1), `Hebrew` (1),
`Old English` (1). `Arabic` appeared in a `since` query.

Consequences for normalisation:

- `English`, `Russian`, `German`, `French`, `Spanish`, `Italian`, `Finnish`,
  `Dutch`, `Hebrew`, `Chinese`, `Japanese`, `Portuguese`, `Polish`, `Swedish`
  map to ISO 639-1 codes.
- **`Old English` must not collapse to `English`** — it is a historical variety
  (Anglo-Saxon), not modern English. The adapter keeps it distinct.
- **`Multilingual` is not a language.** It means the recording mixes languages.
  It cannot be honestly reported as a single narration language, so the adapter
  declines to set a narration language for such projects and the edition is
  treated as having an unknown narration language rather than a wrong one.

## 5. Duration

- `totaltimesecs` is present on every verified record and is the source total.
- `totaltime` is a formatted `H:MM:SS` string.
- Section `playtime` values sum to something **different** from `totaltimesecs`:

| Project | `totaltimesecs` | sum of `playtime` |
| --- | --- | --- |
| 559 Zapiski iz podpolya | 15,832 | 15,830 |
| 300 Collection Vol. 005 | 25,683 | 25,576 |
| 47 Count of Monte Cristo | 178,995 | 197,804 |

**Decision:** prefer `totaltimesecs`. Sum sections only as a fallback, and only
when `sections.length === num_sections` and every `playtime` is present and
valid. Never present a summed value with the same authority as a reported one.

## 6. Russian-language content

Confirmed present. Verified Russian projects found in the first 500 ids:

| id | `totaltimesecs` | Title |
| --- | --- | --- |
| 546 | 134 | Krasavitse (Pushkin, poetry) |
| 557 | 7,087 | «Белые ночи» (White Nights) |
| 559 | 15,832 | Zapiski iz podpolya (Notes from the Underground) |
| 251 | 2,526 | Poezdka v Polesye |
| 210 | 12,637 | Детство |

Observations:

- LibriVox stores Russian project titles in **Latin transliteration**, so
  Russian content is searchable but not in Cyrillic.
- `url_text_source` points at Russian sources (`az.lib.ru`, Gutenberg).
- A single Russian reader, `reader_id 295` "Yakovlev Valery", appears on the
  records checked.
- There is **no server-side language filter**, so Russian records cannot be
  targeted directly. Any Russian-first view must scan pages and filter locally,
  which means a partial catalogue unless the whole catalogue is walked.

## 7. Rights, licence and attribution

From LibriVox's own About page and its September 2026 announcement:

- "LibriVox is a non-commercial, non-profit and ad-free project."
- "LibriVox donates its recordings to the public domain."
- "All our audio is in the public domain, so you may use it for whatever purpose
  you wish."
- "because all LibriVox recordings are in the Public Domain, third parties – app
  developers, archivists, streaming channels and curators – are more than
  welcome to share and re-share them"
- Audio files are hosted by the **Internet Archive**; texts come from Project
  Gutenberg and similar.
- LibriVox is a registered trademark of its owners.

Decision: the LibriVox source reports `rightsStatus: 'publicDomain'` — that is
what LibriVox asserts about its own recordings, and it is recorded as such, with
mandatory attribution to LibriVox, the reader and the Internet Archive host. The
underlying text keeps its own `copyright_year` and `url_text_source`, which are
surfaced so a listener can see what text was used.

No audio is downloaded, cached, mirrored or re-hosted by this project. Only
remote `listen_url`s are referenced, and playback streams directly from
archive.org.

## 8. Error behaviour (verified)

| Condition | Status | Body |
| --- | --- | --- |
| `limit` above 500 | 400 | `{"error":"Too many records requested…"}` |
| No results for a filter | **404** | `{"error":"Audiobooks could not be found"}` |
| Non-existent single `id` | 404 | `{"error":"Audiobooks could not be found"}` |
| Intermittent 5xx (per forum report) | 522/525 | HTML, not JSON |

Important: **an empty result set is a 404, not an empty array.** Code that treats
non-2xx as failure must special-case 404 on list queries as "no matches", or
search will report spurious errors.

Error bodies are JSON for API-level errors but HTML for gateway errors, so
parsing must be defensive.

## 9. Decisions taken from this audit

| Finding | Decision |
| --- | --- |
| No CORS headers | Use the API's own documented `format=jsonp&callback=`; no proxy, no server |
| Audio CORS `*` + ranges | Stream `listen_url` directly; no proxy |
| No `language` parameter | Filter narration language on the locally loaded catalogue; state clearly when it is partial |
| Section `language` always `"English"` | Ignore it; use project `language` |
| `Multilingual` present | Do not invent a narration language; treat as unknown |
| `Old English` present | Keep distinct from `English` |
| Pagination duplicates/gaps | De-duplicate by id; never rely on offset arithmetic |
| `totaltimesecs` ≠ section sum | Prefer the reported total; sum only complete lists, as a weaker fallback |
| Empty result is 404 | Treat 404 on a list query as "no matches" |
| `limit` max 500, possible 429/5xx | Cap page size, serialise requests, delay between them, back off on 429/5xx |
| `since` works | Use it for incremental cache refresh |
| 22,500+ projects | Never bulk-load; bound every scan and label the catalogue as partial |

## 10. Open items for the project owner

Nothing here blocks the integration. Two items are worth a decision later, and
neither has been acted on:

1. **No proxy, so metadata fetches execute as JavaScript.** This is the API's own
   documented format and the only option that avoids adding server
   infrastructure, which is out of scope. If a proxy or build-time import step
   ever becomes acceptable, that would be a strictly safer transport and the
   adapter's transport is isolated enough to swap.
2. **A complete catalogue would need ~46+ pages** at 500 records per page.
   Walking that on every device load would be abusive, so the catalogue is
   deliberately partial and every duration sort states that it applies to the
   loaded set only.
