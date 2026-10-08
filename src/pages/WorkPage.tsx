import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EditionCard } from '../components/EditionCard';
import { useCatalogue } from '../app/catalogueContext';
import { usePlayer } from '../player/playerContext';
import {
  authorsForWork,
  editionsForWork,
  type EditionFilters,
  type EditionView,
} from '../domain/search';
import { useFilteredEditions } from '../app/catalogueLanguage';
import { useI18n } from '../i18n/i18nContext';
import { NotFound } from './NotFound';

/**
 * Work detail.
 *
 * A work is the abstract literary entity; all concrete recordings live under it
 * as audio editions. This page deliberately shows one work with several
 * narrators, sources and languages when that is the case.
 *
 * Editions are filtered by the user's audiobook-language preference, while the
 * work's own original language is displayed separately and never derived from
 * those editions.
 */
export function WorkPage() {
  const { workId = '' } = useParams();
  const { index } = useCatalogue();
  const player = usePlayer();
  const { t, languageName } = useI18n();

  const work = index.worksById.get(decodeURIComponent(workId));
  const authors = useMemo(() => (work ? authorsForWork(index, work.id) : []), [index, work]);
  const allEditions = useMemo(() => (work ? editionsForWork(index, work.id) : []), [index, work]);

  // Only the edition LISTING honours the audiobook-language preference, and it
  // does so through the shared filter rather than a rule re-implemented here. The
  // work's own original language is shown independently of that preference.
  const filters = useMemo<EditionFilters>(() => ({}), []);
  const languageFiltered = useFilteredEditions(filters);
  const views = useMemo<EditionView[]>(
    () => languageFiltered.filter((view) => view.work.id === work?.id),
    [languageFiltered, work],
  );
  const hiddenByLanguage = allEditions.length - views.length;

  if (!work) {
    return (
      <NotFound title={t('work.notFound')} body={t('work.notFoundBody')} />
    );
  }

  const editionLanguages = [...new Set(views.map((view) => view.edition.narrationLanguage))];

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link to="/">{t('nav.library')}</Link> <Link to="/search">{t('nav.search')}</Link>
      </nav>

      <h1 className="page__title">{work.title}</h1>
      <p className="page__subtitle">
        {authors.map((author, position) => (
          <span key={author.id}>
            {position > 0 ? ', ' : ''}
            <Link to={`/authors/${encodeURIComponent(author.id)}`}>{author.name}</Link>
          </span>
        ))}
      </p>

      {work.series ? (
        <p className="page__meta">
          <span className="page__meta-label">{t('common.series')}: </span>
          <span className="page__meta-value">
            {work.series.name}
            {work.series.position
              ? ', ' + t('common.bookInSeries', { position: work.series.position })
              : ''}
          </span>
        </p>
      ) : null}
      {/*
        Original language is shown only when the source stated it. It is never
        inferred from an edition's narration language, and its absence is a valid
        state rather than something to fill in.
      */}
      <p className="page__meta">
        <span className="page__meta-label">{t('common.originalLanguage')}: </span>
        <span className="page__meta-value">
          {work.originalLanguage ? languageName(work.originalLanguage) : t('common.notSpecified')}
        </span>
      </p>

      {work.description ? <p className="prose">{work.description}</p> : null}

      {work.genres.length > 0 ? (
        <ul className="chip-list">
          {work.genres.map((genre) => (
            <li key={genre}>
              <Link className="chip" to={`/search?genre=${encodeURIComponent(genre)}`}>
                {genre}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <section className="section" aria-labelledby="work-editions">
        <h2 className="section__title" id="work-editions">
          {t('work.editionsCount', undefined, views.length)}
        </h2>
        {views.length === 0 ? (
          <p className="notice">{t('work.noEditions')}</p>
        ) : (
          <div className="list">
            {views.map((view) => (
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
        {editionLanguages.length > 0 ? (
          <p className="section__footnote">
            <span className="page__meta-label">{t('search.field.narrationLanguage')}: </span>
            <span className="page__meta-value">
              {editionLanguages.map((code) => languageName(code)).join(', ')}
            </span>
          </p>
        ) : null}
        {hiddenByLanguage > 0 ? (
          <p className="section__footnote">
            {t('work.hiddenByLanguage', undefined, hiddenByLanguage)}
          </p>
        ) : null}
      </section>
    </div>
  );
}
