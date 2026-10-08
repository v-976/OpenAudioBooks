import type { RightsStatus } from './types';
import type { TranslationKey } from '../i18n/keys';

/**
 * Rights helpers and display mapping.
 *
 * The predicates are language-independent; the display wording is a translation
 * key, so the interface can be rendered in any language without the domain
 * knowing about languages at all.
 */

/** Translation key for each rights status. */
const RIGHTS_KEYS: Record<RightsStatus, TranslationKey> = {
  publicDomain: 'rights.publicDomain',
  creativeCommons: 'rights.creativeCommons',
  licensedFree: 'rights.licensedFree',
  permissionGranted: 'rights.permissionGranted',
  unknown: 'rights.unknown',
};

export function rightsKey(status: RightsStatus): TranslationKey {
  return RIGHTS_KEYS[status] ?? RIGHTS_KEYS.unknown;
}

/** True when the rights status is confident enough to state as public domain. */
export function isPublicDomain(status: RightsStatus): boolean {
  return status === 'publicDomain';
}

/**
 * True when the source did not state a rights status.
 *
 * `unknown` must never be treated as permissive; it is displayed as unknown and
 * carried through to the UI.
 */
export function isRightsUnknown(status: RightsStatus): boolean {
  return status === 'unknown';
}
