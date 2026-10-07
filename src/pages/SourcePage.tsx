import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EditionCard } from '../components/EditionCard';
import { useCatalogue } from '../app/catalogueContext';
import { usePlayer } from '../player/playerContext';
import { searchEditions, type EditionView } from '../domain/search';
import { RightsBadge } from '../components/RightsBadge';
import { rightsLabel } from '../domain/rights';
import { NotFound } from './NotFound';

/** Source detail: attribution, rights, availability and everything it provides. */
export function SourcePage() {
  const { sourceId = '' } = useParams();
  const { index } = useCatalogue();
  const player = usePlayer();

  const source = index.sourcesById.get(decodeURIComponent(sourceId));
  const editions = useMemo(
    () => (source ? searchEditions(index, { sourceIds: [source.id] }) : []),
    [index, source],
  );
  const narrators = useMemo(() => {
    const ids = new Set<string>();
    for (const view of editions) {
      for (const narrator of view.narrators) ids.add(narrator.id);
    }
    return [...ids]
      .map((id) => index.narratorsById.get(id))
      .filter((narrator) => Boolean(narrator))
      .sort((a, b) => a!.name.localeCompare(b!.name));
  }, [editions, index]);

  if (!source) {
    return <NotFound title="Source not found" body="This source is not in the local catalogue." />;
  }

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Library</Link> <span aria-hidden="true">/</span>{' '}
        <Link to="/sources">Sources</Link>
      </nav>

      <h1 className="page__title">{source.name}</h1>
      <p className="page__subtitle">
        <a href={source.sourceUrl} target="_blank" rel="noreferrer noopener">
          {source.sourceUrl}
        </a>
      </p>

      <dl className="detail-list">
        <dt>Type</dt>
        <dd>{source.sourceType}</dd>

        <dt>Rights status</dt>
        <dd>
          <RightsBadge status={source.rightsStatus} />
          {source.licenseName ? <span> {source.licenseName}</span> : null}
          {source.licenseUrl ? (
            <>
              {' · '}
              <a href={source.licenseUrl} target="_blank" rel="noreferrer noopener">
                Licence terms
              </a>
            </>
          ) : null}
        </dd>

        {source.attribution ? (
          <>
            <dt>Attribution</dt>
            <dd>{source.attribution}</dd>
          </>
        ) : null}

        {source.availabilityNotes ? (
          <>
            <dt>Availability</dt>
            <dd>{source.availabilityNotes}</dd>
          </>
        ) : null}

        <dt>Identifier</dt>
        <dd className="mono">{source.id}</dd>
      </dl>

      {source.rightsStatus === 'unknown' ? (
        <p className="notice notice--warning">
          This source's rights status is unknown. Content from it is not treated as public domain
          and is labelled accordingly on every edition.
        </p>
      ) : null}

      <section className="section" aria-labelledby="source-narrators">
        <h2 className="section__title" id="source-narrators">
          Narrators on this source ({narrators.length})
        </h2>
        <ul className="chip-list">
          {narrators.map((narrator) => (
            <li key={narrator!.id}>
              <Link className="chip" to={`/narrators/${encodeURIComponent(narrator!.id)}`}>
                {narrator!.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="source-editions">
        <h2 className="section__title" id="source-editions">
          Audio editions ({editions.length})
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
        <p className="section__footnote">
          Rights labels are per edition: {editions.length === 0 ? 'none' : rightsLabel(editions[0].edition.rightsStatus)}{' '}
          and others may differ.
        </p>
      </section>
    </div>
  );
}
