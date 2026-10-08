import type { LibriVoxProject } from './types';

/**
 * Test fixtures copied from real LibriVox API responses (2026-10-08).
 *
 * They are deliberately verbatim, including the fields that are WRONG in the
 * live data, so that the tests reproduce real conditions rather than an idealised
 * payload. In particular `sections[].language` says `"English"` on a Russian
 * project, and `totaltimesecs` disagrees with the section sum.
 *
 * Trimmed where noted to keep the file readable; nothing else was altered.
 */

/** id 559 — Russian reading, single reader, total slightly above section sum. */
export const RUSSIAN_PROJECT: LibriVoxProject = {
  id: '559',
  title: 'Zapiski iz podpolya (Notes from the Underground)',
  description:
    '<i>Notes from Underground</i> by Fyodor Dostoevsky is a sophisticated novell<br /><br />Second paragraph.',
  url_text_source: 'https://az.lib.ru/d/dostoewskij_f_m/text_0290.shtml',
  language: 'Russian',
  copyright_year: '1849',
  num_sections: '3',
  url_rss: 'https://librivox.org/rss/559',
  url_zip_file: 'https://archive.org/compress/notes_underground_russian',
  url_librivox: 'https://librivox.org/zapiski-iz-podpolya-by-fyodor_dostoevsky/',
  url_iarchive: 'https://www.archive.org/details/notes_underground_russian',
  totaltime: '0:01:13',
  totaltimesecs: '73',
  authors: [{ id: '439', first_name: 'Fyodor', last_name: 'Dostoyevsky', dob: '1821', dod: '1881' }],
  translators: [],
  genres: [{ id: '1', name: 'General Fiction' }],
  coverart_jpg: 'https://archive.org/download/notes_underground_russian/Zapiski_iz_Podpolya_1104.jpg',
  sections: [
    {
      id: '128929',
      section_number: '1',
      title: 'part 1 chapter 1-2 ',
      playtime: '30',
      // DEFECT in the live data: the section says "English" on a Russian project.
      language: 'English',
      listen_url: 'https://www.archive.org/download/notes_underground_russian/01.mp3',
      readers: [{ reader_id: '295', display_name: 'Yakovlev Valery' }],
    },
    {
      id: '128930',
      section_number: '2',
      title: 'part 1 chapter 3 ',
      playtime: '25',
      language: 'English',
      listen_url: 'https://www.archive.org/download/notes_underground_russian/02.mp3',
      readers: [{ reader_id: '295', display_name: 'Yakovlev Valery' }],
    },
    {
      id: '128931',
      section_number: '3',
      title: 'part 2 ',
      playtime: '16',
      language: 'English',
      listen_url: 'https://www.archive.org/download/notes_underground_russian/03.mp3',
      readers: [{ reader_id: '295', display_name: 'Yakovlev Valery' }],
    },
  ],
};

/** id 300 — English collection, "Various" pseudo-author, 16 readers trimmed to 3. */
export const COLLECTION_PROJECT: LibriVoxProject = {
  id: '300',
  title: 'Short Story Collection Vol. 005',
  language: 'English',
  copyright_year: '',
  num_sections: '4',
  url_librivox: 'https://librivox.org/short-story-collection-vol-005/',
  totaltime: '0:10:11',
  totaltimesecs: '611',
  authors: [{ id: '18', first_name: '', last_name: 'Various', dob: '', dod: '' }],
  translators: [],
  genres: [
    { id: '1', name: 'Short Stories' },
    { id: '2', name: 'Collections' },
  ],
  sections: [
    {
      id: '2001',
      section_number: '1',
      title: 'Story One',
      playtime: '200',
      language: 'English',
      listen_url: 'https://www.archive.org/download/collection_005/01.mp3',
      readers: [{ reader_id: '157', display_name: 'Ben Douglas' }],
    },
    {
      id: '2002',
      section_number: '2',
      title: 'Story Two',
      playtime: '150',
      language: 'English',
      listen_url: 'https://www.archive.org/download/collection_005/02.mp3',
      readers: [{ reader_id: '472', display_name: 'Tina Tilney' }],
    },
    {
      id: '2003',
      section_number: '3',
      title: 'Story Three',
      playtime: '161',
      language: 'English',
      listen_url: 'https://www.archive.org/download/collection_005/03.mp3',
      readers: [
        { reader_id: '157', display_name: 'Ben Douglas' },
        { reader_id: '802', display_name: 'Heath Gardner' },
      ],
    },
    {
      id: '2004',
      section_number: '4',
      title: 'Story Four',
      playtime: '100',
      language: 'English',
      listen_url: 'https://www.archive.org/download/collection_005/04.mp3',
      readers: [{ reader_id: '472', display_name: 'Tina Tilney' }],
    },
  ],
};

/** A project whose language is explicitly "Multilingual" — not a language. */
export const MULTILINGUAL_PROJECT: LibriVoxProject = {
  id: '900',
  title: 'Mixed Language Reader',
  language: 'Multilingual',
  num_sections: '1',
  totaltimesecs: '120',
  authors: [{ id: '5', first_name: 'Ann', last_name: 'Author' }],
  sections: [
    {
      id: '9001',
      section_number: '1',
      title: 'Part one',
      playtime: '120',
      language: 'English',
      listen_url: 'https://www.archive.org/download/mixed/01.mp3',
      readers: [{ reader_id: '42', display_name: 'Polyglot Reader' }],
    },
  ],
};

/** Historic variety that must NOT collapse onto modern English. */
export const OLD_ENGLISH_PROJECT: LibriVoxProject = {
  id: '901',
  title: 'Beowulf Excerpts',
  language: 'Old English',
  num_sections: '1',
  totaltimesecs: '300',
  authors: [{ id: '6', first_name: '', last_name: 'Unknown' }],
  sections: [
    {
      id: '9011',
      section_number: '1',
      title: 'Opening',
      playtime: '300',
      language: 'English',
      listen_url: 'https://www.archive.org/download/beowulf/01.mp3',
      readers: [{ reader_id: '77', display_name: 'Scholar Reader' }],
    },
  ],
};

/** A project where the reported total is far larger than the section sum. */
export const MISMATCHED_TOTAL_PROJECT: LibriVoxProject = {
  id: '47',
  title: 'Count of Monte Cristo',
  language: 'English',
  num_sections: '2',
  totaltime: '49:44:55',
  totaltimesecs: '178995',
  authors: [{ id: '431', first_name: 'Alexandre', last_name: 'Dumas', dob: '1802', dod: '1870' }],
  translators: [],
  sections: [
    {
      id: '121010',
      section_number: '1',
      title: 'Marseilles—The Arrival ',
      playtime: '1179',
      language: 'English',
      listen_url: 'https://www.archive.org/download/monte_cristo/001.mp3',
      readers: [{ reader_id: '14', display_name: 'Kristin LeMoine' }],
    },
    {
      id: '121011',
      section_number: '2',
      title: 'Father and Son',
      playtime: '1157',
      language: 'English',
      listen_url: 'https://www.archive.org/download/monte_cristo/002.mp3',
      readers: [{ reader_id: '17', display_name: 'Gord Mackenzie' }],
    },
  ],
};

/** A project missing almost every optional field. */
export const SPARSE_PROJECT: LibriVoxProject = {
  id: '902',
  title: 'Minimal Record',
  language: 'German',
  sections: [],
};

/** A project whose sections are missing listen URLs and playtimes. */
export const UNUSABLE_SECTIONS_PROJECT: LibriVoxProject = {
  id: '903',
  title: 'Sections Without Audio',
  language: 'French',
  num_sections: '2',
  authors: [{ id: '9', first_name: 'Luc', last_name: 'Auteur' }],
  sections: [
    { id: '9031', section_number: '1', title: 'No audio', playtime: '60', readers: [] },
    { id: '9032', section_number: '2', title: 'Also no audio', readers: [] },
  ],
};

/** A project with a translator as well as an author. */
export const TRANSLATED_PROJECT: LibriVoxProject = {
  id: '904',
  title: 'Foreign Work',
  language: 'English',
  num_sections: '1',
  totaltimesecs: '600',
  authors: [{ id: '10', first_name: 'Original', last_name: 'Writer' }],
  translators: [{ id: '11', first_name: 'Translated', last_name: 'By' }],
  sections: [
    {
      id: '9041',
      section_number: '1',
      title: 'Chapter One',
      playtime: '600',
      language: 'English',
      listen_url: 'https://www.archive.org/download/foreign/01.mp3',
      readers: [{ reader_id: '21', display_name: 'Narrator One' }],
    },
  ],
};

/** All well-formed fixtures, for index-building tests. */
export const ALL_FIXTURES: LibriVoxProject[] = [
  RUSSIAN_PROJECT,
  COLLECTION_PROJECT,
  MULTILINGUAL_PROJECT,
  OLD_ENGLISH_PROJECT,
  MISMATCHED_TOTAL_PROJECT,
  SPARSE_PROJECT,
  UNUSABLE_SECTIONS_PROJECT,
  TRANSLATED_PROJECT,
];
