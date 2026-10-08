import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCatalogue } from '../app/catalogueContext';
import { allGenres, availableNarrationLanguages } from '../domain/search';
import { useI18n } from '../i18n/i18nContext';
import type { TranslationKey } from '../i18n/keys';
import { NotFound } from './NotFound';

type BrowseKind = 'narrators' | 'authors' | 'sources';

const TITLES: Record<BrowseKind, { titleKey: TranslationKey; introKey: TranslationKey }> = {
  narrators: { titleKey: 'browse.narrators.title', introKey: 'browse.narrators.intro' },
  authors: { titleKey: 'browse.authors.title', introKey: 'browse.authors.intro' },
  sources: { titleKey: 'browse.sources.title', introKey: 'browse.sources.intro' },
};

/**
 * Index pages for narrator / author / source browsing.
 *
 * Counts here describe the whole catalogue, not the language-filtered view, so
 * that a narrator or source never appears to have vanished: a zero in a filtered
 * list should not read as "does not exist".
 */
export function BrowsePage() {
  const params = useParams();
  const kind = (params.kind ?? 'narrators') as BrowseKind;
  const { index } = useCatalogue();
  const { t, languageName } = useI18n();

  const narrators = useMemo(
    () => [...index.catalogue.narrators].sort((a, b) => a.name.localeCompare(b.name)),
    [index],
  );
  const authors = useMemo(
    () => [...index.catalogue.authors].sort((a, b) => a.name.localeCompare(b.name)),
    [index],
  );
  const sources = useMemo(
    () => [...index.catalogue.sources].sort((a, b) => a.name.localeCompare(b.name)),
    [index],
  );
  const genres = useMemo(() => allGenres(index), [index]);
  const languages = useMemo(() => availableNarrationLanguages(index), [index]);

  if (!(kind in TITLES)) {
    return <NotFound title={t('browse.notFound')} body={t('browse.notFoundBody')} />;
  }

  const meta = TITLES[kind];

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link to="/">{t('nav.library')}</Link>
      </nav>

      <h1 className="page__title">{t(meta.titleKey)}</h1>
      <p className="page__subtitle">{t(meta.introKey)}</p>

      {kind === 'narrators' ? (
        <ul className="plain-list">
          {narrators.map((narrator) => (
            <li key={narrator.id} className="plain-list__item plain-list__item--row">
              <Link to={`/narrators/${encodeURIComponent(narrator.id)}`}>{narrator.name}</Link>
              <span className="plain-list__meta">
                {t('browse.editionCount', undefined, (index.editionsByNarratorId.get(narrator.id) ?? []).length)}
                {narrator.aliases.length > 0 ? ` · ${t('common.alsoKnownAs')} ${narrator.aliases[0]}` : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {kind === 'authors' ? (
        <ul className="plain-list">
          {authors.map((author) => (
            <li key={author.id} className="plain-list__item plain-list__item--row">
              <Link to={`/authors/${encodeURIComponent(author.id)}`}>{author.name}</Link>
              <span className="plain-list__meta">
                {t('browse.editionCount', undefined, (index.editionsByAuthorId.get(author.id) ?? []).length)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {kind === 'sources' ? (
        <ul className="plain-list">
          {sources.map((source) => (
            <li key={source.id} className="plain-list__item plain-list__item--row">
              <Link to={`/sources/${encodeURIComponent(source.id)}`}>{source.name}</Link>
              <span className="plain-list__meta">
                {source.sourceType} ·{' '}
                {t('browse.editionCount', undefined, (index.editionsBySourceId.get(source.id) ?? []).length)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <section className="section" aria-labelledby="browse-genres">
        <h2 className="section__title" id="browse-genres">
          {t('browse.genres')}
        </h2>
        <ul className="chip-list">
          {genres.map((genre) => (
            <li key={genre}>
              <Link className="chip" to={`/search?genre=${encodeURIComponent(genre)}`}>
                {genre}
                <span className="chip__count">
                  {(index.editionsByGenre.get(genre.toLowerCase()) ?? []).length}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="browse-languages">
        <h2 className="section__title" id="browse-languages">
          {t('browse.languages')}
        </h2>
        <ul className="chip-list">
          {languages.map((language) => (
            <li key={language}>
              <Link className="chip" to={`/search?lang=${encodeURIComponent(language)}`}>
                {languageName(language)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
