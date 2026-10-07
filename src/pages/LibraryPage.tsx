import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EditionCard } from '../components/EditionCard';
import { useCatalogue } from '../app/catalogueContext';
import { useUserData } from '../app/userData';
import { usePlayer } from '../player/playerContext';
import { findEditionView, searchEditions, type EditionView } from '../domain/search';
import { APP_VERSION, APP_STATUS } from '../version';

/**
 * Library / Home.
 *
 * Surfaces development-data warnings, the latest source adapters and a
 * continue-listening entry point. Narrators are browsable from here because
 * narrator browsing is a primary, not secondary, discovery path.
 */
export function LibraryPage() {
  const { index, adapters, isDevelopmentData } = useCatalogue();
  const { continueListening, ready } = useUserData();
  const player = usePlayer();

  const recentViews = useMemo(
    () =>
      continueListening()
        .slice(0, 4)
        .map((id) => findEditionView(index, id))
        .filter((view): view is EditionView => Boolean(view)),
    [continueListening, index],
  );

  const narrators = useMemo(
    () => [...index.catalogue.narrators].sort((a, b) => a.name.localeCompare(b.name)),
    [index],
  );

  const sampleEditions = useMemo(
    () => searchEditions(index, {}).slice(0, 6),
    [index],
  );

  return (
    <div className="page">
      <section className="hero">
        <h1 className="hero__title">Free audiobooks, played from their sources</h1>
        <p className="hero__text">
          OpenAudioBooks catalogues audiobooks that are legally available to listen to for free.
          It does not host audiobook files: audio is streamed from the source that provides it.
        </p>
        <p className="hero__version">
          Version {APP_VERSION} · {APP_STATUS}
        </p>
      </section>

      {isDevelopmentData ? (
        <p className="notice notice--warning" role="status">
          <strong>Development data.</strong> This build is showing bundled mock catalogue
          entries marked as fixtures. Narrators, titles and sources here are fictional, and the
          audio is a generated test tone. Nothing in this list is real audiobook content.
        </p>
      ) : null}

      {ready && recentViews.length > 0 ? (
        <section className="section" aria-labelledby="continue-heading">
          <h2 className="section__title" id="continue-heading">
            Continue listening
          </h2>
          <div className="list">
            {recentViews.map((view) => (
              <EditionCard
                key={view.edition.id}
                view={view}
                trailing={
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => void player.play(view.edition.id)}
                  >
                    Resume
                  </button>
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section" aria-labelledby="catalogue-heading">
        <h2 className="section__title" id="catalogue-heading">
          In the catalogue
        </h2>
        <div className="list">
          {sampleEditions.map((view) => (
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
          <Link to="/search">Search the full catalogue</Link>
        </p>
      </section>

      <section className="section" aria-labelledby="narrators-heading">
        <h2 className="section__title" id="narrators-heading">
          Browse by narrator
        </h2>
        <ul className="chip-list">
          {narrators.map((narrator) => (
            <li key={narrator.id}>
              <Link className="chip" to={`/narrators/${encodeURIComponent(narrator.id)}`}>
                {narrator.name}
                <span className="chip__count">
                  {(index.editionsByNarratorId.get(narrator.id) ?? []).length}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="sources-heading">
        <h2 className="section__title" id="sources-heading">
          Source adapters
        </h2>
        <ul className="plain-list">
          {adapters.map((adapter) => (
            <li key={adapter.id} className="plain-list__item">
              <strong>{adapter.displayName}</strong>
              <span className="plain-list__meta">
                {adapter.isDevelopmentData ? 'bundled development data' : 'provider adapter'} ·
                rights: {adapter.source.rightsStatus}
              </span>
            </li>
          ))}
        </ul>
        <p className="section__footnote">
          <Link to="/sources">All sources</Link>
        </p>
      </section>
    </div>
  );
}
