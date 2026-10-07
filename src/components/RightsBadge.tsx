import type { RightsStatus } from '../domain/types';
import { rightsLabel } from '../domain/rights';

/** Compact rights label shown on every audio edition. */
export function RightsBadge({ status }: { status: RightsStatus }) {
  return (
    <span className={`badge badge--${status}`} title="Rights status reported by the source">
      {rightsLabel(status)}
    </span>
  );
}
