import { describe, expect, it } from 'vitest';
import {
  isKnownLanguage,
  includesLanguage,
  languageEnglishName,
  normalizeLanguageCode,
  normalizeLanguageList,
  FALLBACK_UI_LOCALE,
  TRANSLATED_UI_LOCALES,
} from './language';

describe('normalizeLanguageCode', () => {
  it('accepts canonical identifiers unchanged', () => {
    expect(normalizeLanguageCode('ru')).toBe('ru');
    expect(normalizeLanguageCode('en')).toBe('en');
    expect(normalizeLanguageCode('fi')).toBe('fi');
  });

  it('normalises case and surrounding whitespace', () => {
    expect(normalizeLanguageCode('  RU  ')).toBe('ru');
    expect(normalizeLanguageCode('En')).toBe('en');
  });

  it('reduces region-qualified tags to the primary subtag', () => {
    expect(normalizeLanguageCode('ru-RU')).toBe('ru');
    expect(normalizeLanguageCode('ru_RU')).toBe('ru');
    expect(normalizeLanguageCode('en-GB')).toBe('en');
  });

  it('maps ISO 639-2/3 bibliographic codes', () => {
    expect(normalizeLanguageCode('rus')).toBe('ru');
    expect(normalizeLanguageCode('eng')).toBe('en');
    expect(normalizeLanguageCode('fin')).toBe('fi');
  });

  it('maps English language names', () => {
    expect(normalizeLanguageCode('Russian')).toBe('ru');
    expect(normalizeLanguageCode('finnish')).toBe('fi');
  });

  it('maps Russian language names', () => {
    expect(normalizeLanguageCode('Русский')).toBe('ru');
    expect(normalizeLanguageCode('Английский')).toBe('en');
    expect(normalizeLanguageCode('Финский')).toBe('fi');
  });

  it('passes through a well-formed unknown language rather than dropping it', () => {
    // A future provider language must not be silently lost because it is absent
    // from our registry.
    expect(normalizeLanguageCode('eo')).toBe('eo');
    expect(normalizeLanguageCode('pt-BR')).toBe('pt');
    expect(isKnownLanguage('eo')).toBe(false);
  });

  it('returns undefined for unusable input', () => {
    expect(normalizeLanguageCode(undefined)).toBeUndefined();
    expect(normalizeLanguageCode(null)).toBeUndefined();
    expect(normalizeLanguageCode(42)).toBeUndefined();
    expect(normalizeLanguageCode('')).toBeUndefined();
    expect(normalizeLanguageCode('   ')).toBeUndefined();
    expect(normalizeLanguageCode('!!!')).toBeUndefined();
  });
});

describe('normalizeLanguageList', () => {
  it('normalises, de-duplicates and preserves order', () => {
    expect(normalizeLanguageList(['ru-RU', 'rus', 'en', 'Русский', 'fi'])).toEqual([
      'ru',
      'en',
      'fi',
    ]);
  });

  it('drops unusable entries rather than storing junk', () => {
    expect(normalizeLanguageList(['ru', '', null, 7, undefined, 'en'])).toEqual(['ru', 'en']);
  });

  it('returns an empty list for non-arrays', () => {
    expect(normalizeLanguageList('ru')).toEqual([]);
    expect(normalizeLanguageList(undefined)).toEqual([]);
  });
});

describe('language registry', () => {
  it('names languages in English, falling back to the code', () => {
    expect(languageEnglishName('ru')).toBe('Russian');
    expect(languageEnglishName('fi')).toBe('Finnish');
    expect(languageEnglishName('zz')).toBe('zz');
  });

  it('answers membership questions', () => {
    expect(isKnownLanguage('ru')).toBe(true);
    expect(isKnownLanguage('ru-RU')).toBe(false);
    expect(includesLanguage(['ru', 'en'], 'en')).toBe(true);
    expect(includesLanguage(['ru'], 'fi')).toBe(false);
  });
});

describe('UI locales are a separate concept from catalogue languages', () => {
  it('offers only complete UI translations', () => {
    expect(TRANSLATED_UI_LOCALES.map((locale) => locale.code)).toContain(FALLBACK_UI_LOCALE);
    // English audio exists in the catalogue but the English UI is not complete,
    // so it must not be offered as a UI locale yet.
    expect(TRANSLATED_UI_LOCALES.map((locale) => locale.code)).not.toContain('en');
  });
});
