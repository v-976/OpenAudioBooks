import type { RightsStatus } from '../domain/types';
import { rightsKey } from '../domain/rights';
import { useI18n } from '../i18n/i18nContext';

/**
 * Compact rights label shown on every audio edition.
 *
 * The Russian rendering keeps "free to listen" distinct from "public domain",
 * because in Russian the two are just as easy to conflate as in English.
 */
export function RightsBadge({ status }: { status: RightsStatus }) {
  const { t } = useI18n();
  return (
    <span
      className={`badge badge--${status}`}
      title={`${t('common.rights')}: ${t(rightsKey(status))}`}
    >
      {t(rightsKey(status))}
    </span>
  );
}
