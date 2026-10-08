import {
  FALLBACK_UI_LOCALE,
  languageEnglishName,
  normalizeLanguageCode,
  TRANSLATED_UI_LOCALES,
  type LanguageCode,
} from '../domain/language';
import { enBundle } from './en';
import { ruBundle } from './ru';
import type {
  LocaleBundle,
  PluralCategory,
  TranslateParams,
  TranslationKey,
  TranslationValue,
} from './keys';

/**
 * Small, dependency-free localization layer.
 *
 * Design constraints:
 *  - no hard-coded user-facing strings in components; everything goes through
 *    `t()` with a typed key;
 *  - a documented fallback chain, so a partially translated locale degrades to
 *    the complete one instead of showing raw keys;
 *  - plural categories chosen by per-locale rules, because Russian needs
 *    one/few/many and hard-coding "s" suffixes would be visibly wrong;
 *  - locale completeness is computed, not asserted in prose, so the UI can say
 *    honestly that a translation is unfinished.
 *
 * The UI locale is completely independent of the audiobook-language preference.
 * This module knows nothing about catalogue filtering.
 */

export const BUNDLES: Record<LanguageCode, LocaleBundle> = {
  ru: ruBundle,
  en: enBundle,
};

/** Russian plural rules (CLDR): one / few / many / other. */
function russianPlural(count: number): PluralCategory {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  if (mod10 === 0 || (mod10 >= 5 && mod10 <= 9) || (mod100 >= 11 && mod100 <= 14)) return 'many';
  return 'other';
}

/**
 * Plural rules per locale. English needs only one/other; Russian needs the full
 * set. Adding a locale means adding its rules here.
 */
const PLURAL_RULES: Record<LanguageCode, (count: number) => PluralCategory> = {
  ru: russianPlural,
  en: (count: number) => (count === 1 ? 'one' : 'other'),
};

const IDENTIFIER_PLACEHOLDER = /\{(\w+)\}/g;

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(IDENTIFIER_PLACEHOLDER, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

function selectValue(value: TranslationValue, count?: number): string {
  if (typeof value === 'string') return value;
  if (count === undefined) {
    return value.other ?? value.one ?? value.many ?? value.few ?? '';
  }
  const category = (PLURAL_RULES[FALLBACK_UI_LOCALE] ?? russianPlural)(count);
  return value[category] ?? value.other ?? value.one ?? value.many ?? value.few ?? '';
}

/**
 * Resolution order for a key: the requested locale, then the fallback locale.
 * If a value is a plural map, the requested locale's own rules pick the form.
 */
function resolve(locale: LanguageCode, key: TranslationKey): TranslationValue | undefined {
  return BUNDLES[locale]?.[key] ?? BUNDLES[FALLBACK_UI_LOCALE]?.[key];
}

/**
 * Translates a key.
 *
 * @param key     Typed key; a typo is a compile error.
 * @param params  Values for `{placeholder}` substitutions.
 * @param count   When present, picks a plural form and is also exposed as
 *                `{count}` for locales that use a single plural template.
 * @param locale  UI locale. Independent of audiobook-language preference.
 */
export function translate(
  locale: LanguageCode,
  key: TranslationKey,
  params?: TranslateParams,
  count?: number,
): string {
  const value = resolve(locale, key);
  if (value === undefined) {
    // A missing key is a development error, not a user-facing condition. Showing
    // the key makes it obvious rather than rendering an empty element.
    if (import.meta.env.DEV) {
      console.warn(`Missing translation for key "${key}" in locale "${locale}".`);
    }
    return key;
  }
  const merged = count === undefined ? params : { ...params, count };
  return interpolate(selectValue(value, count), merged);
}

/** Convenience wrapper bound to one locale. */
export function translator(locale: LanguageCode) {
  return (key: TranslationKey, params?: TranslateParams, count?: number): string =>
    translate(locale, key, params, count);
}

/** True when the locale is translated in full, with no fallback needed. */
export function isLocaleComplete(locale: LanguageCode): boolean {
  const bundle = BUNDLES[locale];
  if (!bundle) return false;
  return Object.keys(ruBundle).every((key) => key in bundle);
}

/**
 * Locales offered as a UI choice.
 *
 * Only complete translations are offered, so the user is never shown a language
 * that would silently render half-translated. This list is intentionally
 * independent of `LANGUAGES`, which is about audiobook audio.
 */
export function selectableUiLocales(): LanguageCode[] {
  return TRANSLATED_UI_LOCALES.map((locale) => locale.code);
}

/**
 * Resolves a stored or requested UI locale to one that actually exists.
 * Unknown or unavailable locales fall back rather than breaking the interface.
 */
export function resolveUiLocale(input: unknown): LanguageCode {
  const normalized = normalizeLanguageCode(input);
  if (!normalized) return FALLBACK_UI_LOCALE;
  if (BUNDLES[normalized]) return normalized;
  return FALLBACK_UI_LOCALE;
}

/**
 * Human-readable language names, keyed by language code and UI locale.
 *
 * The interface shows "Русский", not "ru". Identifiers stay normalised
 * internally; only display uses these names.
 */
const LANGUAGE_NAMES: Record<LanguageCode, Partial<Record<LanguageCode, string>>> = {
  ru: { ru: 'Русский', en: 'Russian' },
  en: { ru: 'Английский', en: 'English' },
  fi: { ru: 'Финский', en: 'Finnish' },
  de: { ru: 'Немецкий', en: 'German' },
  fr: { ru: 'Французский', en: 'French' },
  es: { ru: 'Испанский', en: 'Spanish' },
  it: { ru: 'Итальянский', en: 'Italian' },
  no: { ru: 'Норвежский', en: 'Norwegian' },
  sv: { ru: 'Шведский', en: 'Swedish' },
  uk: { ru: 'Украинский', en: 'Ukrainian' },
  pl: { ru: 'Польский', en: 'Polish' },
  cs: { ru: 'Чешский', en: 'Czech' },
  pt: { ru: 'Португальский', en: 'Portuguese' },
  zh: { ru: 'Китайский', en: 'Chinese' },
  ja: { ru: 'Японский', en: 'Japanese' },
};

export function languageName(code: LanguageCode, uiLocale: LanguageCode): string {
  const localized = LANGUAGE_NAMES[code]?.[uiLocale];
  if (localized) return localized;
  // A known language with no translation for this UI locale, or an unknown one
  // entirely: fall back to the English name so the interface still reads as a
  // language name rather than as an error.
  return languageEnglishName(code);
}

export { FALLBACK_UI_LOCALE };
export type { TranslationKey };
