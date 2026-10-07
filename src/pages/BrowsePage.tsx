import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCatalogue } from '../app/catalogueContext';
import { allGenres, allLanguages } from '../domain/search';
import { NotFound } from './NotFound';

type BrowseKind = 'narrators' | 'authors' | 'sources';

const TITLES: Record<BrowseKind, { title: string; intro: string }> = {
  narrators: {
    title: 'Narrators',
    intro:
      'Narrators are first-class records in OpenAudioBooks. Every entry links to the audio editions they performed, across works and sources.',
  },
  authors: { title: 'Authors', intro: 'Authors of the works in the catalogue.' },
  sources: {
    title: 'Sources',
    intro:
      'OpenAudioBooks is an aggregator. Audio is streamed from these sources; no files are re-hosted.',
  },
};

/** Index pages for narrator / author / source browsing. */
export function BrowsePage() {
  const params = useParams();
  const kind = (params.kind ?? 'narrators') as BrowseKind;
  const { index } = useCatalogue();

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
  const genres = useMemo(() => allGenres(index), [index]);
  const languages = useMemo(() => allLanguages(index), [index]);

  if (!(kind in TITLES)) {
    return <NotFound title="Page not found" body="That browse view does not exist." />;
  }

  const meta = TITLES[kind];

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Library</Link>
      </nav>

      <h1 className="page__title">{meta.title}</h1>
      <p className="page__subtitle">{meta.intro}</p>

      {kind === 'narrators' ? (
        <ul className="plain-list">
          {narrators.map((narrator) => (
            <li key={narrator.id} className="plain-list__item plain-list__item--row">
              <Link to={`/narrators/${encodeURIComponent(narrator.id)}`}>{narrator.name}</Link>
              <span className="plain-list__meta">
                {(index.editionsByNarratorId.get(narrator.id) ?? []).length} edition(s)
                {narrator.aliases.length > 0 ? ` · aka ${narrator.aliases[0]}` : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {kind === 'authors' ? (
        <ul className="plain-list">
          {authors.map((author) => (
            <li key={author.id} className="plain-list__item plain-list__item--row">
              <Link to={`/authors/${encodeURIComponent(author.id)}`}>{author.name}</Link>
              <span className="plain-list__meta">
                {(index.editionsByAuthorId.get(author.id) ?? []).length} edition(s)
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {kind === 'sources' ? (
        <ul className="plain-list">
          {sources.map((source) => (
            <li key={source.id} className="plain-list__item plain-list__item--row">
              <Link to={`/sources/${encodeURIComponent(source.id)}`}>{source.name}</Link>
              <span className="plain-list__meta">
                {source.sourceType} · {(index.editionsBySourceId.get(source.id) ?? []).length}{' '}
                edition(s)
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <section className="section" aria-labelledby="browse-genres">
        <h2 className="section__title" id="browse-genres">
          Genres
        </h2>
        <ul className="chip-list">
          {genres.map((genre) => (
            <li key={genre}>
              <Link className="chip" to={`/search?genre=${encodeURIComponent(genre)}`}>
                {genre}
                <span className="chip__count">{(index.editionsByGenre.get(genre.toLowerCase()) ?? []).length}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="browse-languages">
        <h2 className="section__title" id="browse-languages">
          Languages
        </h2>
        <ul className="chip-list">
          {languages.map((language) => (
            <li key={language}>
              <Link
                className="chip"
                to={`/search?language=${encodeURIComponent(language)}`}
              >
                {language.toUpperCase()}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
