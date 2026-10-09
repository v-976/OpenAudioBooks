import { describe, expect, it } from 'vitest';
import indexJson from '../../../public/data/mds-index.json';
import { normalizeLanguageCode } from '../../domain/language';
import { MDSAdapter } from './MDSAdapter';
import { mdsPlaybackUrl } from './source';
import type { MdsIndex } from './types';

const index = indexJson as MdsIndex;

describe('MDS metadata index', () => {
  it('contains unique public records and no audio files or signed MP3 URLs', () => {
    expect(index.source.sourceUrl).toBe('https://mds-old.ru/');
    expect(index.source.indexedRecords).toBe(index.records.length);
    expect(index.records.length).toBeGreaterThan(0);
    expect(new Set(index.records.map((record) => record.id)).size).toBe(index.records.length);

    for (const record of index.records) {
      expect(record.id).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(record.title.trim()).not.toBe('');
      expect(record.authors.length).toBeGreaterThan(0);
      if (record.narrationLanguage !== undefined) {
        expect(normalizeLanguageCode(record.narrationLanguage)).toBe('ru');
      }
      expect(record.pageUrl).toMatch(/^https:\/\/mds-old\.ru\/author\//);
      expect(record.source).toBe('https://mds-old.ru/');
      expect(record).not.toHaveProperty('audioUrl');
      expect(JSON.stringify(record)).not.toMatch(/(?:md5=|expires=)/i);
      for (const url of [
        record.pageUrl,
        record.source,
        ...record.authors.map((author) => author.sourceUrl),
      ]) {
        expect(url).not.toMatch(/\.mp3(?:[?#]|$)/i);
      }
    }
  });
});

describe('MDSAdapter', () => {
  it('searches Cyrillic titles and authors from the local index', async () => {
    const adapter = new MDSAdapter(index);
    const record = index.records.find((item) => /[А-Яа-яЁё]/.test(item.title));
    if (!record) throw new Error('The MDS index has no Cyrillic title');

    const byTitle = await adapter.listWorks({ text: record.title.slice(0, 5) });
    const byAuthor = await adapter.listWorks({ text: record.authors[0].name });

    expect(byTitle.items.some((work) => work.title === record.title)).toBe(true);
    expect(byAuthor.items.some((work) => work.title === record.title)).toBe(true);
  });

  it('maps one real recording to the stable resolver used by the shared player', async () => {
    const adapter = new MDSAdapter(index);
    const record = index.records[0];
    const bundle = await adapter.getEdition(`mds:edition:${record.id}`);

    expect(bundle?.edition.narrationLanguage).toBe('ru');
    expect(bundle?.edition.rightsStatus).toBe('unknown');
    expect(bundle?.edition.sourceUrl).toBe(record.pageUrl);
    expect(bundle?.tracks).toHaveLength(1);
    expect(bundle?.tracks[0].audioUrl).toBe(mdsPlaybackUrl(record.id));
    expect(bundle?.tracks[0].audioUrl).not.toMatch(/[?&](?:md5|expires)=/);
  });
});
