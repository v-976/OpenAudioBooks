import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { buildIndex, viewForEdition, type EditionView } from '../domain/search';
import type { Catalogue } from '../domain/types';
import { DevCatalogueAdapter, devCatalogue } from '../data/devCatalogue';
import { AdapterRegistry } from '../sources/adapter';
import { LibriVoxAdapter } from '../sources/librivox/LibriVoxAdapter';
import { MDSAdapter } from '../sources/mds/MDSAdapter';
import type { MdsIndex } from '../sources/mds/types';
import { CatalogueContext, type CatalogueContextValue } from './catalogueContext';
import type { ProviderLoadState } from './providerLoadState';

/** How much LibriVox to load on a cold start. Deliberately small. */
const LIBRIVOX_INITIAL_PAGES = 2;
const LIBRIVOX_PAGE_SIZE = 50;

/**
 * Builds the in-memory catalogue from registered source adapters.
 *
 * Real adapters (LibriVox now; Internet Archive, MDS, ... later) register
 * themselves here alongside the bundled development adapter. The provider is
 * intentionally unaware of any specific provider beyond wiring it up.
 */
/**
 * Builds the in-memory catalogue from registered source adapters.
 *
 * Real adapters (LibriVox now; Internet Archive, MDS, ... later) register
 * themselves here alongside the bundled development adapter. The provider is
 * intentionally unaware of any specific provider beyond wiring it up.
 */
export function CatalogueProvider({
  children,
  includeStaticSources = true,
  mdsIndex,
}: {
  children: ReactNode;
  /** Tests that exercise legacy fixtures may opt out; production always uses the default. */
  includeStaticSources?: boolean;
  /** Test-only injection; production loads the same-origin JSON on demand. */
  mdsIndex?: MdsIndex;
}) {
  const location = useLocation();
  const registry = useMemo(
    () => createRegistry(includeStaticSources, mdsIndex),
    [includeStaticSources, mdsIndex],
  );
  const adapters = useMemo(() => registry.enabled(), [registry]);
  const [libriVoxCatalogue, setLibriVoxCatalogue] = useState<Catalogue>();
  const [mdsCatalogue, setMdsCatalogue] = useState<Catalogue>();
  const [providerState, setProviderState] = useState<ProviderLoadState>({
    status: 'idle',
    sourceId: undefined,
    partial: false,
    loadedCount: 0,
    error: undefined,
  });

  const loadProviderCatalogue = useCallback(
    async (refresh: boolean) => {
      const adapter = registry.get('librivox');
      if (!adapter || !('loadCatalogue' in adapter)) return;
      const libriVox = adapter as LibriVoxAdapter;

      setProviderState((previous) => ({ ...previous, status: 'loading' }));
      try {
        const fetched = await libriVox.loadCatalogue({ refresh });
        const scan = libriVox.getScanState();
        setLibriVoxCatalogue(fetched);
        setProviderState({
          status: 'ready',
          sourceId: 'librivox',
          // A scan that hit its page cap left the catalogue incomplete, and the
          // UI must say so rather than implying full coverage.
          partial: Boolean(scan?.truncated),
          loadedCount: fetched.audioEditions.length,
          error: undefined,
        });
      } catch (error) {
        // The bundled fixtures stay on screen, so the application remains usable
        // with no network at all.
        setProviderState({
          status: 'error',
          sourceId: 'librivox',
          partial: false,
          loadedCount: 0,
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
    },
    [registry],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Development fixtures are shown immediately so the first paint never waits
      // on the network; the provider result replaces them when it arrives.
      if (!cancelled) {
        const adapter = registry.get('librivox');
        if (adapter && 'loadCatalogue' in adapter) {
          await loadProviderCatalogue(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProviderCatalogue, registry]);

  useEffect(() => {
    if (!includeStaticSources || !catalogueRouteNeedsMetadata(location.pathname)) return;
    let cancelled = false;
    const adapter = registry.get('mds');
    if (!adapter?.fetchCatalogue) return;
    void adapter
      .fetchCatalogue()
      .then((fetched) => {
        if (!cancelled) setMdsCatalogue(fetched);
      })
      .catch((error) => {
        // LibriVox or development data remain usable. The failure is local-only.
        console.warn('MDS metadata index could not be loaded.', error);
      });
    return () => {
      cancelled = true;
    };
  }, [includeStaticSources, location.pathname, registry]);

  const refreshProviderCatalogue = useCallback(() => loadProviderCatalogue(true), [
    loadProviderCatalogue,
  ]);

  const catalogue = useMemo(() => {
    const realCatalogues = [mdsCatalogue, libriVoxCatalogue].filter(
      (item): item is Catalogue => Boolean(item),
    );
    if (realCatalogues.length === 0) return devCatalogue;
    const combined = mergeCatalogues(realCatalogues);
    return shouldShowDevCatalogue(combined) ? devCatalogue : combined;
  }, [libriVoxCatalogue, mdsCatalogue]);
  const index = useMemo(() => buildIndex(catalogue), [catalogue]);

  const value = useMemo<CatalogueContextValue>(
    () => ({
      index,
      adapters,
      isDevelopmentData: catalogue.isDevelopmentData && shouldShowDevCatalogue(catalogue),
      getEdition(editionId: string): EditionView | undefined {
        return viewForEdition(index, editionId);
      },
      providerState,
      refreshProviderCatalogue,
    }),
    [adapters, catalogue, index, providerState, refreshProviderCatalogue],
  );

  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>;
}

/**
 * Whether the bundled development fixtures are shown.
 *
 * They are hidden once a real provider has contributed records, because a
 * listener should never mistake fictional test data for a real audiobook.
 */
function shouldShowDevCatalogue(catalogue: Catalogue): boolean {
  const hasRealWorks = catalogue.works.some((work) => !work.id.startsWith('dev:'));
  return !hasRealWorks;
}

/**
 *
 * Real adapters (LibriVox, Internet Archive, MDS, RSS feeds, ...) get added
 * here. Nothing else in the application needs to know they exist.
 */
function createRegistry(includeStaticSources: boolean, mdsIndex?: MdsIndex): AdapterRegistry {
  const registry = new AdapterRegistry();
  registry.register(new DevCatalogueAdapter());
  if (includeStaticSources) registry.register(new MDSAdapter(mdsIndex));
  registry.register(
    new LibriVoxAdapter({ maxPages: LIBRIVOX_INITIAL_PAGES, pageSize: LIBRIVOX_PAGE_SIZE }),
  );
  return registry;
}

function catalogueRouteNeedsMetadata(pathname: string): boolean {
  return pathname !== '/settings' && pathname !== '/about';
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
