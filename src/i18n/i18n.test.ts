import { describe, expect, it } from 'vitest';
import { ru } from './keys';
import {
  BUNDLES,
  isLocaleComplete,
  languageName,
  resolveUiLocale,
  selectableUiLocales,
  translate,
  translator,
  FALLBACK_UI_LOCALE,
} from './index';

describe('translation fallback', () => {
  it('resolves a key present in the requested locale', () => {
    expect(translate('en', 'nav.library')).toBe('Library');
  });

  it('falls back to the complete locale when a key is missing', () => {
    // English has no translation for this key; Russian must supply it rather
    // than rendering an empty string or a raw key.
    expect(translate('en', 'about.privacy')).toBe(ru['about.privacy']);
  });

  it('falls back for an unknown locale', () => {
    expect(translate('zz', 'nav.library')).toBe(ru['nav.library']);
  });

  it('reports a missing key as the key itself rather than an empty string', () => {
    // Only reachable through a cast; still better than rendering nothing.
    expect(translate('ru', 'does.not.exist' as 'nav.library')).toBe('does.not.exist');
  });

  it('Russian is complete and English is honestly reported as incomplete', () => {
    expect(isLocaleComplete('ru')).toBe(true);
    expect(isLocaleComplete('en')).toBe(false);
    expect(isLocaleComplete('zz')).toBe(false);
  });

  it('offers only locales that are actually complete', () => {
    const offered = selectableUiLocales();
    expect(offered).toContain('ru');
    for (const locale of offered) {
      expect(isLocaleComplete(locale)).toBe(true);
    }
  });

  it('has no keys in one locale that the complete locale lacks', () => {
    for (const [locale, bundle] of Object.entries(BUNDLES)) {
      for (const key of Object.keys(bundle)) {
        expect(key in ru).toBe(true);
        // A typo in one locale must not silently become a dead key.
        expect(translate(locale as 'ru', key as 'nav.library')).not.toBe(key);
      }
    }
  });
});

describe('locale resolution', () => {
  it('resolves stored locale values through normalisation', () => {
    expect(resolveUiLocale('ru')).toBe('ru');
    expect(resolveUiLocale('Русский')).toBe('ru');
    expect(resolveUiLocale('rus')).toBe('ru');
  });

  it('falls back when the stored locale is unavailable', () => {
    expect(resolveUiLocale('fi')).toBe(FALLBACK_UI_LOCALE);
    expect(resolveUiLocale(undefined)).toBe(FALLBACK_UI_LOCALE);
    expect(resolveUiLocale('')).toBe(FALLBACK_UI_LOCALE);
  });
});

describe('interpolation', () => {
  it('substitutes named placeholders', () => {
    expect(translate('ru', 'library.version', { version: '0.1.1', status: 'alpha' })).toBe(
      'Версия 0.1.1 · alpha',
    );
  });

  it('leaves unknown placeholders untouched rather than printing undefined', () => {
    expect(translate('ru', 'edition.resumeAt', {})).toContain('{time}');
  });
});

describe('Russian plural rules', () => {
  it('uses one/few/many correctly', () => {
    expect(translate('ru', 'search.resultsCount', undefined, 1)).toBe('1 аудиоиздание');
    expect(translate('ru', 'search.resultsCount', undefined, 2)).toBe('2 аудиокниги');
    expect(translate('ru', 'search.resultsCount', undefined, 5)).toBe('5 аудиокниг');
    expect(translate('ru', 'search.resultsCount', undefined, 11)).toBe('11 аудиокниг');
    expect(translate('ru', 'search.resultsCount', undefined, 21)).toBe('21 аудиоиздание');
    expect(translate('ru', 'search.resultsCount', undefined, 0)).toBe('0 аудиокниг');
  });

  it('exposes the count to the template', () => {
    expect(translate('ru', 'browse.editionCount', { count: 3 })).toContain('3');
  });

  it('pluralises counted nouns with correct Russian case', () => {
    // "2 произведения", not "2 произведений": the genitive singular follows
    // numerals 2–4 in Russian, so a fixed template is grammatically wrong.
    expect(translate('ru', 'count.works', undefined, 1)).toBe('1 произведение');
    expect(translate('ru', 'count.works', undefined, 2)).toBe('2 произведения');
    expect(translate('ru', 'count.works', undefined, 5)).toBe('5 произведений');
    expect(translate('ru', 'count.works', undefined, 11)).toBe('11 произведений');
    expect(translate('ru', 'count.sources', undefined, 2)).toBe('2 источника');
    expect(translate('ru', 'count.sources', undefined, 5)).toBe('5 источников');
    expect(translate('ru', 'count.audioEditions', undefined, 3)).toBe('3 аудиокниги');
  });

  it('uses the requested locale plural rules when the key exists there', () => {
    // English only defines one/other for this key; Russian rules still provide a
    // sensible form via the `other` fallback.
    expect(translate('en', 'search.resultsCount', undefined, 5)).toBeTruthy();
  });
});

describe('language display names', () => {
  it('shows human-readable names, not raw identifiers', () => {
    expect(languageName('ru', 'ru')).toBe('Русский');
    expect(languageName('en', 'ru')).toBe('Английский');
    expect(languageName('fi', 'ru')).toBe('Финский');
  });

  it('names languages in English for an English UI', () => {
    expect(languageName('ru', 'en')).toBe('Russian');
    expect(languageName('en', 'en')).toBe('English');
  });

  it('falls back to the English name for unknown languages and locales', () => {
    expect(languageName('ru', 'zz')).toBe('Russian');
    expect(languageName('zz', 'ru')).toBe('zz');
  });
});

describe('translator helper', () => {
  it('binds a locale once and can be reused', () => {
    const t = translator('ru');
    expect(t('nav.search')).toBe('Поиск');
    expect(t('player.speed')).toBe('Скорость');
  });
});

describe('translation key catalogue', () => {
  it('covers every user-facing surface', () => {
    // A representative key from each area of the interface, so a future refactor
    // cannot delete a whole group of strings without failing here.
    for (const key of [
      'nav.library',
      'search.field.narrationLanguage',
      'player.play',
      'bookmarks.title',
      'myBooks.localData',
      'settings.audioLanguages',
      'rights.unknown',
      'about.privacy',
      'common.source',
    ] as const) {
      expect(translate('ru', key)).toBeTruthy();
      expect(translate('ru', key)).not.toBe(key);
    }
  });

  it('keeps keys in English even though the values are Russian', () => {
    for (const key of Object.keys(ru)) {
      expect(/^[a-z][A-Za-z0-9.]*$/.test(key)).toBe(true);
    }
  });
});
