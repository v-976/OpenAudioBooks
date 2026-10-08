import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '../player/playerContext';
import { useUserData } from '../app/userData';
import { useCatalogue } from '../app/catalogueContext';
import { elapsedBeforeTrack, formatDuration } from '../player/playerMachine';
import { findEditionView } from '../domain/search';
import { EditionCard } from '../components/EditionCard';
import { RightsBadge } from '../components/RightsBadge';
import { useI18n } from '../i18n/i18nContext';
import type { TranslationKey } from '../i18n/keys';

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

/** Full transport screen: seek, skip, track list, bookmarks and favourites. */
export function NowPlayingPage() {
  const player = usePlayer();
  const { index } = useCatalogue();
  const { bookmarksFor, addBookmark, removeBookmark, stateFor, toggleFavorite, preferences, continueListening } =
    useUserData();
  const { t, languageName } = useI18n();
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
    // "Continue listening" promise the rest of the app makes. The pointer in
    // preferences is only a shortcut: if it is missing or stale, fall back to the
    // most recently played edition from the local store.
    const lastId = preferences.lastAudioEditionId ?? continueListening()[0];
    const lastView = lastId ? findEditionView(index, lastId) : undefined;
    const lastState = lastId ? stateFor(lastId) : undefined;
    const lastTrackTitle = lastState?.trackId
      ? index.tracksByEditionId.get(lastId ?? '')?.find((track) => track.id === lastState.trackId)
          ?.title
      : undefined;

    return (
      <div className="page">
        <h1 className="page__title">{t('player.emptyTitle')}</h1>
        {lastView ? (
          <section className="section">
            <h2 className="section__title">{t('library.continueListening')}</h2>
            <EditionCard
              view={lastView}
              trailing={
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => void player.play(lastView.edition.id)}
                >
                  {t('edition.resumeAt', { time: formatDuration(lastState?.positionSeconds ?? 0) })}                </button>
              }
            />
            {lastState && lastState.positionSeconds > 0 ? (
              <p className="section__footnote">
                {t('player.resumeSavedNote', {
                  time: formatDuration(lastState.positionSeconds),
                  track: lastTrackTitle ?? lastState.trackId,
                })}
              </p>
            ) : null}
          </section>
        ) : null}
        <p className="notice">
          {t('player.emptyBody', { search: t('nav.search') })}{' '}
          <Link to="/search">{t('nav.search')}</Link>
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

  const playPauseKey: TranslationKey = player.playing ? 'player.pause' : 'player.play';

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
          <span className="label">{t('common.narratedBy')} </span>
          {narrators.length > 0
            ? narrators.map((narrator, position) => (
                <span key={narrator!.id}>
                  {position > 0 ? ', ' : ''}
                  <Link to={`/narrators/${encodeURIComponent(narrator!.id)}`}>{narrator!.name}</Link>
                </span>
              ))
            : t('common.unnamedNarrator')}
        </p>
        <p className="now-playing__language">
          <span className="label">{t('search.field.narrationLanguage')}: </span>
          {languageName(current.edition.narrationLanguage)}
        </p>

        {player.error ? (
          <p className="notice notice--error" role="alert">
            {player.error}
          </p>
        ) : null}

        <div className="progress">
          <label className="field">
            <span className="field__label">{t('player.position')}</span>
            <input
              className="progress__slider"
              type="range"
              min={0}
              max={Math.max(1, Math.round(player.durationSeconds || 0))}
              step={1}
              value={Math.round(player.positionSeconds)}
              onChange={(event) => onSeekInput(event.target.value)}
              aria-label={t('player.seekWithinTrack')}
            />
          </label>
          <p className="progress__times">
            <span>{formatDuration(player.positionSeconds)}</span>
            <span>{formatDuration(player.durationSeconds)}</span>
          </p>
          <p className="progress__edition">
            {t('player.editionProgress', {
              current: formatDuration(editionElapsed),
              total: formatDuration(editionTotal),
              percent: Math.round(player.editionProgress * 100),
            })}
          </p>
        </div>

        <div className="transport" role="group" aria-label={t('player.play')}>
          <button
            type="button"
            className="button"
            onClick={() => void player.previousTrack()}
            aria-label={t('player.previousTrack')}
          >
            ⏮
          </button>
          <button
            type="button"
            className="button"
            onClick={() => player.skipBackward()}
            aria-label={t('player.skipBack', { seconds: player.skipSeconds.backward })}
          >
            ↺
          </button>
          <button
            type="button"
            className="button button--primary button--large"
            onClick={() => void player.toggle()}
            aria-label={t(playPauseKey)}
          >
            {player.playing ? `❚❚ ${t('player.pause')}` : `▶ ${t('player.play')}`}
          </button>
          <button
            type="button"
            className="button"
            onClick={() => player.skipForward()}
            aria-label={t('player.skipForward', { seconds: player.skipSeconds.forward })}
          >
            ↻
          </button>
          <button
            type="button"
            className="button"
            onClick={() => void player.nextTrack()}
            aria-label={t('player.nextTrack')}
          >
            ⏭
          </button>
        </div>

        <div className="transport__extras">
          <label className="field field--inline">
            <span className="field__label">{t('player.speed')}</span>
            <select
              className="field__input"
              value={player.playbackRate}
              aria-label={t('player.speed')}
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
            {t('player.bookmarkHere')}
          </button>

          <button
            type="button"
            className="button"
            onClick={() => void toggleFavorite(current.edition.id)}
          >
            {state?.favorite
              ? `★ ${t('player.favoriteRemove')}`
              : `☆ ${t('player.favoriteAdd')}`}
          </button>
        </div>

        <div className="now-playing__legal">
          <RightsBadge status={view.rightsStatus} />
          {view.licenseName ? <span> {view.licenseName}</span> : null}
          {source ? (
            <p className="now-playing__source">
              {t('common.source')}:{' '}
              <Link to={`/sources/${encodeURIComponent(source.id)}`}>{source.name}</Link>
              {view.sourceUrl ? (
                <>
                  {' · '}
                  <a href={view.sourceUrl} target="_blank" rel="noreferrer noopener">
                    {t('common.originalSource')}
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
          {t('common.tracks')}
        </h2>
        <ol className="track-list">
          {tracks.map((track) => {
            const active = track.id === current.track.id;
            return (
              <li
                key={track.id}
                className={
                  active ? 'track-list__item track-list__item--active' : 'track-list__item'
                }
              >
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
          {t('bookmarks.title')}
        </h2>
        <label className="field">
          <span className="field__label">{t('bookmarks.noteLabel')}</span>
          <input
            className="field__input"
            type="text"
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            maxLength={280}
          />
        </label>
        {bookmarks.length === 0 ? (
          <p className="notice">{t('bookmarks.empty')}</p>
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
                  {bookmark.note ?? t('bookmarks.noNote')} · {bookmark.createdAt.slice(0, 10)}
                </span>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => void removeBookmark(bookmark.id)}
                >
                  {t('bookmarks.remove')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
