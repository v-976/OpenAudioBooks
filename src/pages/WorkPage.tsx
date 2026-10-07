import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EditionCard } from '../components/EditionCard';
import { useCatalogue } from '../app/catalogueContext';
import { usePlayer } from '../player/playerContext';
import {
  authorsForWork,
  editionsForWork,
  viewForEdition,
  type EditionView,
} from '../domain/search';
import { NotFound } from './NotFound';

/**
 * Work detail.
 *
 * A work is the abstract literary entity; all concrete recordings live under it
 * as audio editions. This page deliberately shows one work with several
 * narrators/sources when that is the case.
 */
export function WorkPage() {
  const { workId = '' } = useParams();
  const { index } = useCatalogue();
  const player = usePlayer();

  const work = index.worksById.get(decodeURIComponent(workId));
  const authors = useMemo(() => (work ? authorsForWork(index, work.id) : []), [index, work]);
  const editions = useMemo(() => (work ? editionsForWork(index, work.id) : []), [index, work]);
  const views = useMemo(
    () =>
      editions
        .map((edition) => viewForEdition(index, edition.id))
        .filter((view): view is EditionView => Boolean(view)),
    [editions, index],
  );

  if (!work) {
    return (
      <NotFound
        title="Work not found"
        body="This work is not in the local catalogue. Provider integration has not been implemented yet, so the catalogue currently contains development fixtures only."
      />
    );
  }

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Library</Link> <span aria-hidden="true">/</span> <Link to="/search">Search</Link>
      </nav>

      <h1 className="page__title">{work.title}</h1>
      <p className="page__subtitle">
        {authors.map((author, index) => (
          <span key={author.id}>
            {index > 0 ? ', ' : ''}
            <Link to={`/authors/${encodeURIComponent(author.id)}`}>{author.name}</Link>
          </span>
        ))}
      </p>

      {work.series ? (
        <p className="page__meta">
          Series: {work.series.name}
          {work.series.position ? `, book ${work.series.position}` : ''}
        </p>
      ) : null}
      {work.originalLanguage ? (
        <p className="page__meta">Original language: {work.originalLanguage.toUpperCase()}</p>
      ) : null}

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
          Audio editions ({editions.length})
        </h2>
        {views.length === 0 ? (
          <p className="notice">No audio editions of this work are known yet.</p>
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
                    Play
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
