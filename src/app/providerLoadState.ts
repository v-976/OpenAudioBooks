/**
 * Provider catalogue load state, kept separate from the provider component so
 * `catalogueContext.ts` can import the type without creating a cycle.
 */
export interface ProviderLoadState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  sourceId?: string;
  /**
   * True when only part of the provider's catalogue is loaded locally.
   *
   * This is the honesty flag: it must be surfaced wherever a duration sort could
   * otherwise be read as a provider-wide ranking.
   */
  partial: boolean;
  loadedCount: number;
  error?: string;
}
