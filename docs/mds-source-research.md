# MDS source audit

Audit date: **2026-10-09**

## Source and catalogue

- `https://mds.ru/` is the official programme site. Its “Где можно услышать?”
  page points to `https://mds-old.ru/` for archived episodes.
- `https://mds-old.ru/` identifies itself as an unofficial archive.
- The archive publishes `https://mds-old.ru/sitemap.xml`. On the audit date it
  contained 1,962 work pages under `/author/{author}/{work}` and 677 author pages.
- `robots.txt` allows public pages and disallows `/api/` and query-string search
  pages. The index generator therefore discovers metadata only from the sitemap
  and reads only its public `/author/` work pages. It does not crawl the API.
- Work pages expose `AudioObject` JSON-LD and a server-rendered work payload with
  a stable id, exact duration, authors, Russian narration language and source
  page URL.
- The 2026-10-09 generation processed all 1,962 published work-page URLs. It
  produced 1,455 unique playable records, skipped 306 pages whose payload stated
  no direct MDS audio, and de-duplicated 201 alternate pages by stable work id.

No published rate-limit policy was found. The generator is manual, sequential,
defaults to one request per second, honours `Retry-After`, makes at most two
attempts after a transient `429`/5xx response, and saves an atomic checkpoint.

## Verified audio

The following public work pages were checked:

- [Рэй Брэдбери — «Будет ласковый дождь»](https://mds-old.ru/author/%D0%A0%D1%8D%D0%B9_%D0%91%D1%80%D1%8D%D0%B4%D0%B1%D0%B5%D1%80%D0%B8/%D0%91%D1%83%D0%B4%D0%B5%D1%82_%D0%BB%D0%B0%D1%81%D0%BA%D0%BE%D0%B2%D1%8B%D0%B9_%D0%B4%D0%BE%D0%B6%D0%B4%D1%8C)
- [Роберт Шекли — «Лавка миров»](https://mds-old.ru/author/%D0%A0%D0%BE%D0%B1%D0%B5%D1%80%D1%82_%D0%A8%D0%B5%D0%BA%D0%BB%D0%B8/%D0%9B%D0%B0%D0%B2%D0%BA%D0%B0_%D0%BC%D0%B8%D1%80%D0%BE%D0%B2)
- [Фрэнк Герберт — «Дюна»](https://mds-old.ru/author/%D0%A4%D1%80%D1%8D%D0%BD%D0%BA_%D0%93%D0%B5%D1%80%D0%B1%D0%B5%D1%80%D1%82/%D0%94%D1%8E%D0%BD%D0%B0)

`/api/play/{workId}` returns an HTTP redirect to an expiring, signed `/mp3/` URL.
The redirected resources returned `audio/mpeg`, accepted byte ranges, and
answered a `Range: bytes=0-1023` request with `206 Partial Content` and a valid
MP3/ID3 prefix. The signed target must not be persisted; the stable resolver is
the track URL stored in the runtime catalogue.

Chromium loaded the stable resolver in a cross-origin `HTMLAudioElement` with
`readyState === 4`, reported the expected duration, and successfully paused and
resumed playback. Safari and Android were not available during the audit.

## CORS and index decision

The catalogue HTML, sitemap and JSON search response do not send
`Access-Control-Allow-Origin`; browser `fetch()` from another origin fails.
Audio loading is not affected because an ordinary media element may follow the
source's redirect without exposing the response to application code.

OpenAudioBooks therefore uses a generated static metadata index for search and
the source resolver for live audio. It uses no proxy, performs no runtime
catalogue scraping, stores no audio, and stores no signed media URL.

## Rights

The archive makes recordings available to listen to but does not state a licence
or public-domain status on the checked pages. OpenAudioBooks reports
`rightsStatus: unknown`, links every edition to its source page and keeps the
archive attribution visible. It does not infer rights from availability.
