import { useCallback, useMemo } from 'react';
import type { LanguageCode } from '../domain/language';
import { availableNarrationLanguages, searchEditions, type EditionFilters } from '../domain/search';
import { useUserData } from './userData';
import { useCatalogueIndex } from './catalogueContext';

/**
 * Catalogue language filtering.
 *
 * The single place where the user's audiobook-language preference is turned
 * into a catalogue query. Keeping it here is what makes the rule enforceable:
 * every screen that lists audio editions goes through this hook, so none of them
 * can accidentally filter on `Work.originalLanguage`, title language, author
 * nationality or source country instead of narration language.
 */
export interface CatalogueLanguageFilter {
  /** Languages the user has chosen. Empty means "no restriction". */
  selected: LanguageCode[];
  /** Every narration language actually present in the catalogue. */
  available: LanguageCode[];
  /** True when the current selection excludes everything. */
  isActive: boolean;
  toggle(language: LanguageCode): Promise<void>;
  /** Applies this language preference to an existing set of facets. */
  apply<T extends EditionFilters>(filters: T): T & { narrationLanguages: LanguageCode[] };
}

export function useCatalogueLanguageFilter(): CatalogueLanguageFilter {
  const index = useCatalogueIndex();
  const { preferences, updatePreferences } = useUserData();

  const selected = preferences.preferredAudioLanguages;

  const toggle = useCallback(
    async (language: LanguageCode) => {
      const next = selected.includes(language)
        ? selected.filter((code) => code !== language)
        : [...selected, language];
      // Only the audiobook-language list changes. uiLocale is untouched, which is
      // the point: these are independent settings.
      await updatePreferences({ preferredAudioLanguages: next });
    },
    [selected, updatePreferences],
  );

  const apply = useCallback(
    <T extends EditionFilters>(filters: T): T & { narrationLanguages: LanguageCode[] } => ({
      ...filters,
      narrationLanguages: selected,
    }),
    [selected],
  );

  return useMemo(
    () => ({
      selected,
      available: availableNarrationLanguages(index),
      isActive: selected.length > 0,
      toggle,
      apply,
    }),
    [apply, index, selected, toggle],
  );
}

/**
 * Audio editions matching the user's language preference and any extra facets.
 * Convenience wrapper so screens do not re-implement the merge.
 */
export function useFilteredEditions(filters: EditionFilters = {}) {
  const index = useCatalogueIndex();
  const languageFilter = useCatalogueLanguageFilter();

  return useMemo(
    () => searchEditions(index, languageFilter.apply(filters)),
    [filters, index, languageFilter],
  );
}
