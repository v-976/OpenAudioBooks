import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EditionCard } from '../components/EditionCard';
import { useCatalogue } from '../app/catalogueContext';
import { usePlayer } from '../player/playerContext';
import { useCatalogueLanguageFilter } from '../app/catalogueLanguage';
import { allGenres, searchEditions, type EditionView } from '../domain/search';
import { useI18n } from '../i18n/i18nContext';
import type { LanguageCode } from '../domain/language';
import { normalizeLanguageCode } from '../domain/language';

/**
 * Search / discovery.
 *
 * Facets are explicit so that `narrator + language`, `author + language`,
 * `genre + language` and `source + language` all work, which is a hard
 * requirement for a narrator-centric, multilingual catalogue.
 *
 * The language facet filters on `AudioEdition.narrationLanguage` only. The
 * interface language is never involved.
 */
export function SearchPage() {
  const { index } = useCatalogue();
  const player = usePlayer();
  const { t, languageName } = useI18n();
  const languageFilter = useCatalogueLanguageFilter();
  const [params, setParams] = useSearchParams();

  const text = params.get('q') ?? '';
  const narratorId = params.get('narrator') ?? '';
  const authorId = params.get('author') ?? '';
  const genre = params.get('genre') ?? '';
  const sourceId = params.get('source') ?? '';
  const series = params.get('series') ?? '';

  // The URL may carry a language facet for shareable links. It is applied on top
  // of the stored preference rather than replacing it, so the URL and the
  // preference cannot silently disagree with what the user chose.
  const urlLanguages = useMemo(
    () =>
      (params.get('lang') ?? '')
        .split(',')
        .map((value) => normalizeLanguageCode(value))
        .filter((code): code is LanguageCode => Boolean(code)),
    [params],
  );
  const effectiveLanguages = urlLanguages.length > 0 ? urlLanguages : languageFilter.selected;

  const [textDraft, setTextDraft] = useState(text);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const results = useMemo(
    () =>
      searchEditions(index, {
        ...(text ? { text } : {}),
        ...(narratorId ? { narratorIds: [narratorId] } : {}),
        ...(authorId ? { authorIds: [authorId] } : {}),
        ...(genre ? { genre } : {}),
        ...(sourceId ? { sourceIds: [sourceId] } : {}),
        ...(series ? { series } : {}),
        ...(effectiveLanguages.length > 0 ? { narrationLanguages: effectiveLanguages } : {}),
      }),
    [authorId, effectiveLanguages, genre, index, narratorId, series, sourceId, text],
  );

  const narrators = useMemo(
    () => [...index.catalogue.narrators].sort((a, b) => a.name.localeCompare(b.name)),
    [index],
  );
  const authors = useMemo(
    () => [...index.catalogue.authors].sort((a, b) => a.name.localeCompare(b.name)),
    [index],
  );
  const sources = useMemo(
    () => [...index.catalogue.sources].sort((a, b) => a.name.localeCompare(b.name)),
    [index],
  );
  const seriesNames = useMemo(() => {
    const names = new Set<string>();
    for (const work of index.catalogue.works) {
      if (work.series?.name) names.add(work.series.name);
    }
    return [...names].sort();
  }, [index]);

  const languageOptions = useMemo(() => {
    const known = ['ru', 'en', 'fi'];
    for (const code of languageFilter.available) {
      if (!known.includes(code)) known.push(code);
    }
    return known;
  }, [languageFilter.available]);

  const clearAll = () => {
    setTextDraft('');
    setParams(new URLSearchParams(), { replace: true });
  };

  const hasFilters =
    Boolean(text || narratorId || authorId || genre || sourceId || series || effectiveLanguages.length);

  return (
    <div className="page">
      <h1 className="page__title">{t('search.title')}</h1>

      <form
        className="search-form"
        onSubmit={(event) => {
          event.preventDefault();
          update('q', textDraft.trim());
        }}
        role="search"
      >
        <label className="field">
          <span className="field__label">{t('search.field.text')}</span>
          <input
            className="field__input"
            type="search"
            value={textDraft}
            onChange={(event) => setTextDraft(event.target.value)}
            placeholder={t('search.placeholder')}
          />
        </label>
        <button type="submit" className="button button--primary">
          {t('search.submit')}
        </button>
      </form>

      <div className="filters">
        <label className="field">
          <span className="field__label">{t('search.field.narrator')}</span>
          <select
            className="field__input"
            value={narratorId}
            onChange={(event) => update('narrator', event.target.value)}
          >
            <option value="">{t('search.any.narrator')}</option>
            {narrators.map((narrator) => (
              <option key={narrator.id} value={narrator.id}>
                {narrator.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">{t('search.field.author')}</span>
          <select
            className="field__input"
            value={authorId}
            onChange={(event) => update('author', event.target.value)}
          >
            <option value="">{t('search.any.author')}</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>
                {author.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">{t('search.field.genre')}</span>
          <select
            className="field__input"
            value={genre}
            onChange={(event) => update('genre', event.target.value)}
          >
            <option value="">{t('search.any.genre')}</option>
            {allGenres(index).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">{t('search.field.source')}</span>
          <select
            className="field__input"
            value={sourceId}
            onChange={(event) => update('source', event.target.value)}
          >
            <option value="">{t('search.any.source')}</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">{t('search.field.series')}</span>
          <select
            className="field__input"
            value={series}
            onChange={(event) => update('series', event.target.value)}
          >
            <option value="">{t('search.any.series')}</option>
            {seriesNames.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        {/*
          Language facet. It narrows the existing results without changing the
          stored preference, so a visitor with a link can explore another
          language and the user still owns their default.
        */}
        <label className="field">
          <span className="field__label">{t('search.field.narrationLanguage')}</span>
          <select
            className="field__input"
            value={
              effectiveLanguages.length === 1
                ? effectiveLanguages[0]
                : effectiveLanguages.length === 0
                  ? ''
                  : 'multiple'
            }
            onChange={(event) =>
              update('lang', event.target.value === 'multiple' ? '' : event.target.value)
            }
          >
            <option value="">{t('search.any.narrationLanguage')}</option>
            {effectiveLanguages.length > 1 ? (
              <option value="multiple">{t('search.any.narrationLanguage')}</option>
            ) : null}
            {languageOptions.map((code) => (
              <option key={code} value={code}>
                {languageName(code)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="notice notice--info">{t('search.languageNotice')}</p>

      <div className="results-header">
        <h2 className="section__title">{t('search.resultsCount', undefined, results.length)}</h2>
        {hasFilters ? (
          <button type="button" className="button button--ghost" onClick={clearAll}>
            {t('common.clearFilters')}
          </button>
        ) : null}
      </div>

      {results.length === 0 ? (
        <p className="notice">{t('search.noResults')}</p>
      ) : (
        <div className="list">
          {results.map((view: EditionView) => (
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
    </div>
  );
}
