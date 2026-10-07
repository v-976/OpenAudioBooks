import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EditionCard } from '../components/EditionCard';
import { useCatalogue } from '../app/catalogueContext';
import { useUserData } from '../app/userData';
import { usePlayer } from '../player/playerContext';
import { findEditionView, type EditionView } from '../domain/search';
import { APP_VERSION } from '../version';

type Tab = 'continue' | 'favorites' | 'finished';

/** Personal, local-only library: progress, favourites and completed editions. */
export function MyBooksPage() {
  const { index } = useCatalogue();
  const { continueListening, favorites, completed, stateFor, clearAll, ready } = useUserData();
  const player = usePlayer();
  const [tab, setTab] = useState<Tab>('continue');

  const ids = tab === 'continue' ? continueListening() : tab === 'favorites' ? favorites() : completed();

  const views = useMemo(
    () =>
      ids
        .map((id) => findEditionView(index, id))
        .filter((view): view is EditionView => Boolean(view)),
    [ids, index],
  );

  const progressOf = (editionId: string) => {
    const state = stateFor(editionId);
    // A completed edition is 100% by definition; its stored position has been
    // rewound to zero so that resuming starts the book again.
    if (state?.completed) return 1;
    const tracks = index.tracksByEditionId.get(editionId) ?? [];
    const total = tracks.reduce((sum, track) => sum + (track.durationSeconds ?? 0), 0);
    const currentTrackIndex = tracks.findIndex((track) => track.id === state?.trackId);
    const before = tracks
      .slice(0, Math.max(0, currentTrackIndex))
      .reduce((sum, track) => sum + (track.durationSeconds ?? 0), 0);
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, (before + (state?.positionSeconds ?? 0)) / total));
  };

  return (
    <div className="page">
      <h1 className="page__title">My Books</h1>
      <p className="page__subtitle">
        Stored only on this device. OpenAudioBooks has no account system and never uploads your
        listening data.
      </p>

      <div className="tabs" role="tablist" aria-label="My Books sections">
        {(
          [
            ['continue', 'Continue listening'],
            ['favorites', 'Favourites'],
            ['finished', 'Finished'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={tab === value ? 'tab tab--active' : 'tab'}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {!ready ? (
        <p className="notice">Reading local storage…</p>
      ) : views.length === 0 ? (
        <p className="notice">
          Nothing here yet. Start something from the <Link to="/search">search screen</Link>.
        </p>
      ) : (
        <div className="list">
          {views.map((view) => {
            const percent = Math.round(progressOf(view.edition.id) * 100);
            return (
              <EditionCard
                key={view.edition.id}
                view={view}
                trailing={
                  <div className="card__actions">
                    <div className="progress progress--inline">
                      <div className="progress__bar" aria-hidden="true">
                        <div className="progress__fill" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="progress__label">{percent}%</span>
                    </div>
                    <button
                      type="button"
                      className="button button--primary"
                      onClick={() => void player.play(view.edition.id)}
                    >
                      {percent > 0 ? 'Resume' : 'Play'}
                    </button>
                  </div>
                }
              />
            );
          })}
        </div>
      )}

      <section className="section" aria-labelledby="privacy-heading">
        <h2 className="section__title" id="privacy-heading">
          Local data
        </h2>
        <p className="notice">
          Playback positions, favourites, bookmarks and history are stored in this browser's
          IndexedDB under <code>openaudiobooks</code>. Nothing is sent anywhere. Clearing your
          browser data, or using the button below, removes it permanently.
        </p>
        <button
          type="button"
          className="button button--danger"
          onClick={() => {
            if (globalThis.confirm?.('Delete all local OpenAudioBooks data on this device?')) {
              void clearAll();
            }
          }}
        >
          Delete all local data
        </button>
        <p className="section__footnote">OpenAudioBooks {APP_VERSION} · alpha development build</p>
      </section>
    </div>
  );
}
