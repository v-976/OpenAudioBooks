import { createContext, useContext } from 'react';
import type { LanguageCode } from '../domain/language';
import type { TranslateParams, TranslationKey } from './keys';

/**
 * Localization context contract.
 *
 * Kept in its own module so that provider components stay the only React
 * exports in this folder.
 */
export interface I18nContextValue {
  /** UI language. Independent of the audiobook-language preference. */
  locale: LanguageCode;
  t(key: TranslationKey, params?: TranslateParams, count?: number): string;
  /** Human-readable language name, e.g. "Русский" for `ru`. */
  languageName(code: LanguageCode): string;
}

export const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error('useI18n must be used inside <I18nProvider>.');
  }
  return value;
}
