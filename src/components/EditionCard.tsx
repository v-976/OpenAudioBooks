import { Link } from 'react-router-dom';
import type { EditionView } from '../domain/search';
import { useI18n } from '../i18n/i18nContext';
import { RightsBadge } from './RightsBadge';

/**
 * Compact card used in lists of audio editions.
 *
 * The narration language is always shown: it is the attribute the user filters
 * the catalogue by, and hiding it would make a filtered list ambiguous.
 */
export function EditionCard({
  view,
  trailing,
}: {
  view: EditionView;
  trailing?: React.ReactNode;
}) {
  const { t, languageName } = useI18n();
  const { edition, work, authors, narrators, source } = view;

  return (
    <article className="card">
      <div className="card__body">
        <h3 className="card__title">
          <Link to={`/editions/${encodeURIComponent(edition.id)}`}>{work.title}</Link>
        </h3>
        <p className="card__meta">
          {authors.length > 0
            ? authors.map((author) => author.name).join(', ')
            : t('common.author') + ': ' + t('common.unknown')}
        </p>
        <p className="card__meta card__meta--narrators">
          <span className="label">{t('common.narratedBy')} </span>
          {narrators.length > 0
            ? narrators.map((narrator, position) => (
                <span key={narrator.id}>
                  {position > 0 ? ', ' : ''}
                  <Link to={`/narrators/${encodeURIComponent(narrator.id)}`}>{narrator.name}</Link>
                </span>
              ))
            : t('common.unnamedNarrator')}
        </p>
        <p className="card__meta">
          <span className="label">{t('common.source')} </span>
          {source ? (
            <Link to={`/sources/${encodeURIComponent(source.id)}`}>{source.name}</Link>
          ) : (
            t('common.unknown')
          )}
        </p>
        <div className="card__tags">
          <span className="badge badge--language">
            {t('common.language')}: {languageName(edition.narrationLanguage)}
          </span>
          <RightsBadge status={edition.rightsStatus} />
          {edition.releaseYear ? <span className="badge">{edition.releaseYear}</span> : null}
          {work.series ? (
            <span className="badge">
              {work.series.name}
              {work.series.position
                ? ' · ' + t('common.bookInSeries', { position: work.series.position })
                : ''}
            </span>
          ) : null}
        </div>
      </div>
      {trailing ? <div className="card__footer">{trailing}</div> : null}
    </article>
  );
}
