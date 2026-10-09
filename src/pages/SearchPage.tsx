import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EditionCard } from '../components/EditionCard';
import { DurationFilter, DurationSort } from '../components/DurationFilter';
import { useCatalogue } from '../app/catalogueContext';
import { useUserData } from '../app/userData';
import { usePlayer } from '../player/playerContext';
import { useCatalogueLanguageFilter } from '../app/catalogueLanguage';
import { allGenres, searchEditions, type EditionSort, type EditionView } from '../domain/search';
import { MINUTE, rangeFromMinutes } from '../domain/durationPresets';
import { useI18n } from '../i18n/i18nContext';
import { normalizeLanguageCode, type LanguageCode } from '../domain/language';

/**
 * Search / discovery.
 *
 * Facets are explicit so that `narrator + language`, `author + language`,
 * `genre + language`, `source + language` and every one of those combined with a
 * duration range all work without special-casing.
 *
 * The language facet filters on `AudioEdition.narrationLanguage` only. The
 * interface language is never involved.
 *
 * The duration range and sort live in the URL so a filtered view is shareable,
 * while the sort preference is ALSO stored locally so it is restored on the next
 * launch. The URL wins when both are present.
 */
export function SearchPage() {
  const { index, providerState, isDevelopmentData } = useCatalogue();
  const player = usePlayer();
  const { t, languageName } = useI18n();
  const languageFilter = useCatalogueLanguageFilter();
  const { preferences, updatePreferences } = useUserData();
  const [params, setParams] = useSearchParams();

  const text = params.get('q') ?? '';
  const narratorId = params.get('narrator') ?? '';
  const authorId = params.get('author') ?? '';
  const genre = params.get('genre') ?? '';
  const sourceId = params.get('source') ?? '';
  const series = params.get('series') ?? '';
  const minMinutes = params.get('durMin') ?? '';
  const maxMinutes = params.get('durMax') ?? '';
  const sortParam = params.get('sort') ?? '';

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

  // URL sort wins; otherwise the remembered preference; otherwise the default.
  const effectiveSort: EditionSort =
    sortParam === 'shortest' || sortParam === 'longest' || sortParam === 'catalogue'
      ? sortParam
      : (preferences.catalogueSort ?? 'catalogue');

  const [textDraft, setTextDraft] = useState(text);

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params);
      if (value) next.set(key, value);
      else next.delete(key);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const durationRange = useMemo(() => {
    const min = Number(minMinutes);
    const max = Number(maxMinutes);
    return rangeFromMinutes(
      Number.isFinite(min) && minMinutes !== '' ? min : 0,
      Number.isFinite(max) && maxMinutes !== '' ? max : 0,
    );
  }, [minMinutes, maxMinutes]);

  const setDurationRange = useCallback(
    (next: { minSeconds?: number; maxSeconds?: number } | undefined) => {
      const params2 = new URLSearchParams(params);
      if (!next || (next.minSeconds === undefined && next.maxSeconds === undefined)) {
        // Resetting the duration filter must not disturb any other facet.
        params2.delete('durMin');
        params2.delete('durMax');
      } else {
        params2.set(
          'durMin',
          String(Math.round((next.minSeconds ?? 0) / MINUTE)),
        );
        if (next.maxSeconds === undefined) params2.delete('durMax');
        else params2.set('durMax', String(Math.round(next.maxSeconds / MINUTE)));
      }
      setParams(params2, { replace: true });
    },
    [params, setParams],
  );

  const setSort = useCallback(
    (next: EditionSort) => {
      update('sort', next === 'catalogue' ? '' : next);
      // Remembered so the next launch opens in the same order.
      void updatePreferences({ catalogueSort: next });
    },
    [update, updatePreferences],
  );

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
        ...(durationRange ? { durationRange } : {}),
        sort: effectiveSort,
      }),
    [
      authorId,
      durationRange,
      effectiveLanguages,
      effectiveSort,
      genre,
      index,
      narratorId,
      series,
      sourceId,
      text,
    ],
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
    Boolean(
      text ||
        narratorId ||
        authorId ||
        genre ||
        sourceId ||
        series ||
        minMinutes ||
        maxMinutes ||
        effectiveLanguages.length,
    ) || effectiveSort !== 'catalogue';

  const durationActive = Boolean(durationRange);

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

      <div className="filters filters--duration">
        <DurationFilter range={durationRange} onRangeChange={setDurationRange} />
        <DurationSort
          sort={effectiveSort}
          onSortChange={setSort}
          // A duration sort may never be presented as a provider-wide ranking
          // unless the whole provider catalogue is loaded, which it never is.
          // Development fixtures are likewise not a complete catalogue.
          partial={providerState.partial || isDevelopmentData || providerState.status !== 'ready'}
          loadedCount={
            providerState.status === 'ready' ? index.catalogue.audioEditions.length : undefined
          }
        />
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

      {durationActive && effectiveSort !== 'catalogue' ? (
        <p className="section__footnote">{t('sort.unknownLast')}</p>
      ) : null}

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
