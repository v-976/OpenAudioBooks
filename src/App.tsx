import { CatalogueProvider } from './app/CatalogueProvider';
import { UserDataProvider } from './app/UserDataProvider';
import { PlayerProvider } from './player/PlayerProvider';
import { AppRoutes } from './app/AppRoutes';
import { ErrorBoundary } from './components/ErrorBoundary';

/**
 * Provider order matters:
 *  - catalogue first, because user data and the player resolve ids against it;
 *  - user data next, because the player persists through it;
 *  - player last, wrapping the routes that consume it.
 */
export function App() {
  return (
    <ErrorBoundary>
      <CatalogueProvider>
        <UserDataProvider>
          <PlayerProvider>
            <AppRoutes />
          </PlayerProvider>
        </UserDataProvider>
      </CatalogueProvider>
    </ErrorBoundary>
  );
}
