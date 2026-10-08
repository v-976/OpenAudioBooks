import type { DurationSeconds } from '../domain/duration';
import { formatDurationShort } from '../domain/durationPresets';
import { useI18n } from '../i18n/i18nContext';

/**
 * Compact duration label.
 *
 * An unknown duration renders as "длительность неизвестна", never as "0 мин".
 * The origin note ("около" / "подсчитано по главам") appears only when the value
 * was derived rather than reported, so a summed figure never looks as precise
 * as a source-stated one.
 */
export function DurationLabel({
  seconds,
  origin,
  showLabel = true,
  className = 'duration',
}: {
  seconds: DurationSeconds;
  origin?: 'reported' | 'summed' | 'unknown';
  /** Hidden inside badges, where the badge itself is self-explanatory. */
  showLabel?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const parts = formatDurationShort(seconds);

  if (!parts) {
    return <span className={`${className} duration--unknown`}>{t('duration.unknown')}</span>;
  }

  // A sub-minute recording keeps seconds. Rounding it to "0 мин" would claim
  // the audiobook has no length, which is false.
  const text =
    parts.hours === 0 && parts.minutes === 0
      ? `${parts.seconds} ${t('duration.seconds')}`
      : parts.hours === 0
        ? `${parts.minutes} ${t('duration.minutes')}`
        : parts.minutes === 0
          ? `${parts.hours} ${t('duration.hours')}`
          : `${parts.hours} ${t('duration.hours')} ${parts.minutes} ${t('duration.minutes')}`;

  const prefix = origin === 'summed' ? `${t('duration.estimated')} ` : '';

  return (
    <span className={className}>
      {showLabel ? <span className="label">{t('duration.cardLabel')} </span> : null}
      {prefix}
      {text}
    </span>
  );
}
