export interface MdsIndexAuthor {
  id: string;
  name: string;
  sourceUrl: string;
}

export interface MdsIndexRecord {
  id: string;
  title: string;
  authors: MdsIndexAuthor[];
  narrationLanguage?: string;
  pageUrl: string;
  durationSeconds?: number;
  audioFormat: string;
  source: string;
  indexedAt: string;
}

export interface MdsIndex {
  schemaVersion: number;
  source: {
    id: string;
    name: string;
    sourceUrl: string;
    sitemapUrl: string;
    indexedAt: string;
    publicWorkPages: number;
    indexedRecords: number;
    skippedRecords: number;
    duplicateRecords: number;
  };
  records: MdsIndexRecord[];
}
