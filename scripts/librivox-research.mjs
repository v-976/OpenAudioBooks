/**
 * One-off read-only research probe against the live LibriVox API.
 * Used during the Alpha 0.2.0 audit to verify field shapes.
 * Not part of the application; not run by any build step.
 *
 * Usage: node scripts/librivox-research.mjs [id...]
 */
const ids = process.argv.slice(2).map((value) => Number(value)).filter(Boolean);
const targets = ids.length > 0 ? ids : [559, 546, 210];

const base = 'https://librivox.org/api/feed/audiobooks/';

function pick(book, key) {
  return book[key] ?? null;
}

for (const id of targets) {
  const url = `${base}?format=json&extended=1&coverart=1&id=${id}`;
  const response = await fetch(url);
  const payload = await response.json();
  const book = payload.books?.[0];
  if (!book) {
    console.log(`id=${id}: NOT FOUND`);
    continue;
  }

  const sections = Array.isArray(book.sections) ? book.sections : [];
  const sectionSeconds = sections.reduce((sum, s) => sum + (Number(s.playtime) || 0), 0);
  const readerIds = new Set();
  const sectionLanguages = new Set();
  for (const section of sections) {
    sectionLanguages.add(section.language ?? '(none)');
    for (const reader of section.readers ?? []) readerIds.add(`${reader.reader_id}:${reader.display_name}`);
  }

  console.log('='.repeat(70));
  console.log(`id=${book.id}  title=${JSON.stringify(book.title)}`);
  console.log(`  project language : ${JSON.stringify(book.language)}`);
  console.log(`  totaltimesecs    : ${pick(book, 'totaltimesecs')}`);
  console.log(`  totaltime        : ${JSON.stringify(book.totaltime)}`);
  console.log(`  num_sections     : ${pick(book, 'num_sections')}  (actual sections returned: ${sections.length})`);
  console.log(`  sum(playtime)    : ${sectionSeconds}`);
  console.log(`  section languages: ${[...sectionLanguages].join(', ')}`);
  console.log(`  authors          : ${JSON.stringify(book.authors)}`);
  console.log(`  translators      : ${JSON.stringify(book.translators ?? null)}`);
  console.log(`  genres           : ${JSON.stringify((book.genres ?? []).map((g) => g.name).join(' | '))}`);
  console.log(`  readers (${readerIds.size})     : ${[...readerIds].join(' ; ')}`);
  console.log(`  url_librivox     : ${pick(book, 'url_librivox')}`);
  console.log(`  url_text_source  : ${pick(book, 'url_text_source')}`);
  console.log(`  url_iarchive     : ${pick(book, 'url_iarchive')}`);
  console.log(`  url_rss          : ${pick(book, 'url_rss')}`);
  console.log(`  coverart_jpg     : ${pick(book, 'coverart_jpg')}`);
  console.log(`  description      : ${JSON.stringify(String(book.description ?? '').slice(0, 120))}`);
  const first = sections[0];
  console.log('  first section    :', first ? JSON.stringify({
    id: first.id,
    section_number: first.section_number,
    title: first.title,
    playtime: first.playtime,
    language: first.language,
    listen_url: first.listen_url,
    readers: first.readers,
  }, null, 2) : '(none)');
}
