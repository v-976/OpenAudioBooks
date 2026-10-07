import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EditionCard } from '../components/EditionCard';
import { useCatalogue } from '../app/catalogueContext';
import { usePlayer } from '../player/playerContext';
import {
  allGenres,
  allLanguages,
  searchEditions,
  type EditionView,
} from '../domain/search';

/**
 * Search / discovery.
 *
 * Facets are explicit so that `author + narrator`, `genre + narrator` and
 * `source + narrator` combinations all work, which is a hard requirement for a
 * narrator-centric catalogue.
 */
export function SearchPage() {
  const { index } = useCatalogue();
  const player = usePlayer();
  const [params, setParams] = useSearchParams();

  const text = params.get('q') ?? '';
  const narratorId = params.get('narrator') ?? '';
  const authorId = params.get('author') ?? '';
  const genre = params.get('genre') ?? '';
  const language = params.get('language') ?? '';
  const sourceId = params.get('source') ?? '';
  const series = params.get('series') ?? '';

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
        ...(language ? { language } : {}),
        ...(sourceId ? { sourceIds: [sourceId] } : {}),
        ...(series ? { series } : {}),
      }),
    [index, text, narratorId, authorId, genre, language, sourceId, series],
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

  const clearAll = () => {
    setTextDraft('');
    setParams(new URLSearchParams(), { replace: true });
  };

  const hasFilters =
    Boolean(text || narratorId || authorId || genre || language || sourceId || series);

  return (
    <div className="page">
      <h1 className="page__title">Search</h1>

      <form
        className="search-form"
        onSubmit={(event) => {
          event.preventDefault();
          update('q', textDraft.trim());
        }}
        role="search"
      >
        <label className="field">
          <span className="field__label">Title, author, narrator, track…</span>
          <input
            className="field__input"
            type="search"
            value={textDraft}
            onChange={(event) => setTextDraft(event.target.value)}
            placeholder="Search the catalogue"
          />
        </label>
        <button type="submit" className="button button--primary">
          Search
        </button>
      </form>

      <div className="filters">
        <label className="field">
          <span className="field__label">Narrator</span>
          <select
            className="field__input"
            value={narratorId}
            onChange={(event) => update('narrator', event.target.value)}
          >
            <option value="">Any narrator</option>
            {narrators.map((narrator) => (
              <option key={narrator.id} value={narrator.id}>
                {narrator.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Author</span>
          <select
            className="field__input"
            value={authorId}
            onChange={(event) => update('author', event.target.value)}
          >
            <option value="">Any author</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>
                {author.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Genre</span>
          <select
            className="field__input"
            value={genre}
            onChange={(event) => update('genre', event.target.value)}
          >
            <option value="">Any genre</option>
            {allGenres(index).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Language</span>
          <select
            className="field__input"
            value={language}
            onChange={(event) => update('language', event.target.value)}
          >
            <option value="">Any language</option>
            {allLanguages(index).map((item) => (
              <option key={item} value={item}>
                {item.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Source</span>
          <select
            className="field__input"
            value={sourceId}
            onChange={(event) => update('source', event.target.value)}
          >
            <option value="">Any source</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Series</span>
          <select
            className="field__input"
            value={series}
            onChange={(event) => update('series', event.target.value)}
          >
            <option value="">Any series</option>
            {seriesNames.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="results-header">
        <h2 className="section__title">
          {results.length} audio edition{results.length === 1 ? '' : 's'}
        </h2>
        {hasFilters ? (
          <button type="button" className="button button--ghost" onClick={clearAll}>
            Clear filters
          </button>
        ) : null}
      </div>

      {results.length === 0 ? (
        <p className="notice">No audio editions match these filters.</p>
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
                  Play
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
