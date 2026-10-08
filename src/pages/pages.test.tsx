import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { screen, within } from '@testing-library/react';
import { renderApp, renderRoute } from '../test/renderApp';
import { resetDatabaseHandle } from '../persistence/db';
import { devCatalogue, DevCatalogueAdapter } from '../data/devCatalogue';
import { buildIndex, searchEditions } from '../domain/search';
import { loadPreferences, savePreferences, normalizePreferences } from '../persistence/preferencesRepository';
import { NarratorPage } from './NarratorPage';
import { WorkPage } from './WorkPage';
import { EditionPage } from './EditionPage';
import { SourcePage } from './SourcePage';
import { SettingsPage } from './SettingsPage';
import { LibraryPage } from './LibraryPage';
import { SearchPage } from './SearchPage';

beforeEach(() => {
  resetDatabaseHandle();
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
});

const index = buildIndex(devCatalogue);

describe('Russian interface', () => {
  it('renders navigation and headings in Russian by default', () => {
    renderApp('/');

    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /Библиотека/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Поиск/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Сейчас играет/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Моя полка/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Альфа/).length).toBeGreaterThan(0);
  });

  it('keeps code-facing identifiers and routes in English', () => {
    // The interface language must not leak into route names or ids.
    renderApp('/');
    const hrefs = [...document.querySelectorAll('a')]
      .map((a) => a.getAttribute('href'))
      .filter((href): href is string => Boolean(href));
    expect(hrefs.some((href) => href.startsWith('/narrators/'))).toBe(true);
    expect(hrefs.some((href) => href.startsWith('/settings'))).toBe(true);
    expect(hrefs.some((href) => href.startsWith('/now-playing'))).toBe(true);
    for (const href of hrefs) {
      expect(href).not.toMatch(/[\u0400-\u04FF]/);
    }
  });

  it('shows the development-data notice in Russian', () => {
    renderRoute('/', { path: '/', element: <LibraryPage /> });
    expect(screen.getByText(/Тестовые данные/)).toBeTruthy();
    expect(screen.getByText(/вымышленные/)).toBeTruthy();
  });
});

describe('narrator-first catalogue screens', () => {
  it('lists every audio edition a narrator performed, filtered by language', () => {
    renderRoute('/narrators/dev%3Anarrator%3Ashared-narrator', {
      path: '/narrators/:narratorId',
      element: <NarratorPage />,
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Josephine Marsh' })).toBeTruthy();
    // Default preference is Russian-only, so the English edition is filtered out
    // but the Russian ones remain.
    const titles = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent);
    expect(titles).toContain('Чужая погода');
    expect(titles).toContain('Северная грамматика');
    expect(titles).not.toContain('Тайна маяка');
  });

  it('states how many editions the language filter hid', () => {
    renderRoute('/narrators/dev%3Anarrator%3Ashared-narrator', {
      path: '/narrators/:narratorId',
      element: <NarratorPage />,
    });
    expect(screen.getByText(/скрыто фильтром языка аудиокниги/)).toBeTruthy();
  });

  it('shows narrator aliases when present', () => {
    renderRoute('/narrators/dev%3Anarrator%3Admitri-salazar', {
      path: '/narrators/:narratorId',
      element: <NarratorPage />,
    });
    expect(screen.getByText(/Известен также как/)).toBeTruthy();
  });

  it('shows a not-found state for an unknown narrator', () => {
    renderRoute('/narrators/dev%3Anarrator%3Adoes-not-exist', {
      path: '/narrators/:narratorId',
      element: <NarratorPage />,
    });
    expect(screen.getByRole('heading', { name: 'Диктор не найден' })).toBeTruthy();
  });
});

describe('work and edition screens', () => {
  it('shows one work with editions in several narration languages', () => {
    renderRoute('/works/dev%3Awork%3Amysterious-lighthouse', {
      path: '/works/:workId',
      element: <WorkPage />,
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Тайна маяка' })).toBeTruthy();
    // The work's original language is English...
    expect(screen.getByText('Английский')).toBeTruthy();
    // ...while the default Russian filter shows only the Russian edition: one h1
    // for the work plus a single edition card.
    expect(screen.getAllByRole('heading', { name: 'Тайна маяка' })).toHaveLength(2);
    expect(screen.getByText('Аудиоиздание (1)')).toBeTruthy();
    // Only the Russian narration is listed.
    expect(screen.getAllByText('Язык: Русский')).toHaveLength(1);
    expect(screen.queryByText('Язык: Английский')).toBeNull();
    expect(screen.queryByText('Язык: Финский')).toBeNull();
  });

  it('shows the English and Finnish editions once the filter includes them', () => {
    savePreferences(normalizePreferences({ preferredAudioLanguages: ['ru', 'en', 'fi'] }));
    renderRoute('/works/dev%3Awork%3Amysterious-lighthouse', {
      path: '/works/:workId',
      element: <WorkPage />,
    });

    expect(screen.getAllByRole('heading', { name: 'Тайна маяка' }).length).toBe(4);
    expect(screen.getByText('Аудиоиздания (3)')).toBeTruthy();
    // Original language stays English regardless of which editions are listed.
    expect(screen.getByText('Английский')).toBeTruthy();
    // Narration languages of the listed editions are shown as names.
    expect(screen.getByText('Английский, Финский, Русский')).toBeTruthy();
  });

  it('labels unknown rights honestly in Russian', () => {
    renderRoute('/editions/dev%3Aedition%3Aquiet-ledger%3Ade', {
      path: '/editions/:editionId',
      element: <EditionPage />,
    });

    // Russian narration preference means this German edition is still reachable
    // by direct link, and its rights are stated as unknown.
    expect(screen.getByText('Права неизвестны')).toBeTruthy();
    expect(
      screen.getByText(/«Бесплатно для прослушивания» не значит «общественное достояние»/),
    ).toBeTruthy();
  });

  it('shows narration language and original language separately', () => {
    renderRoute('/editions/dev%3Aedition%3Amysterious-lighthouse%3Aru', {
      path: '/editions/:editionId',
      element: <EditionPage />,
    });

    const narrationLabel = screen.getByText('Язык аудиокниги');
    const originalLabel = screen.getByText('Язык оригинала');
    expect(narrationLabel).toBeTruthy();
    expect(originalLabel).toBeTruthy();
    // Russian narration of an English original.
    expect(narrationLabel.parentElement?.textContent).toContain('Русский');
    expect(originalLabel.parentElement?.textContent).toContain('Английский');
  });

  it('marks separate editions of the same work as independently stateful', () => {
    renderRoute('/editions/dev%3Aedition%3Amysterious-lighthouse%3Aru', {
      path: '/editions/:editionId',
      element: <EditionPage />,
    });

    expect(screen.getByRole('heading', { name: /Другие издания этого произведения/i })).toBeTruthy();
    expect(
      screen.getByText(/У каждого издания своя позиция прослушивания/i),
    ).toBeTruthy();
  });
});

describe('source attribution', () => {
  it('shows rights, attribution and availability on a source page', () => {
    renderRoute('/sources/dev%3Aundetermined-rights', {
      path: '/sources/:sourceId',
      element: <SourcePage />,
    });

    const list = document.querySelector('dl.detail-list');
    expect(list).toBeTruthy();
    expect(within(list as HTMLElement).getByText('Правовой статус')).toBeTruthy();
    expect(within(list as HTMLElement).getByText('Авторство')).toBeTruthy();
    expect(within(list as HTMLElement).getByText('Доступность')).toBeTruthy();
  });

  it('warns that unknown rights are not public domain', () => {
    renderRoute('/sources/dev%3Aundetermined-rights', {
      path: '/sources/:sourceId',
      element: <SourcePage />,
    });
    expect(screen.getByText(/не считается общественным достоянием/i)).toBeTruthy();
  });

  it('keeps "free to listen" wording distinct from public domain', () => {
    renderRoute('/sources/dev%3Adonated-library', {
      path: '/sources/:sourceId',
      element: <SourcePage />,
    });
    expect(
      screen.getAllByText('Бесплатно для прослушивания (по лицензии)').length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText('Общественное достояние')).toBeNull();
  });
});

describe('settings screen', () => {
  it('exposes interface language and audiobook languages separately', () => {
    renderRoute('/settings', { path: '/settings', element: <SettingsPage /> });

    expect(screen.getByRole('heading', { level: 1, name: 'Настройки' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Язык интерфейса' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Языки аудиокниг' })).toBeTruthy();
    // Only the complete translation is offered as a UI locale.
    expect(screen.queryByRole('button', { name: /English/ })).toBeNull();
  });

  it('says honestly that only the Russian interface translation is complete', () => {
    renderRoute('/settings', { path: '/settings', element: <SettingsPage /> });
    expect(screen.getByText(/Пока полностью переведён только русский интерфейс/)).toBeTruthy();
  });

  it('changing audiobook languages does not change the UI language', async () => {
    renderRoute('/settings', { path: '/settings', element: <SettingsPage /> });

    const english = screen
      .getByRole('button', { name: /Английский/ })
      .closest('button') as HTMLButtonElement;
    english.click();

    // Allow the async local write to settle.
    await waitForPrefChange();

    const preferences = loadPreferences();
    expect(preferences.preferredAudioLanguages).toEqual(['ru', 'en']);
    expect(preferences.uiLocale).toBe('ru');
    // The interface is still rendered in Russian.
    expect(screen.getByRole('heading', { level: 1, name: 'Настройки' })).toBeTruthy();
  });

  it('supports selecting several audiobook languages', async () => {
    renderRoute('/settings', { path: '/settings', element: <SettingsPage /> });

    for (const name of ['Английский', 'Финский']) {
      const button = screen.getByRole('button', { name: new RegExp(name) });
      button.click();
      // Each toggle is an async local write; wait between them.
      await waitForPrefChange();
    }

    expect(loadPreferences().preferredAudioLanguages).toEqual(['ru', 'en', 'fi']);
  });
});

describe('catalogue language filtering through the UI', () => {
  it('shows only Russian audio editions by default', () => {
    renderRoute('/search', { path: '/search', element: <SearchPage /> });
    const badges = screen
      .getAllByText(/^Язык: /)
      .map((node) => node.textContent);
    expect(badges.length).toBeGreaterThan(0);
    for (const badge of badges) expect(badge).toContain('Русский');
  });

  it('shows human-readable language names rather than raw codes', () => {
    renderRoute('/search', { path: '/search', element: <SearchPage /> });
    expect(screen.getAllByText('Язык: Русский').length).toBeGreaterThan(0);
    expect(screen.queryByText('Язык: ru')).toBeNull();
  });

  it('combines a narrator facet with the Russian language facet', () => {
    renderRoute('/search?narrator=dev%3Anarrator%3Aaino-virtanen', {
      path: '/search',
      element: <SearchPage />,
    });
    // Aino only performs Finnish audio, so a Russian filter excludes everything.
    expect(screen.getByText(/По этим фильтрам ничего не найдено/)).toBeTruthy();
  });

  it('shows the Finnish edition when the language facet asks for it', () => {
    renderRoute('/search?narrator=dev%3Anarrator%3Aaino-virtanen&lang=fi', {
      path: '/search',
      element: <SearchPage />,
    });
    const titles = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent);
    expect(titles).toContain('Тайна маяка');
    expect(titles).toContain('Тихая гавань');
    expect(screen.getAllByText('Язык: Финский').length).toBeGreaterThan(0);
  });

  it('does not derive the catalogue filter from the interface locale', () => {
    // uiLocale is Russian and stays Russian; the language facet comes from the
    // preference/URL only. There is no code path that could couple them.
    savePreferences(normalizePreferences({ uiLocale: 'ru', preferredAudioLanguages: ['fi'] }));
    renderApp('/search');

    const badges = screen.getAllByText(/^Язык: /).map((node) => node.textContent);
    expect(badges.length).toBeGreaterThan(0);
    for (const badge of badges) expect(badge).toContain('Финский');
    // The interface is still Russian.
    expect(screen.getAllByRole('link', { name: /Поиск/ }).length).toBeGreaterThan(0);
  });
});

describe('development data labelling', () => {
  it('marks the bundled catalogue as development data', () => {
    expect(devCatalogue.isDevelopmentData).toBe(true);
    expect(new DevCatalogueAdapter().isDevelopmentData).toBe(true);
  });

  it('proves work language differs from narration language in the fixtures', () => {
    const editions = index.editionsByWorkId.get('dev:work:mysterious-lighthouse') ?? [];
    expect(index.worksById.get('dev:work:mysterious-lighthouse')?.originalLanguage).toBe('en');
    expect(editions.map((edition) => edition.narrationLanguage).sort()).toEqual([
      'en',
      'fi',
      'ru',
    ]);
  });
});

/** Lets the async localStorage write from a settings toggle settle. */
async function waitForPrefChange(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('search helper invariants', () => {
  it('keeps language filtering out of the free-text path', () => {
    // Free text may match a Russian title regardless of the language facet; the
    // facet is a separate, explicit control.
    const russian = searchEditions(index, { narrationLanguages: ['ru'] });
    expect(russian.every((view) => view.edition.narrationLanguage === 'ru')).toBe(true);
  });
});
