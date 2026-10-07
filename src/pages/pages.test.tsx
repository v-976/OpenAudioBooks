import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, type RouteObject } from 'react-router-dom';
import { DevCatalogueAdapter, devCatalogue } from '../data/devCatalogue';
import { buildIndex } from '../domain/search';
import { CatalogueProvider } from '../app/CatalogueProvider';
import { UserDataProvider } from '../app/UserDataProvider';
import { PlayerProvider } from '../player/PlayerProvider';
import { NarratorPage } from './NarratorPage';
import { WorkPage } from './WorkPage';
import { EditionPage } from './EditionPage';
import { SourcePage } from './SourcePage';

/**
 * Renders a screen inside the full provider stack, because the screens consume
 * catalogue, user-data and player contexts exactly as they do in the app.
 */
function renderRoute(path: string, route: RouteObject) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CatalogueProvider>
        <UserDataProvider>
          <PlayerProvider>
            <Routes>
              <Route path={route.path} element={route.element} />
            </Routes>
          </PlayerProvider>
        </UserDataProvider>
      </CatalogueProvider>
    </MemoryRouter>,
  );
}

describe('narrator-first catalogue screens', () => {
  it('lists every audio edition a narrator performed', async () => {
    renderRoute('/narrators/dev%3Anarrator%3Ashared-narrator', {
      path: '/narrators/:narratorId',
      element: <NarratorPage />,
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Josephine Marsh' })).toBeTruthy();
    const editions = await screen.findAllByRole('heading', { name: /Audio editions narrated by/i });
    expect(editions).toHaveLength(1);
    // Spans multiple literary works and multiple sources.
    expect(await screen.findByText(/3 works/)).toBeTruthy();
    const works = await screen.findAllByRole('link', { name: 'Borrowed Weather' });
    expect(works).toHaveLength(1);
    expect(await screen.findByRole('link', { name: 'The Quiet Ledger' })).toBeTruthy();
    expect(await screen.findByRole('link', { name: 'Northern Grammar' })).toBeTruthy();
  });

  it('shows narrator aliases when present', async () => {
    renderRoute('/narrators/dev%3Anarrator%3Amireille-fontaine', {
      path: '/narrators/:narratorId',
      element: <NarratorPage />,
    });
    expect(await screen.findByText(/Also known as/i)).toBeTruthy();
  });

  it('shows a not-found state for an unknown narrator', async () => {
    renderRoute('/narrators/dev%3Anarrator%3Adoes-not-exist', {
      path: '/narrators/:narratorId',
      element: <NarratorPage />,
    });
    expect(await screen.findByRole('heading', { name: 'Narrator not found' })).toBeTruthy();
  });
});

describe('work and edition screens', () => {
  it('shows multiple audio editions under one work with different narrators', async () => {
    renderRoute('/works/dev%3Awork%3Asalt-and-lanterns', {
      path: '/works/:workId',
      element: <WorkPage />,
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Salt and Lanterns' })).toBeTruthy();
    expect(await screen.findByRole('heading', { name: /Audio editions \(2\)/ })).toBeTruthy();
    expect(await screen.findAllByText('Mireille Fontaine')).toBeTruthy();
    expect(await screen.findAllByText('Dmitri Salazar')).toBeTruthy();
  });

  it('labels unknown rights honestly on an edition page', async () => {
    renderRoute('/editions/dev%3Aedition%3Athe-quiet-ledger%3Aundetermined-de', {
      path: '/editions/:editionId',
      element: <EditionPage />,
    });

    expect(await screen.findByText('Rights unknown')).toBeTruthy();
    expect(await screen.findByText(/Free to listen does not mean public domain/i)).toBeTruthy();
  });

  it('marks separate editions of the same work as independently stateful', async () => {
    renderRoute('/editions/dev%3Aedition%3Asalt-and-lanterns%3Aarchive-en', {
      path: '/editions/:editionId',
      element: <EditionPage />,
    });

    expect(await screen.findByRole('heading', { name: /Other editions of this work/i })).toBeTruthy();
    expect(
      await screen.findByText(/Each edition keeps its own playback position/i),
    ).toBeTruthy();
    // Every edition of the work remains addressable in the index.
    const index = buildIndex(devCatalogue);
    expect(index.editionsByWorkId.get('dev:work:salt-and-lanterns')).toHaveLength(2);
  });
});

describe('source attribution', () => {
  it('shows rights, attribution and availability on a source page', async () => {
    renderRoute('/sources/dev%3Aundetermined-rights', {
      path: '/sources/:sourceId',
      element: <SourcePage />,
    });

    const heading = await screen.findByRole('heading', { level: 1 });
    const list = document.querySelector('dl.detail-list');
    expect(list).toBeTruthy();
    expect(heading).toBeTruthy();
    expect(within(list as HTMLElement).getByText('Attribution')).toBeTruthy();
    expect(within(list as HTMLElement).getByText('Availability')).toBeTruthy();
    expect(within(list as HTMLElement).getByText('Rights status')).toBeTruthy();
  });

  it('warns that unknown rights are not public domain', async () => {
    renderRoute('/sources/dev%3Aundetermined-rights', {
      path: '/sources/:sourceId',
      element: <SourcePage />,
    });
    expect(await screen.findByText(/not treated as public domain/i)).toBeTruthy();
  });
});

describe('development data labelling', () => {
  it('marks the bundled catalogue as development data', () => {
    expect(devCatalogue.isDevelopmentData).toBe(true);
    expect(new DevCatalogueAdapter().isDevelopmentData).toBe(true);
  });
});
