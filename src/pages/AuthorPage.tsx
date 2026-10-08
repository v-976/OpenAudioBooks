import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EditionCard } from '../components/EditionCard';
import { useCatalogue } from '../app/catalogueContext';
import { usePlayer } from '../player/playerContext';
import { type EditionView } from '../domain/search';
import { useFilteredEditions } from '../app/catalogueLanguage';
import { useI18n } from '../i18n/i18nContext';
import { NotFound } from './NotFound';

/** Author detail: every audio edition of every work by this author. */
export function AuthorPage() {
  const { authorId = '' } = useParams();
  const { index } = useCatalogue();
  const player = usePlayer();
  const { t } = useI18n();

  const author = index.authorsById.get(decodeURIComponent(authorId));
  const filters = useMemo(() => ({ authorIds: author ? [author.id] : [] }), [author]);
  const editions = useFilteredEditions(filters);
  const works = useMemo(() => {
    const ids = new Set(editions.map((view) => view.work.id));
    return [...ids].map((id) => index.worksById.get(id)).filter((work) => Boolean(work));
  }, [editions, index]);

  if (!author) {
    return <NotFound title={t('author.notFound')} body={t('author.notFoundBody')} />;
  }

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link to="/">{t('nav.library')}</Link>{' '}
        <Link to="/browse/authors">{t('browse.authors.title')}</Link>
      </nav>

      <h1 className="page__title">{author.name}</h1>
      <p className="stats">
        {[
          t('count.works', undefined, works.length),
          t('count.audioEditions', undefined, editions.length),
        ].join(' · ')}
      </p>

      <section className="section" aria-labelledby="author-works">
        <h2 className="section__title" id="author-works">
          {t('author.works')}
        </h2>
        <ul className="chip-list">
          {works.map((work) => (
            <li key={work!.id}>
              <Link className="chip" to={`/works/${encodeURIComponent(work!.id)}`}>
                {work!.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="author-editions">
        <h2 className="section__title" id="author-editions">
          {t('author.audioEditions')}
        </h2>
        {editions.length === 0 ? (
          <p className="notice">{t('search.noResults')}</p>
        ) : (
          <div className="list">
            {editions.map((view: EditionView) => (
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
      </section>
    </div>
  );
}
