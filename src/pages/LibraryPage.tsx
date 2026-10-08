import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EditionCard } from '../components/EditionCard';
import { ProviderStatus } from '../components/ProviderStatus';
import { useCatalogue } from '../app/catalogueContext';
import { useUserData } from '../app/userData';
import { usePlayer } from '../player/playerContext';
import { useCatalogueLanguageFilter } from '../app/catalogueLanguage';
import { findEditionView, searchEditions, type EditionView } from '../domain/search';
import { useI18n } from '../i18n/i18nContext';
import { APP_VERSION } from '../version';
import { APP_STATUS_TRANSLATION_KEY } from '../version';

/**
 * Library / Home.
 *
 * Surfaces development-data warnings, the registered source adapters and a
 * continue-listening entry point. The listing is filtered by the user's
 * audiobook-language preference, not by the interface language.
 */
export function LibraryPage() {
  const { index, adapters, isDevelopmentData } = useCatalogue();
  const { continueListening, ready } = useUserData();
  const player = usePlayer();
  const { t, languageName } = useI18n();
  const languageFilter = useCatalogueLanguageFilter();

  const recentViews = useMemo(
    () =>
      continueListening()
        .slice(0, 4)
        .map((id) => findEditionView(index, id))
        .filter((view): view is EditionView => Boolean(view)),
    [continueListening, index],
  );

  const narrators = useMemo(
    () => [...index.catalogue.narrators].sort((a, b) => a.name.localeCompare(b.name)),
    [index],
  );

  const sampleEditions = useMemo(
    () => searchEditions(index, languageFilter.apply({})).slice(0, 6),
    [index, languageFilter],
  );

  return (
    <div className="page">
      <section className="hero">
        <h1 className="hero__title">{t('library.title')}</h1>
        <p className="hero__text">{t('library.description')}</p>
        <p className="hero__version">
          {t('library.version', { version: APP_VERSION, status: t(APP_STATUS_TRANSLATION_KEY) })}
        </p>
      </section>

      {isDevelopmentData ? (
        <p className="notice notice--warning" role="status">
          <strong>{t('library.developmentNoticeTitle')} </strong>
          {t('library.developmentNoticeBody')}
        </p>
      ) : null}

      <ProviderStatus />

      <section className="section" aria-labelledby="language-filter-heading">
        <h2 className="section__title" id="language-filter-heading">
          {t('settings.audioLanguages')}
        </h2>
        <LanguageSelector compact />
        <p className="section__footnote">{t('settings.audioLanguagesHint')}</p>
      </section>

      {ready && recentViews.length > 0 ? (
        <section className="section" aria-labelledby="continue-heading">
          <h2 className="section__title" id="continue-heading">
            {t('library.continueListening')}
          </h2>
          <div className="list">
            {recentViews.map((view) => (
              <EditionCard
                key={view.edition.id}
                view={view}
                trailing={
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => void player.play(view.edition.id)}
                  >
                    {t('player.play')}
                  </button>
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section" aria-labelledby="catalogue-heading">
        <h2 className="section__title" id="catalogue-heading">
          {t('library.inCatalogue')}
        </h2>
        {sampleEditions.length === 0 ? (
          <p className="notice">{t('search.noResults')}</p>
        ) : (
          <div className="list">
            {sampleEditions.map((view) => (
              <EditionCard
                key={view.edition.id}
                view={view}
                trailing={
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => void player.play(view.edition.id)}
                  >
                    {t('player.play')}
                  </button>
                }
              />
            ))}
          </div>
        )}
        <p className="section__footnote">
          <Link to="/search">{t('library.searchFullCatalogue')}</Link>
        </p>
      </section>

      <section className="section" aria-labelledby="narrators-heading">
        <h2 className="section__title" id="narrators-heading">
          {t('library.browseByNarrator')}
        </h2>
        <ul className="chip-list">
          {narrators.map((narrator) => (
            <li key={narrator.id}>
              <Link className="chip" to={`/narrators/${encodeURIComponent(narrator.id)}`}>
                {narrator.name}
                <span className="chip__count">
                  {(index.editionsByNarratorId.get(narrator.id) ?? []).length}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="sources-heading">
        <h2 className="section__title" id="sources-heading">
          {t('library.sourceAdapters')}
        </h2>
        <ul className="plain-list">
          {adapters.map((adapter) => (
            <li key={adapter.id} className="plain-list__item">
              <strong>{adapter.displayName}</strong>
              <span className="plain-list__meta">
                {adapter.isDevelopmentData
                  ? t('library.builtInDevelopmentData')
                  : t('library.providerAdapter')}
              </span>
            </li>
          ))}
        </ul>
        <p className="section__footnote">
          <Link to="/sources">{t('library.allSources')}</Link>
        </p>
      </section>

      <p className="page__meta">
        {t('settings.stats', {
          editions: index.catalogue.audioEditions.length,
          languages: languageFilter.available
            .map((code) => languageName(code))
            .join(', '),
        })}
      </p>
    </div>
  );
}

/**
 * Compact language control reused on the Library and Settings screens.
 *
 * Selecting an audiobook language must never touch the UI locale, which is why
 * this component knows nothing about `preferences.uiLocale`.
 */
export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { t, languageName } = useI18n();
  const { available, selected, isActive, toggle } = useCatalogueLanguageFilter();

  // Languages the registry knows about are always offered, even when the current
  // fixture set has no audio in them, so that the multi-language architecture is
  // visible before real providers arrive.
  const options = useMemo(() => {
    const known = ['ru', 'en', 'fi'];
    for (const code of available) {
      if (!known.includes(code)) known.push(code);
    }
    return known;
  }, [available]);

  return (
    <div className={compact ? 'language-selector' : 'language-selector language-selector--full'}>
      {options.map((code) => {
        const active = selected.includes(code);
        return (
          <button
            key={code}
            type="button"
            className={active ? 'language-option language-option--active' : 'language-option'}
            aria-pressed={active}
            onClick={() => void toggle(code)}
          >
            {languageName(code)}
            <span className="language-option__code">{code}</span>
          </button>
        );
      })}
      {!isActive ? <p className="notice">{t('settings.noAudioLanguagesSelected')}</p> : null}
    </div>
  );
}
