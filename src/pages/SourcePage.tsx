import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EditionCard } from '../components/EditionCard';
import { useCatalogue } from '../app/catalogueContext';
import { usePlayer } from '../player/playerContext';
import { type EditionView } from '../domain/search';
import { useFilteredEditions } from '../app/catalogueLanguage';
import { RightsBadge } from '../components/RightsBadge';
import { useI18n } from '../i18n/i18nContext';
import { NotFound } from './NotFound';

/** Source detail: attribution, rights, availability and everything it provides. */
export function SourcePage() {
  const { sourceId = '' } = useParams();
  const { index } = useCatalogue();
  const player = usePlayer();
  const { t } = useI18n();

  const source = index.sourcesById.get(decodeURIComponent(sourceId));
  const filters = useMemo(() => ({ sourceIds: source ? [source.id] : [] }), [source]);
  const editions = useFilteredEditions(filters);
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
    return <NotFound title={t('source.notFound')} body={t('source.notFoundBody')} />;
  }

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link to="/">{t('nav.library')}</Link>{' '}
        <Link to="/browse/sources">{t('browse.sources.title')}</Link>
      </nav>

      <h1 className="page__title">{source.name}</h1>
      <p className="page__subtitle">
        <a href={source.sourceUrl} target="_blank" rel="noreferrer noopener">
          {source.sourceUrl}
        </a>
      </p>

      <dl className="detail-list">
        <dt>{t('common.type')}</dt>
        <dd>{source.sourceType}</dd>

        <dt>{t('source.rightsStatus')}</dt>
        <dd>
          <RightsBadge status={source.rightsStatus} />
          {source.licenseName ? <span> {source.licenseName}</span> : null}
          {source.licenseUrl ? (
            <>
              {' · '}
              <a href={source.licenseUrl} target="_blank" rel="noreferrer noopener">
                {source.licenseUrl}
              </a>
            </>
          ) : null}
        </dd>

        {source.attribution ? (
          <>
            <dt>{t('common.attribution')}</dt>
            <dd>{source.attribution}</dd>
          </>
        ) : null}

        {source.availabilityNotes ? (
          <>
            <dt>{t('common.availability')}</dt>
            <dd>{source.availabilityNotes}</dd>
          </>
        ) : null}

        <dt>{t('common.identifier')}</dt>
        <dd className="mono">{source.id}</dd>
      </dl>

      {source.rightsStatus === 'unknown' ? (
        <p className="notice notice--warning">{t('source.rightsUnknownWarning')}</p>
      ) : null}

      <section className="section" aria-labelledby="source-narrators">
        <h2 className="section__title" id="source-narrators">
          {t('source.narratorsCount', undefined, narrators.length)}
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
          {t('work.editionsCount', undefined, editions.length)}
        </h2>
        {editions.length === 0 ? (
          <p className="notice">{t('search.noResults')}</p>
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
                    {t('player.play')}
                  </button>
                }
              />
            ))}
          </div>
        )}
        <p className="section__footnote">{t('source.perEditionRightsNote')}</p>
      </section>
    </div>
  );
}
