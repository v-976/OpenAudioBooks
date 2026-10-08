import { useMemo, type ReactNode } from 'react';
import type { LanguageCode } from '../domain/language';
import { languageName, translate } from './index';
import { I18nContext, type I18nContextValue } from './i18nContext';

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
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: (key, params, count) => translate(locale, key, params, count),
      languageName: (code) => languageName(code, locale),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
