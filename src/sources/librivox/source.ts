import type { Source } from '../../domain/types';

/**
 * The LibriVox `Source` record.
 *
 * Rights are reported as LibriVox itself states them: LibriVox is a non-commercial,
 * non-profit project which donates its recordings to the public domain and says
 * explicitly that third-party apps may share and re-share them. Attribution is
 * therefore mandatory and is attached to every edition.
 *
 * This is what the SOURCE asserts about its own recordings. It is not a
 * conclusion drawn from "free to listen", and the underlying text keeps its own
 * copyright year and text-source link, which the adapter surfaces.
 */
export const LIBRIVOX_SOURCE_ID = 'librivox';

export const LIBRIVOX_SOURCE: Source = {
  id: LIBRIVOX_SOURCE_ID,
  name: 'LibriVox',
  sourceUrl: 'https://librivox.org/',
  sourceType: 'publicDomainArchive',
  rightsStatus: 'publicDomain',
  licenseName: 'Public domain (donated recordings)',
  licenseUrl: 'https://librivox.org/pages/about-librivox/',
  attribution:
    'LibriVox is a non-commercial, non-profit, volunteer project. Its recordings are donated to the public domain. Audio files are hosted by the Internet Archive.',
  availabilityNotes:
    'Metadata is read from the LibriVox API. Audio streams directly from archive.org and is never downloaded or re-hosted.',
};

/** Maximum page size the API accepts. Anything higher returns HTTP 400. */
export const LIBRIVOX_MAX_LIMIT = 500;

/** Default page size. Deliberately conservative. */
export const LIBRIVOX_DEFAULT_LIMIT = 50;

/** The API's own non-error condition for "no records matched". */
export const LIBRIVOX_NO_RESULTS_STATUS = 404;

export const LIBRIVOX_API_BASE = 'https://librivox.org/api/feed/audiobooks/';
