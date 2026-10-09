import { useMemo, useState } from 'react';
import type { DurationRange, EditionSort } from '../domain/search';
import {
  DURATION_PRESETS,
  MINUTE,
  PRESET_ANY,
  SORT_OPTIONS,
  isRangeContradictory,
  presetIdForRange,
  rangeFromMinutes,
  rangeFromPreset,
} from '../domain/durationPresets';
import { useI18n } from '../i18n/i18nContext';
import type { TranslationKey } from '../i18n/keys';

const PRESET_LABELS: Record<string, TranslationKey> = {
  under15: 'duration.filter.under15',
  '15to30': 'duration.filter.15to30',
  '30to60': 'duration.filter.30to60',
  '1to3h': 'duration.filter.1to3h',
  '3to10h': 'duration.filter.3to10h',
  over10h: 'duration.filter.over10h',
};

const SORT_LABELS: Record<EditionSort, TranslationKey> = {
  catalogue: 'sort.catalogue',
  shortest: 'sort.shortest',
  longest: 'sort.longest',
};

/**
 * Duration filter and duration sort control.
 *
 * The filter has a preset dropdown plus a free custom range in minutes, and can
 * be reset independently of every other facet. Sorting is applied after the
 * filters, and the caller is told when the loaded catalogue is partial so the
 * sort can be qualified rather than presented as a provider-wide ranking.
 */
export function DurationFilter({
  range,
  onRangeChange,
}: {
  range: DurationRange | undefined;
  onRangeChange(next: DurationRange | undefined): void;
}) {
  const { t } = useI18n();
  const derivedSelection = presetIdForRange(range);

  // "Custom" is a UI mode, not a range value: an empty custom range has no
  // equivalent preset, so it would immediately re-select "any" and hide the
  // inputs. The mode is therefore tracked here rather than inferred from the
  // range.
  const [customMode, setCustomMode] = useState(derivedSelection === 'custom');
  const selection = customMode ? 'custom' : derivedSelection;

  const [customMin, setCustomMin] = useState('');
  const [customMax, setCustomMax] = useState('');

  const apply = (value: string) => {
    if (value === PRESET_ANY) {
      setCustomMode(false);
      onRangeChange(undefined);
      return;
    }
    if (value === 'custom') {
      // Seed the inputs from whatever is currently applied, so choosing "custom"
      // does not silently discard an existing constraint.
      setCustomMode(true);
      setCustomMin(
        range?.minSeconds === undefined ? '' : String(Math.round(range.minSeconds / MINUTE)),
      );
      setCustomMax(
        range?.maxSeconds === undefined ? '' : String(Math.round(range.maxSeconds / MINUTE)),
      );
      return;
    }
    setCustomMode(false);
    onRangeChange(rangeFromPreset(value));
  };

  const applyCustom = () => {
    const min = Number(customMin);
    const max = Number(customMax);
    if (isRangeContradictory(min, max)) return;
    // An empty custom range applies no constraint, which is the same as "any".
    onRangeChange(rangeFromMinutes(min, max));
  };

  const active = range !== undefined && (range.minSeconds !== undefined || range.maxSeconds !== undefined);

  return (
    <div className="duration-filter">
      <label className="field">
        <span className="field__label">{t('duration.label')}</span>
        <select
          className="field__input"
          value={selection}
          aria-label={t('duration.label')}
          onChange={(event) => apply(event.target.value)}
        >
          <option value={PRESET_ANY}>{t('duration.filter.any')}</option>
          {DURATION_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {t(PRESET_LABELS[preset.id])}
            </option>
          ))}
          <option value="custom">{t('duration.filter.custom')}</option>
        </select>
      </label>

      {selection === 'custom' ? (
        <div className="duration-filter__custom">
          <label className="field field--inline">
            <span className="field__label">{t('duration.from')}</span>
            <input
              className="field__input field__input--number"
              type="number"
              inputMode="numeric"
              min={0}
              value={customMin}
              aria-label={t('duration.from')}
              placeholder="20"
              onChange={(event) => setCustomMin(event.target.value)}
              onBlur={applyCustom}
            />
          </label>
          <label className="field field--inline">
            <span className="field__label">{t('duration.to')}</span>
            <input
              className="field__input field__input--number"
              type="number"
              inputMode="numeric"
              min={0}
              value={customMax}
              aria-label={t('duration.to')}
              placeholder="45"
              onChange={(event) => setCustomMax(event.target.value)}
              onBlur={applyCustom}
            />
          </label>
          <p className="duration-filter__hint">{t('duration.filter.customHint')}</p>
          {isRangeContradictory(Number(customMin), Number(customMax)) ? (
            <p className="duration-filter__error" role="alert">
              {t('duration.filter.invalid')}
            </p>
          ) : null}
        </div>
      ) : null}

      {active ? (
        <div className="duration-filter__active">
          <p className="notice notice--info">{t('duration.filter.excludesUnknown')}</p>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => {
              setCustomMode(false);
              setCustomMin('');
              setCustomMax('');
              onRangeChange(undefined);
            }}
          >
            {t('duration.filter.reset')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Duration sort control. */
export function DurationSort({
  sort,
  onSortChange,
  partial,
  loadedCount,
  sourceName,
}: {
  sort: EditionSort;
  onSortChange(next: EditionSort): void;
  /** True when only a slice of the provider's catalogue is loaded. */
  partial?: boolean;
  loadedCount?: number;
  sourceName?: string;
}) {
  const { t } = useI18n();

  const partialNotice = useMemo(() => {
    if (!partial) return undefined;
    if (loadedCount !== undefined) {
      if (!sourceName) return t('sort.partialLoadedRecords', { count: loadedCount });
      return t('sort.partialCatalogue', {
        count: loadedCount,
        source: sourceName ?? '',
      });
    }
    return sourceName
      ? t('sort.partialCatalogueUnknownCount', { source: sourceName })
      : t('sort.partialLoadedRecordsUnknownCount');
  }, [loadedCount, partial, sourceName, t]);

  return (
    <div className="duration-sort">
      <label className="field">
        <span className="field__label">{t('sort.label')}</span>
        <select
          className="field__input"
          value={sort}
          aria-label={t('sort.label')}
          onChange={(event) => onSortChange(event.target.value as EditionSort)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(SORT_LABELS[option])}
            </option>
          ))}
        </select>
      </label>
      {partialNotice ? (
        <p className="notice notice--info" role="status">
          {partialNotice}
        </p>
      ) : null}
    </div>
  );
}
