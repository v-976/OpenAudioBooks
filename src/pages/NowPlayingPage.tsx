import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '../player/playerContext';
import { useUserData } from '../app/userData';
import { useCatalogue } from '../app/catalogueContext';
import { elapsedBeforeTrack, formatDuration } from '../player/playerMachine';
import { findEditionView } from '../domain/search';
import { EditionCard } from '../components/EditionCard';
import { RightsBadge } from '../components/RightsBadge';

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

/** Full transport screen: seek, skip, track list, bookmarks and favourites. */
export function NowPlayingPage() {
  const player = usePlayer();
  const { index } = useCatalogue();
  const { bookmarksFor, addBookmark, removeBookmark, stateFor, toggleFavorite, preferences } =
    useUserData();
  const [noteDraft, setNoteDraft] = useState('');

  const current = player.current;
  const tracks = player.tracks;

  const view = useMemo(
    () => (current ? index.editionsById.get(current.edition.id) : undefined),
    [current, index],
  );
  const work = view ? index.worksById.get(view.workId) : undefined;
  const narrators = view
    ? view.narratorIds
        .map((id) => index.narratorsById.get(id))
        .filter((narrator) => Boolean(narrator))
    : [];
  const source = view ? index.sourcesById.get(view.sourceId) : undefined;
  const state = current ? stateFor(current.edition.id) : undefined;
  const bookmarks = current ? bookmarksFor(current.edition.id) : [];

  if (!current || !view || !work) {
    // Nothing loaded yet. Offer the last thing played, which is the same
    // "Continue listening" promise the rest of the app makes.
    const lastId = preferences.lastAudioEditionId;
    const lastView = lastId ? findEditionView(index, lastId) : undefined;
    const lastState = lastId ? stateFor(lastId) : undefined;

    return (
      <div className="page">
        <h1 className="page__title">Now Playing</h1>
        {lastView ? (
          <section className="section">
            <h2 className="section__title">Continue listening</h2>
            <EditionCard
              view={lastView}
              trailing={
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => void player.play(lastView.edition.id)}
                >
                  Resume
                </button>
              }
            />
            {lastState && lastState.positionSeconds > 0 ? (
              <p className="section__footnote">
                Saved on this device at {formatDuration(lastState.positionSeconds)} into{' '}
                {lastState.trackId}.
              </p>
            ) : null}
          </section>
        ) : null}
        <p className="notice">
          Nothing is loaded. Choose an audio edition from the{' '}
          <Link to="/search">search screen</Link> to start listening.
        </p>
      </div>
    );
  }

  const editionElapsed = elapsedBeforeTrack(tracks, current.track.id) + player.positionSeconds;
  const editionTotal =
    view.durationSeconds ??
    tracks.reduce((sum, track) => sum + (track.durationSeconds ?? 0), 0);

  const onSeekInput = (value: string) => {
    const next = Number(value);
    if (Number.isFinite(next)) player.seekTo(next);
  };

  return (
    <div className="page">
      <h1 className="page__title">{work.title}</h1>
      <p className="page__subtitle">
        {work.authorIds
          .map((id) => index.authorsById.get(id)?.name)
          .filter(Boolean)
          .join(', ')}
      </p>

      <div className="now-playing">
        <p className="now-playing__track">{current.track.title}</p>
        <p className="now-playing__narrators">
          <span className="label">Narrated by</span>{' '}
          {narrators.length > 0
            ? narrators.map((narrator, index_) => (
                <span key={narrator!.id}>
                  {index_ > 0 ? ', ' : ''}
                  <Link to={`/narrators/${encodeURIComponent(narrator!.id)}`}>{narrator!.name}</Link>
                </span>
              ))
            : 'Unknown narrator'}
        </p>

        {player.error ? (
          <p className="notice notice--error" role="alert">
            {player.error}
          </p>
        ) : null}

        <div className="progress">
          <label className="field">
            <span className="field__label">Position</span>
            <input
              className="progress__slider"
              type="range"
              min={0}
              max={Math.max(1, Math.round(player.durationSeconds || 0))}
              step={1}
              value={Math.round(player.positionSeconds)}
              onChange={(event) => onSeekInput(event.target.value)}
              aria-label="Seek within current track"
            />
          </label>
          <p className="progress__times">
            <span>{formatDuration(player.positionSeconds)}</span>
            <span>{formatDuration(player.durationSeconds)}</span>
          </p>
          <p className="progress__edition">
            Edition progress {formatDuration(editionElapsed)} / {formatDuration(editionTotal)} (
            {Math.round(player.editionProgress * 100)}%)
          </p>
        </div>

        <div className="transport" role="group" aria-label="Playback controls">
          <button
            type="button"
            className="button"
            onClick={() => void player.previousTrack()}
            aria-label="Previous track"
          >
            ⏮
          </button>
          <button
            type="button"
            className="button"
            onClick={() => player.skipBackward()}
            aria-label={`Skip back ${player.skipSeconds.backward} seconds`}
          >
            ↺
          </button>
          <button
            type="button"
            className="button button--primary button--large"
            onClick={() => void player.toggle()}
            aria-label={player.playing ? 'Pause' : 'Play'}
          >
            {player.playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button
            type="button"
            className="button"
            onClick={() => player.skipForward()}
            aria-label={`Skip forward ${player.skipSeconds.forward} seconds`}
          >
            ↻
          </button>
          <button
            type="button"
            className="button"
            onClick={() => void player.nextTrack()}
            aria-label="Next track"
          >
            ⏭
          </button>
        </div>

        <div className="transport__extras">
          <label className="field field--inline">
            <span className="field__label">Speed</span>
            <select
              className="field__input"
              value={player.playbackRate}
              onChange={(event) => void player.setPlaybackRate(Number(event.target.value))}
            >
              {RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}×
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="button"
            onClick={() =>
              void addBookmark({
                audioEditionId: current.edition.id,
                trackId: current.track.id,
                positionSeconds: player.positionSeconds,
                ...(noteDraft.trim() ? { note: noteDraft.trim() } : {}),
              })
            }
          >
            Bookmark here
          </button>

          <button
            type="button"
            className="button"
            onClick={() => void toggleFavorite(current.edition.id)}
          >
            {state?.favorite ? '★ Favourited' : '☆ Favourite'}
          </button>
        </div>

        <div className="now-playing__legal">
          <RightsBadge status={view.rightsStatus} />
          {view.licenseName ? <span> {view.licenseName}</span> : null}
          {source ? (
            <p className="now-playing__source">
              Source:{' '}
              <Link to={`/sources/${encodeURIComponent(source.id)}`}>{source.name}</Link>
              {view.sourceUrl ? (
                <>
                  {' · '}
                  <a href={view.sourceUrl} target="_blank" rel="noreferrer noopener">
                    Original page
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
          {source?.attribution ? (
            <p className="now-playing__attribution">{source.attribution}</p>
          ) : null}
        </div>
      </div>

      <section className="section" aria-labelledby="tracks-heading">
        <h2 className="section__title" id="tracks-heading">
          Tracks
        </h2>
        <ol className="track-list">
          {tracks.map((track) => {
            const active = track.id === current.track.id;
            return (
              <li key={track.id} className={active ? 'track-list__item track-list__item--active' : 'track-list__item'}>
                <button
                  type="button"
                  className="track-list__button"
                  onClick={() => void player.selectTrack(track.id)}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className="track-list__sequence">{track.sequence}</span>
                  <span className="track-list__title">{track.title}</span>
                  <span className="track-list__duration">
                    {formatDuration(track.durationSeconds)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="section" aria-labelledby="bookmarks-heading">
        <h2 className="section__title" id="bookmarks-heading">
          Bookmarks
        </h2>
        <label className="field">
          <span className="field__label">Note for next bookmark (optional)</span>
          <input
            className="field__input"
            type="text"
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            maxLength={280}
          />
        </label>
        {bookmarks.length === 0 ? (
          <p className="notice">No bookmarks yet for this audio edition.</p>
        ) : (
          <ul className="plain-list">
            {bookmarks.map((bookmark) => (
              <li key={bookmark.id} className="plain-list__item plain-list__item--row">
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => void player.selectTrack(bookmark.trackId)}
                >
                  {formatDuration(bookmark.positionSeconds)}
                </button>
                <span className="plain-list__meta">
                  {bookmark.note ?? 'No note'} · {bookmark.createdAt.slice(0, 10)}
                </span>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => void removeBookmark(bookmark.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
