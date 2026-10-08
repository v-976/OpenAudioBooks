import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EditionCard } from '../components/EditionCard';
import { useCatalogue } from '../app/catalogueContext';
import { useUserData } from '../app/userData';
import { usePlayer } from '../player/playerContext';
import { findEditionView, type EditionView } from '../domain/search';
import { useI18n } from '../i18n/i18nContext';
import { APP_VERSION } from '../version';
import type { TranslationKey } from '../i18n/keys';

type Tab = 'continue' | 'favorites' | 'finished';

const TABS: { value: Tab; labelKey: TranslationKey }[] = [
  { value: 'continue', labelKey: 'myBooks.tab.continue' },
  { value: 'favorites', labelKey: 'myBooks.tab.favorites' },
  { value: 'finished', labelKey: 'myBooks.tab.finished' },
];

/**
 * Personal, local-only library: progress, favourites and completed editions.
 *
 * Deliberately NOT filtered by the audiobook-language preference. This screen
 * lists what the user actually listened to; hiding a book because they later
 * changed a catalogue filter would silently lose their own history. Language
 * filtering belongs to catalogue browsing, not to personal state.
 */
export function MyBooksPage() {
  const { index } = useCatalogue();
  const { continueListening, favorites, completed, stateFor, clearAll, ready } = useUserData();
  const player = usePlayer();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('continue');

  const ids = useMemo(
    () => (tab === 'continue' ? continueListening() : tab === 'favorites' ? favorites() : completed()),
    [completed, continueListening, favorites, tab],
  );

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
      <h1 className="page__title">{t('myBooks.title')}</h1>
      <p className="page__subtitle">{t('myBooks.description')}</p>

      <div className="tabs" role="tablist" aria-label={t('myBooks.title')}>
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            className={tab === item.value ? 'tab tab--active' : 'tab'}
            onClick={() => setTab(item.value)}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      {!ready ? (
        <p className="notice">{t('myBooks.loading')}</p>
      ) : views.length === 0 ? (
        <p className="notice">
          {t('myBooks.empty', { search: t('nav.search') })}{' '}
          <Link to="/search">{t('nav.search')}</Link>
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
                      {percent > 0 ? t('myBooks.resume') : t('myBooks.play')}
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
          {t('myBooks.localData')}
        </h2>
        <p className="notice">
          {t('myBooks.localDataBody', { database: 'openaudiobooks' })}
        </p>
        <button
          type="button"
          className="button button--danger"
          onClick={() => {
            if (globalThis.confirm?.(t('myBooks.deleteConfirm'))) {
              void clearAll();
            }
          }}
        >
          {t('myBooks.deleteAllData')}
        </button>
        <p className="section__footnote">{t('myBooks.footer', { version: APP_VERSION })}</p>
      </section>
    </div>
  );
}
