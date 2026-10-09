import { render, screen, waitFor, type RenderResult } from '@testing-library/react';
import { expect } from 'vitest';
import { MemoryRouter, Route, Routes, type RouteObject } from 'react-router-dom';
import { CatalogueProvider } from '../app/CatalogueProvider';
import { UserDataProvider } from '../app/UserDataProvider';
import { PlayerProvider } from '../player/PlayerProvider';
import { I18nProvider } from '../i18n/I18nProvider';
import { AppRoutes } from '../app/AppRoutes';
import type { LanguageCode } from '../domain/language';

/**
 * Test helpers that render the real provider stack.
 *
 * Screens are tested through the same providers the application uses, so the
 * catalogue index, local user data, the player and the localization layer all
 * behave exactly as they do in the browser. Rendering a screen with a
 * hand-built context value would prove nothing about the wiring.
 */

export interface RenderAppOptions {
  includeStaticSources?: boolean;
}

function withProviders(
  children: React.ReactNode,
  locale: LanguageCode,
  options: RenderAppOptions = {},
) {
  return (
    <CatalogueProvider includeStaticSources={options.includeStaticSources ?? false}>
      <UserDataProvider>
        <I18nProvider locale={locale}>
          <PlayerProvider>{children}</PlayerProvider>
        </I18nProvider>
      </UserDataProvider>
    </CatalogueProvider>
  );
}

/** Renders the full application at a path, in the Russian UI. */
export function renderApp(
  path = '/',
  locale: LanguageCode = 'ru',
  options: RenderAppOptions = {},
): RenderResult {
  return render(
    <MemoryRouter initialEntries={[path]}>
      {withProviders(<AppRoutes />, locale, options)}
    </MemoryRouter>,
  );
}

/** Renders a single screen inside the full provider stack. */
export function renderRoute(
  path: string,
  route: RouteObject,
  locale: LanguageCode = 'ru',
  options: RenderAppOptions = {},
): RenderResult {
  return render(
    <MemoryRouter initialEntries={[path]}>
      {withProviders(
        <Routes>
          <Route path={route.path ?? '/'} element={route.element} />
        </Routes>,
        locale,
        options,
      )}
    </MemoryRouter>,
  );
}

/** Waits until the local user-data store has finished loading. */
export async function waitForUserData(): Promise<void> {
  await waitFor(() => expect(screen.queryByText(/Чтение локального хранилища/i)).toBeNull());
}
