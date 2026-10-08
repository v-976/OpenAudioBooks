import { useCatalogue } from '../app/catalogueContext';
import { useI18n } from '../i18n/i18nContext';

/**
 * Provider catalogue status.
 *
 * The honesty requirement for a partially loaded provider catalogue: when only a
 * slice is loaded, that is stated plainly, together with the fact that a
 * duration sort therefore describes the loaded set rather than the provider's
 * whole catalogue. The refresh is explicit — nothing auto-downloads pages.
 */
export function ProviderStatus() {
  const { providerState, refreshProviderCatalogue } = useCatalogue();
  const { t } = useI18n();

  if (providerState.status === 'idle') return null;

  if (providerState.status === 'loading') {
    return (
      <p className="notice notice--info" role="status">
        {t('provider.loading')}
      </p>
    );
  }

  if (providerState.status === 'error') {
    return (
      <div className="notice notice--warning" role="status">
        <p>
          {t('provider.error', {
            source: 'LibriVox',
            reason: providerState.error ?? '',
          })}
        </p>
        <p>{t('provider.offlineNotice')}</p>
      </div>
    );
  }

  return (
    <div className="notice notice--info">
      <p role="status">
        {t('provider.loaded', { source: 'LibriVox', count: providerState.loadedCount })}
      </p>
      {providerState.partial ? (
        <p>{t('provider.partialNotice')}</p>
      ) : null}
      <button
        type="button"
        className="button button--ghost"
        onClick={() => void refreshProviderCatalogue()}
      >
        {t('provider.refresh')}
      </button>
    </div>
  );
}
