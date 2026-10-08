import { createContext, useContext } from 'react';
import type { CatalogueIndex, EditionView } from '../domain/search';
import type { SourceAdapter } from '../sources/adapter';
import type { ProviderLoadState } from './providerLoadState';

/**
 * Catalogue context: normalised data plus the adapter registry.
 *
 * UI components read from here only. They must not import adapters directly
 * (AGENTS.md rule 6).
 */
export interface CatalogueContextValue {
  index: CatalogueIndex;
  adapters: SourceAdapter[];
  /** Resolves an edition id to its joined view, or undefined when unknown. */
  getEdition(editionId: string): EditionView | undefined;
  /** Development catalogues are labelled in the UI and never claim to be real. */
  isDevelopmentData: boolean;
  /**
   * State of the real provider load.
   *
   * `partial` is the honesty flag: when the local catalogue is only a slice of a
   * provider's, every duration sort and every "shortest/longest" claim must be
   * qualified, because it describes the loaded set and not the provider's whole
   * catalogue.
   */
  providerState: ProviderLoadState;
  /** Explicit, user-triggered refresh of the provider catalogue. */
  refreshProviderCatalogue(): Promise<void>;
}

export const CatalogueContext = createContext<CatalogueContextValue | undefined>(undefined);

export function useCatalogue(): CatalogueContextValue {
  const value = useContext(CatalogueContext);
  if (!value) {
    throw new Error('useCatalogue must be used inside <CatalogueProvider>.');
  }
  return value;
}

export function useCatalogueIndex(): CatalogueIndex {
  return useCatalogue().index;
}
