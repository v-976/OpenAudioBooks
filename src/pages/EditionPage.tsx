import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCatalogue } from '../app/catalogueContext';
import { usePlayer } from '../player/playerContext';
import { useUserData } from '../app/userData';
import { useResumeTarget } from '../player/useResumeTarget';
import { editionDurationForQuery, viewForEdition } from '../domain/search';
import { DurationLabel } from '../components/DurationLabel';
import { formatDuration } from '../player/playerMachine';
import { RightsBadge } from '../components/RightsBadge';
import { rightsKey } from '../domain/rights';
import { useI18n } from '../i18n/i18nContext';
import { NotFound } from './NotFound';

/**
 * Audio edition detail.
 *
 * This is the level playback state belongs to: two editions of the same work
 * keep entirely separate positions, bookmarks and favourites. The narration
 * language is shown alongside the work's original language precisely so the two
 * are never confused.
 */
export function EditionPage() {
  const { editionId = '' } = useParams();
  const { index } = useCatalogue();
  const player = usePlayer();
  const { stateFor } = useUserData();
  const { t, languageName, narrationLanguageName } = useI18n();
  const decoded = decodeURIComponent(editionId);

  const view = useMemo(() => viewForEdition(index, decoded), [decoded, index]);
  const resume = useResumeTarget(decoded);
  const state = stateFor(decoded);

  if (!view) {
    return <NotFound title={t('edition.notFound')} body={t('edition.notFoundBody')} />;
  }

  const { edition, work, authors, narrators, source, tracks } = view;
  const otherEditions = (index.editionsByWorkId.get(work.id) ?? []).filter(
    (item) => item.id !== edition.id,
  );

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link to="/">{t('nav.library')}</Link>{' '}
        <Link to={`/works/${encodeURIComponent(work.id)}`}>{work.title}</Link>
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

      <dl className="detail-list">
        <dt>{t('common.narrator')}</dt>
        <dd>
          {narrators.length > 0
            ? narrators.map((narrator, position) => (
                <span key={narrator.id}>
                  {position > 0 ? ', ' : ''}
                  <Link to={`/narrators/${encodeURIComponent(narrator.id)}`}>{narrator.name}</Link>
                </span>
              ))
            : t('common.unnamedNarrator')}
        </dd>

        <dt>{t('search.field.narrationLanguage')}</dt>
        <dd>{narrationLanguageName(edition.narrationLanguage)}</dd>

        <dt>{t('common.originalLanguage')}</dt>
        <dd>{work.originalLanguage ? languageName(work.originalLanguage) : t('common.notSpecified')}</dd>

        <dt>{t('common.duration')}</dt>
        <dd>
          {/*
            An unknown total is stated as unknown rather than shown as 0:00, and a
            summed figure is marked as an estimate so it never looks as precise as
            a source-reported one.
          */}
          <DurationLabel
            seconds={editionDurationForQuery(view)}
            origin={view.edition.durationOrigin}
            showLabel={false}
          />
        </dd>

        <dt>{t('common.release')}</dt>
        <dd>
          {[edition.releaseYear, edition.publisher].filter(Boolean).join(' · ') ||
            t('common.notSpecified')}
        </dd>

        <dt>{t('common.source')}</dt>
        <dd>
          {source ? (
            <>
              <Link to={`/sources/${encodeURIComponent(source.id)}`}>{source.name}</Link>
              {edition.sourceUrl ? (
                <>
                  {' · '}
                  <a href={edition.sourceUrl} target="_blank" rel="noreferrer noopener">
                    {t('common.originalSource')}
                  </a>
                </>
              ) : null}
            </>
          ) : (
            t('common.unknown')
          )}
        </dd>

        <dt>{t('common.rights')}</dt>
        <dd>
          <RightsBadge status={edition.rightsStatus} />
          {edition.licenseName ? <span> {edition.licenseName}</span> : null}
          {edition.licenseUrl ? (
            <>
              {' · '}
              <a href={edition.licenseUrl} target="_blank" rel="noreferrer noopener">
                {t('rights.creativeCommons')}
              </a>
            </>
          ) : null}
          {edition.rightsStatus === 'unknown' ? (
            <p className="notice notice--warning">{t('edition.rightsUnknownWarning')}</p>
          ) : null}
        </dd>

        {source?.attribution ? (
          <>
            <dt>{t('common.attribution')}</dt>
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
          {t('edition.playFromStart')}
        </button>
        {resume && state && state.positionSeconds > 0 ? (
          <button
            type="button"
            className="button button--large"
            onClick={() => void player.play(edition.id, resume.trackId, resume.offsetSeconds)}
          >
            {t('edition.resumeAt', { time: formatDuration(resume.offsetSeconds) })}
          </button>
        ) : null}
      </div>

      {state ? (
        <p className="page__meta">
          {t('edition.lastPlayed', { date: state.lastPlayedAt.slice(0, 16).replace('T', ' ') })} ·{' '}
          {state.completed
            ? t('edition.state.finished')
            : t('edition.state.inProgress')}{' '}
          ·{' '}
          {state.favorite
            ? t('edition.state.favorite')
            : t('edition.state.notFavorite')}
        </p>
      ) : (
        <p className="page__meta">{t('edition.notStarted')}</p>
      )}

      {work.description ? (
        <section className="section">
          <h2 className="section__title">{t('work.about')}</h2>
          <p className="prose">{work.description}</p>
        </section>
      ) : null}

      <section className="section" aria-labelledby="edition-tracks">
        <h2 className="section__title" id="edition-tracks">
          {t('common.tracks')} ({tracks.length})
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
                <span className="track-list__duration">
                  {formatDuration(track.durationSeconds)}
                </span>
              </button>
              {track.sourceUrl ? (
                <a
                  className="track-list__source"
                  href={track.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {t('common.source')}
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {otherEditions.length > 0 ? (
        <section className="section" aria-labelledby="other-editions">
          <h2 className="section__title" id="other-editions">
            {t('edition.otherEditions')}
          </h2>
          <ul className="plain-list">
            {otherEditions.map((item) => {
              const itemView = viewForEdition(index, item.id);
              if (!itemView) return null;
              const itemState = stateFor(item.id);
              return (
                <li key={item.id} className="plain-list__item plain-list__item--row">
                  <Link to={`/editions/${encodeURIComponent(item.id)}`}>
                    {itemView.narrators.map((narrator) => narrator.name).join(', ') ||
                      t('common.unnamedNarrator')}
                    {' · '}
                    {narrationLanguageName(edition.narrationLanguage)} · {t(rightsKey(item.rightsStatus))}
                  </Link>
                  <span className="plain-list__meta">
                    {itemState?.positionSeconds
                      ? t('edition.hasSavedProgress')
                      : t('edition.notStartedYet')}
                  </span>
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => void player.play(item.id)}
                  >
                    {t('player.play')}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="section__footnote">{t('edition.otherEditionsNote')}</p>
        </section>
      ) : null}
    </div>
  );
}
