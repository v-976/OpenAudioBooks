import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SOURCE_URL = 'https://mds-old.ru/';
const SITEMAP_URL = new URL('sitemap.xml', SOURCE_URL).href;
const DEFAULT_OUTPUT = resolve('public/data/mds-index.json');
const DEFAULT_CHECKPOINT = resolve('scripts/.cache/mds-index-progress.json');
const USER_AGENT =
  'OpenAudioBooks metadata indexer/0.2 (+https://github.com/v-976/OpenAudioBooks)';

function parseArguments(argv) {
  const options = {
    output: DEFAULT_OUTPUT,
    checkpoint: DEFAULT_CHECKPOINT,
    delayMs: 1000,
    limit: undefined,
    resume: true,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === '--output' && value) {
      options.output = resolve(value);
      index += 1;
    } else if (argument === '--checkpoint' && value) {
      options.checkpoint = resolve(value);
      index += 1;
    } else if (argument === '--delay' && value) {
      options.delayMs = Number(value);
      index += 1;
    } else if (argument === '--limit' && value) {
      options.limit = Number(value);
      index += 1;
    } else if (argument === '--no-resume') {
      options.resume = false;
    } else {
      throw new Error(`Unknown or incomplete argument: ${argument}`);
    }
  }
  if (!Number.isFinite(options.delayMs) || options.delayMs < 250) {
    throw new Error('--delay must be at least 250 milliseconds.');
  }
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error('--limit must be a positive integer.');
  }
  return options;
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function fetchText(url, attempt = 1) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (response.ok) return response.text();

  if (attempt < 2 && (response.status === 429 || response.status >= 500)) {
    const retryAfterHeader = response.headers.get('retry-after');
    const retryAfterSeconds = Number(retryAfterHeader);
    const retryAfterDate = retryAfterHeader ? Date.parse(retryAfterHeader) : Number.NaN;
    const retryDelay =
      Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds * 1000
        : Number.isFinite(retryAfterDate)
          ? Math.max(0, retryAfterDate - Date.now())
          : 5000;
    await sleep(retryDelay);
    return fetchText(url, attempt + 1);
  }
  throw new Error(`HTTP ${response.status} for ${url}`);
}

function workUrlsFromSitemap(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1].replaceAll('&amp;', '&'))
    .filter((value) => {
      const parts = new URL(value).pathname.split('/').filter(Boolean);
      return parts[0] === 'author' && parts.length >= 3;
    });
}

function structuredAudioObject(html) {
  for (const match of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const parsed = JSON.parse(match[1]);
    if (parsed?.['@type'] === 'AudioObject') return parsed;
  }
  throw new Error('AudioObject JSON-LD is missing.');
}

function decodedRscPayload(html) {
  const chunks = [];
  for (const match of html.matchAll(/<script[^>]*>(self\.__next_f\.push\(([\s\S]*?)\))<\/script>/g)) {
    try {
      const value = JSON.parse(match[2]);
      if (value[0] === 1 && typeof value[1] === 'string') chunks.push(value[1]);
    } catch {
      // Other inline scripts are not part of the React Server Component stream.
    }
  }
  return chunks.join('\n');
}

function jsonObjectAt(text, start) {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === '{') depth += 1;
    else if (character === '}' && --depth === 0) return text.slice(start, index + 1);
  }
  throw new Error('Incomplete work object in RSC payload.');
}

function sourceWork(html, expectedTitle) {
  const payload = decodedRscPayload(html);
  const marker = '"work":';
  let offset = 0;
  while ((offset = payload.indexOf(marker, offset)) >= 0) {
    const objectStart = payload.indexOf('{', offset + marker.length);
    if (objectStart < 0) break;
    const parsed = JSON.parse(jsonObjectAt(payload, objectStart));
    if (parsed.name === expectedTitle) return parsed;
    offset = objectStart + 1;
  }
  throw new Error(`Work payload is missing for “${expectedTitle}”.`);
}

function normaliseRecord(pageUrl, html, indexedAt) {
  const structured = structuredAudioObject(html);
  const work = sourceWork(html, structured.name);
  if (!work.audioUrl || work.isSoundstream || work.rightsBlocked) return undefined;
  if (!Array.isArray(work.authors) || work.authors.length === 0) {
    throw new Error(`No author metadata for ${pageUrl}`);
  }
  return {
    id: work.id,
    title: work.name,
    authors: work.authors.map((author) => ({
      id: author.id,
      name: author.name,
      sourceUrl: new URL(`/author/${encodeURIComponent(author.slug)}`, SOURCE_URL).href,
    })),
    ...(structured.inLanguage ? { narrationLanguage: structured.inLanguage } : {}),
    pageUrl: structured.url || pageUrl,
    durationSeconds:
      Number.isFinite(work.duration) && work.duration > 0 ? Math.round(work.duration) : undefined,
    audioFormat: structured.encodingFormat || 'audio/mpeg',
    source: SOURCE_URL,
    indexedAt,
  };
}

async function readCheckpoint(path, expectedUrls) {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8'));
    if (
      parsed.sitemapUrl === SITEMAP_URL &&
      parsed.total === expectedUrls.length &&
      parsed.nextIndex < parsed.total
    ) {
      return parsed;
    }
  } catch {
    // Missing or stale checkpoints start a new run.
  }
  return { sitemapUrl: SITEMAP_URL, total: expectedUrls.length, nextIndex: 0, records: [], skipped: [] };
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

const options = parseArguments(process.argv.slice(2));
const sitemap = await fetchText(SITEMAP_URL);
let urls = workUrlsFromSitemap(sitemap);
if (options.limit !== undefined) urls = urls.slice(0, options.limit);
const indexedAt = new Date().toISOString();
const checkpoint = options.resume
  ? await readCheckpoint(options.checkpoint, urls)
  : { sitemapUrl: SITEMAP_URL, total: urls.length, nextIndex: 0, records: [], skipped: [] };

console.log(
  `MDS index: ${urls.length} public work pages, starting at ${checkpoint.nextIndex}, delay ${options.delayMs} ms.`,
);

for (let index = checkpoint.nextIndex; index < urls.length; index += 1) {
  const url = urls[index];
  try {
    const record = normaliseRecord(url, await fetchText(url), indexedAt);
    if (record) checkpoint.records.push(record);
    else checkpoint.skipped.push({ pageUrl: url, reason: 'no direct MDS audio' });
  } catch (error) {
    checkpoint.skipped.push({
      pageUrl: url,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
  checkpoint.nextIndex = index + 1;
  await writeJsonAtomic(options.checkpoint, checkpoint);
  if (checkpoint.nextIndex % 25 === 0 || checkpoint.nextIndex === urls.length) {
    console.log(
      `${checkpoint.nextIndex}/${urls.length}: ${checkpoint.records.length} indexed, ${checkpoint.skipped.length} skipped.`,
    );
  }
  if (index + 1 < urls.length) await sleep(options.delayMs);
}

const records = [...new Map(checkpoint.records.map((record) => [record.id, record])).values()].sort(
  (left, right) => left.title.localeCompare(right.title, 'ru'),
);
const output = {
  schemaVersion: 1,
  source: {
    id: 'mds',
    name: 'Модель для сборки',
    sourceUrl: SOURCE_URL,
    sitemapUrl: SITEMAP_URL,
    indexedAt,
    publicWorkPages: urls.length,
    indexedRecords: records.length,
    skippedRecords: checkpoint.skipped.length,
    duplicateRecords: checkpoint.records.length - records.length,
  },
  records,
};
await writeJsonAtomic(options.output, output);
console.log(`Wrote ${records.length} records to ${options.output}.`);
