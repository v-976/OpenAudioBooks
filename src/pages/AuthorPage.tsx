import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EditionCard } from '../components/EditionCard';
import { useCatalogue } from '../app/catalogueContext';
import { usePlayer } from '../player/playerContext';
import { searchEditions, type EditionView } from '../domain/search';
import { NotFound } from './NotFound';

/** Author detail: every audio edition of every work by this author. */
export function AuthorPage() {
  const { authorId = '' } = useParams();
  const { index } = useCatalogue();
  const player = usePlayer();

  const author = index.authorsById.get(decodeURIComponent(authorId));
  const editions = useMemo(
    () => (author ? searchEditions(index, { authorIds: [author.id] }) : []),
    [author, index],
  );
  const works = useMemo(() => {
    const ids = new Set(editions.map((view) => view.work.id));
    return [...ids].map((id) => index.worksById.get(id)).filter((work) => Boolean(work));
  }, [editions, index]);

  if (!author) {
    return (
      <NotFound
        title="Author not found"
        body="This author is not in the local catalogue."
      />
    );
  }

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Library</Link> <span aria-hidden="true">/</span>{' '}
        <Link to="/authors">Authors</Link>
      </nav>

      <h1 className="page__title">{author.name}</h1>
      <p className="stats">
        {works.length} work{works.length === 1 ? '' : 's'} · {editions.length} audio edition
        {editions.length === 1 ? '' : 's'}
      </p>

      <section className="section" aria-labelledby="author-works">
        <h2 className="section__title" id="author-works">
          Works
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
          Audio editions
        </h2>
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
                  Play
                </button>
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}
