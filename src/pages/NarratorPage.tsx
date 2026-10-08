import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EditionCard } from '../components/EditionCard';
import { useCatalogue } from '../app/catalogueContext';
import { usePlayer } from '../player/playerContext';
import { editionsForNarrator, type EditionView } from '../domain/search';
import { useFilteredEditions } from '../app/catalogueLanguage';
import { useI18n } from '../i18n/i18nContext';
import { NotFound } from './NotFound';

/**
 * Narrator detail.
 *
 * A narrator is a first-class entity: this page lists every audio edition they
 * narrated, across works, sources and languages, which is the discovery path the
 * domain model is built around.
 *
 * The listing is filtered by the user's audiobook-language preference. A narrator
 * who performed in several languages therefore appears in fewer editions for a
 * Russian-only listener than for a multilingual one, which is the intended
 * behaviour and is surfaced through the count in the stats line.
 */
export function NarratorPage() {
  const { narratorId = '' } = useParams();
  const { index } = useCatalogue();
  const player = usePlayer();
  const { t, languageName } = useI18n();

  const narrator = index.narratorsById.get(decodeURIComponent(narratorId));
  const filters = useMemo(
    () => ({ narratorIds: narrator ? [narrator.id] : [] }),
    [narrator],
  );
  const editions = useFilteredEditions(filters);
  const distinctWorks = useMemo(() => new Set(editions.map((view) => view.work.id)).size, [
    editions,
  ]);
  const sources = useMemo(
    () => [...new Set(editions.map((view) => view.edition.sourceId))],
    [editions],
  );
  const languages = useMemo(
    () => [...new Set(editions.map((view) => view.edition.narrationLanguage))],
    [editions],
  );

  if (!narrator) {
    return (
      <NotFound title={t('narrator.notFound')} body={t('narrator.notFoundBody')} />
    );
  }

  const allEditionIds = editionsForNarrator(index, narrator.id).map((edition) => edition.id);
  const filteredOut = allEditionIds.length - editions.length;

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link to="/">{t('nav.library')}</Link>{' '}
        <Link to="/browse/narrators">{t('browse.narrators.title')}</Link>
      </nav>

      <h1 className="page__title">{narrator.name}</h1>

      {narrator.aliases.length > 0 ? (
        <p className="page__subtitle">
          {t('common.alsoKnownAs')} {narrator.aliases.join(' · ')}
        </p>
      ) : null}

      {narrator.biography ? <p className="prose">{narrator.biography}</p> : null}

      <p className="stats">
        {[
          t('count.audioEditions', undefined, editions.length),
          t('count.works', undefined, distinctWorks),
          t('count.sources', undefined, sources.length),
        ].join(' · ')}
      </p>
      {languages.length > 0 ? (
        <p className="stats">
          <span className="page__meta-label">{t('search.field.narrationLanguage')}: </span>
          <span className="page__meta-value">
            {languages.map((code) => languageName(code)).join(', ')}
          </span>
        </p>
      ) : null}

      <section className="section" aria-labelledby="narrator-editions">
        <h2 className="section__title" id="narrator-editions">
          {t('narrator.pageTitle', { name: narrator.name })}
        </h2>
        {editions.length === 0 ? (
          <p className="notice">{t('narrator.noEditions')}</p>
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
        {filteredOut > 0 ? (
          <p className="section__footnote">
            {t('narrator.filteredNote', { count: filteredOut })}
          </p>
        ) : null}
      </section>

      <section className="section">
        <h2 className="section__title">{t('common.identifier')}</h2>
        <p className="mono">{narrator.id}</p>
        <p className="section__footnote">
          {t('browse.editionCount', undefined, allEditionIds.length)}
        </p>
      </section>
    </div>
  );
}
