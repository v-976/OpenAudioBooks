import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildIndex, viewForEdition, type EditionView } from '../domain/search';
import type { Catalogue } from '../domain/types';
import { DevCatalogueAdapter, devCatalogue } from '../data/devCatalogue';
import { AdapterRegistry } from '../sources/adapter';
import { CatalogueContext, type CatalogueContextValue } from './catalogueContext';

/**
 * Builds the in-memory catalogue from registered source adapters.
 *
 * Real adapters (LibriVox, Internet Archive, MDS, ...) will register
 * themselves here alongside the bundled development adapter. The provider is
 * intentionally unaware of any specific provider.
 */
export function CatalogueProvider({ children }: { children: ReactNode }) {
  const registry = useMemo(() => createRegistry(), []);
  const adapters = useMemo(() => registry.enabled(), [registry]);
  const [catalogue, setCatalogue] = useState<Catalogue>(() => devCatalogue);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const catalogues: Catalogue[] = [devCatalogue];
      for (const adapter of registry.enabled()) {
        if (!adapter.fetchCatalogue) continue;
        try {
          const fetched = await adapter.fetchCatalogue();
          if (fetched.works.length > 0) catalogues.push(fetched);
        } catch (error) {
          console.warn(`Source adapter "${adapter.id}" catalogue fetch failed.`, error);
        }
      }
      if (!cancelled) setCatalogue(mergeCatalogues(catalogues));
    })();

    return () => {
      cancelled = true;
    };
  }, [registry]);

  const value = useMemo<CatalogueContextValue>(() => {
    const index = buildIndex(
      catalogue ?? {
        authors: [],
        works: [],
        narrators: [],
        sources: [],
        audioEditions: [],
        tracks: [],
        isDevelopmentData: true,
      },
    );
    return {
      index,
      adapters,
      isDevelopmentData: index.catalogue.isDevelopmentData,
      getEdition(editionId: string): EditionView | undefined {
        return viewForEdition(index, editionId);
      },
    };
  }, [catalogue, adapters]);

  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>;
}

/**
 * Builds the adapter registry.
 *
 * Real adapters (LibriVox, Internet Archive, MDS, RSS feeds, ...) get added
 * here. Nothing else in the application needs to know they exist.
 */
function createRegistry(): AdapterRegistry {
  const registry = new AdapterRegistry();
  registry.register(new DevCatalogueAdapter());
  return registry;
}

/**
 * Merges adapter catalogues, keeping the first definition of each id so that a
 * bundled fixture always wins over a duplicate remote record.
 */
function mergeCatalogues(catalogues: Catalogue[]): Catalogue {
  const merged: Catalogue = {
    authors: [],
    works: [],
    narrators: [],
    sources: [],
    audioEditions: [],
    tracks: [],
    isDevelopmentData: catalogues.every((item) => item.isDevelopmentData),
  };

  for (const catalogue of catalogues) {
    const seen = {
      authors: new Set(merged.authors.map((item) => item.id)),
      works: new Set(merged.works.map((item) => item.id)),
      narrators: new Set(merged.narrators.map((item) => item.id)),
      sources: new Set(merged.sources.map((item) => item.id)),
      audioEditions: new Set(merged.audioEditions.map((item) => item.id)),
      tracks: new Set(merged.tracks.map((item) => item.id)),
    };
    for (const author of catalogue.authors) {
      if (!seen.authors.has(author.id)) merged.authors.push(author);
    }
    for (const work of catalogue.works) {
      if (!seen.works.has(work.id)) merged.works.push(work);
    }
    for (const narrator of catalogue.narrators) {
      if (!seen.narrators.has(narrator.id)) merged.narrators.push(narrator);
    }
    for (const source of catalogue.sources) {
      if (!seen.sources.has(source.id)) merged.sources.push(source);
    }
    for (const edition of catalogue.audioEditions) {
      if (!seen.audioEditions.has(edition.id)) merged.audioEditions.push(edition);
    }
    for (const track of catalogue.tracks) {
      if (!seen.tracks.has(track.id)) merged.tracks.push(track);
    }
  }

  return merged;
}
