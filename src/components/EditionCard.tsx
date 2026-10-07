import { Link } from 'react-router-dom';
import type { EditionView } from '../domain/search';
import { RightsBadge } from './RightsBadge';

/** Compact card used in lists of audio editions. */
export function EditionCard({
  view,
  trailing,
}: {
  view: EditionView;
  trailing?: React.ReactNode;
}) {
  const { edition, work, authors, narrators, source } = view;
  return (
    <article className="card">
      <div className="card__body">
        <h3 className="card__title">
          <Link to={`/editions/${encodeURIComponent(edition.id)}`}>{work.title}</Link>
        </h3>
        <p className="card__meta">
          {authors.length > 0 ? authors.map((author) => author.name).join(', ') : 'Unknown author'}
        </p>
        <p className="card__meta card__meta--narrators">
          <span className="label">Narrated by</span>{' '}
          {narrators.length > 0
            ? narrators.map((narrator, index) => (
                <span key={narrator.id}>
                  {index > 0 ? ', ' : ''}
                  <Link to={`/narrators/${encodeURIComponent(narrator.id)}`}>{narrator.name}</Link>
                </span>
              ))
            : 'Unknown narrator'}
        </p>
        <p className="card__meta">
          <span className="label">Source</span>{' '}
          {source ? <Link to={`/sources/${encodeURIComponent(source.id)}`}>{source.name}</Link> : 'Unknown'}
        </p>
        <div className="card__tags">
          <span className="badge">{edition.language.toUpperCase()}</span>
          <RightsBadge status={edition.rightsStatus} />
          {edition.releaseYear ? <span className="badge">{edition.releaseYear}</span> : null}
          {work.series ? (
            <span className="badge">
              {work.series.name}
              {work.series.position ? ` #${work.series.position}` : ''}
            </span>
          ) : null}
        </div>
      </div>
      {trailing ? <div className="card__footer">{trailing}</div> : null}
    </article>
  );
}
