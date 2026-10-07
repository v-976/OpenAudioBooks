import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCatalogue } from '../app/catalogueContext';
import { usePlayer } from '../player/playerContext';
import { useUserData } from '../app/userData';
import { useResumeTarget } from '../player/useResumeTarget';
import { totalDurationSeconds, viewForEdition } from '../domain/search';
import { formatDuration } from '../player/playerMachine';
import { RightsBadge } from '../components/RightsBadge';
import { rightsLabel } from '../domain/rights';
import { NotFound } from './NotFound';

/**
 * Audio edition detail.
 *
 * This is the level playback state belongs to: two editions of the same work
 * keep entirely separate positions, bookmarks and favourites.
 */
export function EditionPage() {
  const { editionId = '' } = useParams();
  const { index } = useCatalogue();
  const player = usePlayer();
  const { stateFor } = useUserData();
  const decoded = decodeURIComponent(editionId);

  const view = useMemo(() => viewForEdition(index, decoded), [decoded, index]);
  const resume = useResumeTarget(decoded);
  const state = stateFor(decoded);

  if (!view) {
    return (
      <NotFound
        title="Audio edition not found"
        body="This audio edition is not in the local catalogue. Real provider data has not been integrated yet."
      />
    );
  }

  const { edition, work, authors, narrators, source, tracks } = view;
  const duration = edition.durationSeconds ?? totalDurationSeconds(index, edition.id);
  const otherEditions = (index.editionsByWorkId.get(work.id) ?? []).filter(
    (item) => item.id !== edition.id,
  );

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Library</Link> <span aria-hidden="true">/</span>{' '}
        <Link to={`/works/${encodeURIComponent(work.id)}`}>{work.title}</Link>
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

      <dl className="detail-list">
        <dt>Narrator</dt>
        <dd>
          {narrators.length > 0
            ? narrators.map((narrator, index) => (
                <span key={narrator.id}>
                  {index > 0 ? ', ' : ''}
                  <Link to={`/narrators/${encodeURIComponent(narrator.id)}`}>{narrator.name}</Link>
                </span>
              ))
            : 'Unknown narrator'}
        </dd>

        <dt>Language</dt>
        <dd>{edition.language.toUpperCase()}</dd>

        <dt>Duration</dt>
        <dd>{formatDuration(duration)}</dd>

        <dt>Release</dt>
        <dd>
          {[edition.releaseYear, edition.publisher].filter(Boolean).join(' · ') || 'Not reported'}
        </dd>

        <dt>Source</dt>
        <dd>
          {source ? (
            <>
              <Link to={`/sources/${encodeURIComponent(source.id)}`}>{source.name}</Link>
              {edition.sourceUrl ? (
                <>
                  {' · '}
                  <a href={edition.sourceUrl} target="_blank" rel="noreferrer noopener">
                    Original page
                  </a>
                </>
              ) : null}
            </>
          ) : (
            'Unknown'
          )}
        </dd>

        <dt>Rights</dt>
        <dd>
          <RightsBadge status={edition.rightsStatus} />
          {edition.licenseName ? <span> {edition.licenseName}</span> : null}
          {edition.licenseUrl ? (
            <>
              {' · '}
              <a href={edition.licenseUrl} target="_blank" rel="noreferrer noopener">
                Licence terms
              </a>
            </>
          ) : null}
          {edition.rightsStatus === 'unknown' ? (
            <p className="notice notice--warning">
              The source has not stated the rights status for this edition. Free to listen does
              not mean public domain.
            </p>
          ) : null}
        </dd>

        {source?.attribution ? (
          <>
            <dt>Attribution</dt>
            <dd>{source.attribution}</dd>
          </>
        ) : null}
      </dl>

      <div className="card__actions">
        <button
          type="button"
          className="button button--primary button--large"
          onClick={() =>
            // An explicit first track means "from the start", never the saved
            // position, which is what the Resume button below is for.
            void player.play(edition.id, tracks[0]?.id, 0)
          }
        >
          Play from start
        </button>
        {resume && state && state.positionSeconds > 0 ? (
          <button
            type="button"
            className="button button--large"
            onClick={() =>
              void player.play(edition.id, resume.trackId, resume.offsetSeconds)
            }
          >
            Resume at {formatDuration(resume.offsetSeconds)}
          </button>
        ) : null}
      </div>

      {state ? (
        <p className="page__meta">
          Last played {state.lastPlayedAt.slice(0, 16).replace('T', ' ')} ·{' '}
          {state.completed ? 'finished' : 'in progress'} ·{' '}
          {state.favorite ? 'favourited' : 'not favourited'}
        </p>
      ) : (
        <p className="page__meta">Not started yet. Progress is saved on this device only.</p>
      )}

      {work.description ? (
        <section className="section">
          <h2 className="section__title">About this work</h2>
          <p className="prose">{work.description}</p>
        </section>
      ) : null}

      <section className="section" aria-labelledby="edition-tracks">
        <h2 className="section__title" id="edition-tracks">
          Tracks ({tracks.length})
        </h2>
        <ol className="track-list">
          {tracks.map((track) => (
            <li key={track.id} className="track-list__item">
              <button
                type="button"
                className="track-list__button"
                onClick={() => void player.play(edition.id, track.id, 0)}
              >
                <span className="track-list__sequence">{track.sequence}</span>
                <span className="track-list__title">{track.title}</span>
                <span className="track-list__duration">{formatDuration(track.durationSeconds)}</span>
              </button>
              {track.sourceUrl ? (
                <a
                  className="track-list__source"
                  href={track.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  source
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {otherEditions.length > 0 ? (
        <section className="section" aria-labelledby="other-editions">
          <h2 className="section__title" id="other-editions">
            Other editions of this work
          </h2>
          <ul className="plain-list">
            {otherEditions.map((item) => {
              const itemView = viewForEdition(index, item.id);
              if (!itemView) return null;
              const itemState = stateFor(item.id);
              return (
                <li key={item.id} className="plain-list__item plain-list__item--row">
                  <Link to={`/editions/${encodeURIComponent(item.id)}`}>
                    {itemView.narrators.map((narrator) => narrator.name).join(', ') || 'Unknown narrator'}{' '}
                    · {item.language.toUpperCase()} · {rightsLabel(item.rightsStatus)}
                  </Link>
                  <span className="plain-list__meta">
                    {itemState?.positionSeconds ? 'has saved progress' : 'not started'}
                  </span>
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => void player.play(item.id)}
                  >
                    Play
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="section__footnote">
            Each edition keeps its own playback position, bookmarks and favourite status.
          </p>
        </section>
      ) : null}
    </div>
  );
}
