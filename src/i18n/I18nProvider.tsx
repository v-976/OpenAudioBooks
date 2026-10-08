import { useMemo, type ReactNode } from 'react';
import type { LanguageCode } from '../domain/language';
import { languageName, translate } from './index';
import { I18nContext, type I18nContextValue } from './i18nContext';
import type { TranslateParams, TranslationKey } from './keys';

/**
 * Localization provider.
 *
 * Exposes the UI locale and a bound `t()`. Nothing else in the application may
 * read the locale from preferences and translate on its own: going through this
 * context keeps the "no hard-coded user-facing strings" rule mechanically
 * checkable, because `t()` requires a typed key from one catalogue.
 */
export function I18nProvider({
  locale,
  children,
}: {
  locale: LanguageCode;
  children: ReactNode;
}) {
  const value = useMemo<I18nContextValue>(() => {
    const t = (key: TranslationKey, params?: TranslateParams, count?: number) =>
      translate(locale, key, params, count);
    return {
      locale,
      t,
      languageName: (code) => languageName(code, locale),
      narrationLanguageName: (code) =>
        code ? languageName(code, locale) : t('common.languageUnknown'),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
