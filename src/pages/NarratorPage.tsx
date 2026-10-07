import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EditionCard } from '../components/EditionCard';
import { useCatalogue } from '../app/catalogueContext';
import { usePlayer } from '../player/playerContext';
import { editionsForNarrator, searchEditions, type EditionView } from '../domain/search';
import { NotFound } from './NotFound';

/**
 * Narrator detail.
 *
 * A narrator is a first-class entity: this page lists every audio edition they
 * narrated, across works and sources, which is the discovery path the domain
 * model is built around.
 */
export function NarratorPage() {
  const { narratorId = '' } = useParams();
  const { index } = useCatalogue();
  const player = usePlayer();

  const narrator = index.narratorsById.get(decodeURIComponent(narratorId));
  const editions = useMemo(
    () => (narrator ? searchEditions(index, { narratorIds: [narrator.id] }) : []),
    [index, narrator],
  );
  const distinctWorks = useMemo(() => {
    const ids = new Set(editions.map((view) => view.work.id));
    return ids.size;
  }, [editions]);
  const sources = useMemo(
    () => [...new Set(editions.map((view) => view.edition.sourceId))],
    [editions],
  );

  if (!narrator) {
    return (
      <NotFound
        title="Narrator not found"
        body="This narrator is not in the local catalogue. It may not have been loaded yet, or the link may be out of date."
      />
    );
  }

  const rawEditionIds = editionsForNarrator(index, narrator.id).map((edition) => edition.id);

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Library</Link> <span aria-hidden="true">/</span>{' '}
        <Link to="/narrators">Narrators</Link>
      </nav>

      <h1 className="page__title">{narrator.name}</h1>

      {narrator.aliases.length > 0 ? (
        <p className="page__subtitle">Also known as {narrator.aliases.join(' · ')}</p>
      ) : null}

      {narrator.biography ? <p className="prose">{narrator.biography}</p> : null}

      <p className="stats">
        {editions.length} audio edition{editions.length === 1 ? '' : 's'} · {distinctWorks} work
        {distinctWorks === 1 ? '' : 's'} · {sources.length} source{sources.length === 1 ? '' : 's'}
      </p>

      <section className="section" aria-labelledby="narrator-editions">
        <h2 className="section__title" id="narrator-editions">
          Audio editions narrated by {narrator.name}
        </h2>
        {editions.length === 0 ? (
          <p className="notice">No audio editions for this narrator yet.</p>
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
                    Play
                  </button>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section__title">Identifier</h2>
        <p className="mono">{narrator.id}</p>
        <p className="section__footnote">Catalogue records: {rawEditionIds.length}</p>
      </section>
    </div>
  );
}
