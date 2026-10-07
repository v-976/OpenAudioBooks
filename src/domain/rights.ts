import type { RightsStatus } from './types';

/**
 * Human-readable rights wording.
 *
 * "Free to listen" is deliberately rendered as its own label and never merged
 * with "public domain" (AGENTS.md rule 4).
 */
const RIGHTS_LABELS: Record<RightsStatus, string> = {
  publicDomain: 'Public domain',
  creativeCommons: 'Creative Commons',
  licensedFree: 'Free to listen (licensed)',
  permissionGranted: 'Permission granted',
  unknown: 'Rights unknown',
};

export function rightsLabel(status: RightsStatus): string {
  return RIGHTS_LABELS[status] ?? RIGHTS_LABELS.unknown;
}

/** True when the rights status is confident enough to state as public domain. */
export function isPublicDomain(status: RightsStatus): boolean {
  return status === 'publicDomain';
}
