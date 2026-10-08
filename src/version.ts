import type { TranslationKey } from './i18n/keys';

/**
 * Single source of truth for the displayed development version.
 *
 * The status label is a translation key, not a string: the interface language
 * changes, and the version number never does.
 */
export const APP_VERSION = '0.2.0';
export const APP_NAME = 'OpenAudioBooks';

/**
 * Status label key. This build is alpha development software and must never be
 * described as production-ready.
 */
export const APP_STATUS_TRANSLATION_KEY: TranslationKey = 'status.alpha';

/** Shown in the document title and the manifest, where no UI locale applies. */
export const APP_STATUS = 'Alpha 0.2.0 (development build)';
