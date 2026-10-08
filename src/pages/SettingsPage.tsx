import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useUserData } from '../app/userData';
import { useCatalogueLanguageFilter } from '../app/catalogueLanguage';
import { useCatalogue } from '../app/catalogueContext';
import { LANGUAGES, languageEnglishName, type LanguageCode } from '../domain/language';
import { useI18n } from '../i18n/i18nContext';
import { isLocaleComplete, selectableUiLocales } from '../i18n';
import { APP_VERSION } from '../version';

/**
 * Settings.
 *
 * Two INDEPENDENT preferences, deliberately on one screen so the difference is
 * visible:
 *
 *  - interface language (`uiLocale`) — rendered language of the UI;
 *  - audiobook languages (`preferredAudioLanguages[]`) — which narration
 *    languages the catalogue shows, filtered on `AudioEdition.narrationLanguage`.
 *
 * Changing one never writes the other. There is no code path that derives one
 * from the other, and none should be added.
 */
export function SettingsPage() {
  const { preferences, updatePreferences } = useUserData();
  const { index } = useCatalogue();
  const { t, languageName, locale } = useI18n();
  const languageFilter = useCatalogueLanguageFilter();

  const selectableLocales = useMemo(() => selectableUiLocales(), []);

  // Languages offered for audio: everything the registry knows, plus anything a
  // fixture or future adapter actually delivered. Multi-select from the start.
  const audioLanguageOptions = useMemo(() => {
    const codes: LanguageCode[] = [];
    for (const language of LANGUAGES) codes.push(language.code);
    for (const code of languageFilter.available) {
      if (!codes.includes(code)) codes.push(code);
    }
    return codes;
  }, [languageFilter.available]);

  const editionCounts = useMemo(() => {
    const counts = new Map<LanguageCode, number>();
    for (const edition of index.catalogue.audioEditions) {
      // Editions with no verified narration language are counted separately and
      // never attributed to a language.
      const language = edition.narrationLanguage;
      if (!language) continue;
      counts.set(language, (counts.get(language) ?? 0) + 1);
    }
    return counts;
  }, [index]);

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link to="/">{t('nav.library')}</Link>
      </nav>

      <h1 className="page__title">{t('settings.title')}</h1>
      <p className="page__subtitle">{t('settings.languageIndependentNote')}</p>

      <section className="section" aria-labelledby="ui-locale-heading">
        <h2 className="section__title" id="ui-locale-heading">
          {t('settings.uiLocale')}
        </h2>
        <p className="page__meta">{t('settings.uiLocaleHint')}</p>

        <ul className="plain-list">
          {selectableLocales.map((code) => {
            const active = preferences.uiLocale === code;
            const complete = isLocaleComplete(code);
            return (
              <li key={code} className="plain-list__item plain-list__item--row">
                <span>
                  {languageName(code)}
                  {!complete ? (
                    <span className="plain-list__meta">
                      {t('settings.translationIncomplete')}
                    </span>
                  ) : null}
                </span>
                {active ? (
                  <span className="badge badge--publicDomain">{t('settings.selected')}</span>
                ) : null}
                <button
                  type="button"
                  className={active ? 'button button--primary' : 'button'}
                  aria-pressed={active}
                  onClick={() => void updatePreferences({ uiLocale: code })}
                >
                  {languageName(code)}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="notice notice--info">{t('settings.languageOnlyRussian')}</p>
        <p className="section__footnote">
          {t('settings.currentLocale', {
            name: languageName(locale),
            code: languageEnglishName(locale),
          })}
        </p>
      </section>

      <section className="section" aria-labelledby="audio-languages-heading">
        <h2 className="section__title" id="audio-languages-heading">
          {t('settings.audioLanguages')}
        </h2>
        <p className="page__meta">{t('settings.audioLanguagesHint')}</p>

        {/*
          Multi-select. Each button toggles one narration language; the empty
          selection means "no restriction" and is stated explicitly rather than
          silently showing nothing.
        */}
        <div className="language-selector language-selector--full">
          {audioLanguageOptions.map((code) => {
            const active = languageFilter.selected.includes(code);
            const count = editionCounts.get(code) ?? 0;
            return (
              <button
                key={code}
                type="button"
                className={active ? 'language-option language-option--active' : 'language-option'}
                aria-pressed={active}
                onClick={() => void languageFilter.toggle(code)}
              >
                <span className="language-option__name">{languageName(code)}</span>
                <span className="language-option__code">{code}</span>
                <span className="language-option__count">{count}</span>
              </button>
            );
          })}
        </div>

        {!languageFilter.isActive ? (
          <p className="notice">{t('settings.noAudioLanguagesSelected')}</p>
        ) : null}

        <p className="notice notice--info">{t('search.languageNotice')}</p>

        <p className="section__footnote">
          {t('settings.stats', {
            editions: index.catalogue.audioEditions.length,
            languages: languageFilter.available.map((code) => languageName(code)).join(', '),
          })}
        </p>
      </section>

      <section className="section" aria-labelledby="playback-heading">
        <h2 className="section__title" id="playback-heading">
          {t('myBooks.localData')}
        </h2>
        <p className="section__footnote">{t('myBooks.footer', { version: APP_VERSION })}</p>
        <p>
          <Link to="/my-books">{t('nav.myBooks')}</Link>
        </p>
      </section>
    </div>
  );
}
