import { CatalogueProvider } from './app/CatalogueProvider';
import { UserDataProvider } from './app/UserDataProvider';
import { useUserData } from './app/userData';
import { PlayerProvider } from './player/PlayerProvider';
import { AppRoutes } from './app/AppRoutes';
import { ErrorBoundary } from './components/ErrorBoundary';
import { I18nProvider } from './i18n/I18nProvider';

/**
 * Reads the UI locale from preferences and exposes it to the tree.
 *
 * Split out of `App` because the locale lives in user data, which is itself a
 * provider. This is the ONLY place `preferences.uiLocale` is read for rendering:
 * components get the locale from `useI18n()` instead, so no screen can quietly
 * couple the interface language to anything else. In particular, the audiobook
 * language preference is never consulted here.
 */
function LocalizedApp() {
  const { preferences } = useUserData();

  return (
    <I18nProvider locale={preferences.uiLocale}>
      <PlayerProvider>
        <AppRoutes />
      </PlayerProvider>
    </I18nProvider>
  );
}

/**
 * Provider order matters:
 *  - catalogue first, because user data and the player resolve ids against it;
 *  - user data next, because it supplies the UI locale and the player persists
 *    through it;
 *  - localization next, because every screen renders through it;
 *  - player last, wrapping the routes that consume it.
 */
export function App() {
  return (
    <ErrorBoundary>
      <CatalogueProvider>
        <UserDataProvider>
          <LocalizedApp />
        </UserDataProvider>
      </CatalogueProvider>
    </ErrorBoundary>
  );
}
