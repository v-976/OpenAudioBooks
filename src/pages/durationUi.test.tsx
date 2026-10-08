import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderApp, renderRoute } from '../test/renderApp';
import { resetDatabaseHandle } from '../persistence/db';
import {
  loadPreferences,
  normalizePreferences,
  savePreferences,
} from '../persistence/preferencesRepository';
import { SearchPage } from './SearchPage';
import { EditionPage } from './EditionPage';

beforeEach(() => {
  resetDatabaseHandle();
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
});

/** Sets a `<select>` value the way a user would. */
function selectOption(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

/** Reads the duration text of each result card, in display order. */
function cardDurations(): string[] {
  return [...document.querySelectorAll('.badge--duration')].map(
    (badge) => badge.textContent?.trim() ?? '',
  );
}

/** Result titles in display order. */
function resultTitles(): string[] {
  return [...document.querySelectorAll('.card__title')].map((node) => node.textContent ?? '');
}

describe('duration display', () => {
  it('shows a human-readable duration on an edition page', () => {
    renderRoute('/editions/dev%3Aedition%3Amysterious-lighthouse%3Aru', {
      path: '/editions/:editionId',
      element: <EditionPage />,
    });

    expect(screen.getByText('Длительность')).toBeTruthy();
    // A 19-second fixture must not render as "0:19" or as "0 мин".
    const row = screen.getByText('Длительность').parentElement?.textContent ?? '';
    expect(row).not.toMatch(/0:19/);
  });

  it('shows a duration on every result card', () => {
    savePreferences(normalizePreferences({ preferredAudioLanguages: [] }));
    renderRoute('/search', { path: '/search', element: <SearchPage /> });

    const durations = cardDurations();
    expect(durations.length).toBeGreaterThan(0);
    for (const text of durations) {
      expect(text).not.toBe('');
      // Never "0 мин" for a real fixture duration.
      expect(text).not.toMatch(/^0 мин$/);
    }
  });
});

describe('duration filter', () => {
  it('offers the documented presets plus an any-duration option', () => {
    renderRoute('/search', { path: '/search', element: <SearchPage /> });

    const select = screen.getByLabelText('Длительность') as HTMLSelectElement;
    const options = within(select).getAllByRole('option').map((option) => option.textContent);
    expect(options).toContain('Любая продолжительность');
    expect(options).toContain('До 15 минут');
    expect(options).toContain('15–30 минут');
    expect(options).toContain('30–60 минут');
    expect(options).toContain('1–3 часа');
    expect(options).toContain('3–10 часов');
    expect(options).toContain('Более 10 часов');
  });

  it('activates a resettable filter when a preset is chosen', () => {
    savePreferences(normalizePreferences({ preferredAudioLanguages: [] }));
    renderRoute('/search', { path: '/search', element: <SearchPage /> });

    selectOption('Длительность', 'under15');
    expect(screen.getByRole('button', { name: 'Сбросить фильтр' })).toBeTruthy();
  });

  it('resets the duration filter without disturbing other facets', () => {
    savePreferences(normalizePreferences({ preferredAudioLanguages: [] }));
    renderRoute('/search?narrator=dev%3Anarrator%3Amireille-fontaine', {
      path: '/search',
      element: <SearchPage />,
    });

    selectOption('Длительность', '1to3h');
    expect(screen.getByLabelText('Диктор')).toHaveProperty(
      'value',
      'dev:narrator:mireille-fontaine',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Сбросить фильтр' }));

    // The narrator facet survives; only the duration filter was cleared.
    expect(screen.getByLabelText('Диктор')).toHaveProperty(
      'value',
      'dev:narrator:mireille-fontaine',
    );
    expect(screen.getByLabelText('Длительность')).toHaveProperty('value', 'any');
  });

  it('explains that unknown durations are excluded while a range is active', () => {
    savePreferences(normalizePreferences({ preferredAudioLanguages: [] }));
    renderRoute('/search', { path: '/search', element: <SearchPage /> });

    expect(screen.queryByText(/не попадают в заданный диапазон/i)).toBeNull();
    selectOption('Длительность', 'under15');
    expect(screen.getByText(/не попадают в заданный диапазон/i)).toBeTruthy();
  });

  it('combines a duration range with the language facet', () => {
    savePreferences(normalizePreferences({ preferredAudioLanguages: ['ru'] }));
    renderRoute('/search', { path: '/search', element: <SearchPage /> });

    selectOption('Длительность', 'under15');
    const durations = cardDurations();
    expect(durations.length).toBeGreaterThan(0);
    // Every listed card is still Russian-narrated.
    const languages = [...document.querySelectorAll('.badge--language')].map((badge) =>
      badge.textContent ?? '',
    );
    for (const language of languages) expect(language).toContain('Русский');
  });

  it('exposes custom From/To inputs in minutes', () => {
    renderRoute('/search', { path: '/search', element: <SearchPage /> });
    selectOption('Длительность', 'custom');

    expect(screen.getByLabelText('От')).toBeTruthy();
    expect(screen.getByLabelText('До')).toBeTruthy();
    expect(screen.getByText(/Укажите диапазон в минутах/)).toBeTruthy();
  });

  it('applies a custom range typed in minutes', () => {
    savePreferences(normalizePreferences({ preferredAudioLanguages: [] }));
    renderRoute('/search', { path: '/search', element: <SearchPage /> });
    selectOption('Длительность', 'custom');

    fireEvent.change(screen.getByLabelText('От'), { target: { value: '20' } });
    fireEvent.blur(screen.getByLabelText('От'));
    fireEvent.change(screen.getByLabelText('До'), { target: { value: '45' } });
    fireEvent.blur(screen.getByLabelText('До'));

    // A 20–45 minute window excludes every sub-15-minute fixture.
    expect(resultTitles()).toEqual([]);
  });
});

describe('duration sorting', () => {
  it('offers the catalogue order plus both duration directions', () => {
    renderRoute('/search', { path: '/search', element: <SearchPage /> });
    const select = screen.getByLabelText('Сортировка');
    const options = within(select).getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['По названию', 'Сначала короткие', 'Сначала длинные']);
  });

  it('reorders results when sorting shortest first', () => {
    savePreferences(normalizePreferences({ preferredAudioLanguages: [] }));
    renderRoute('/search', { path: '/search', element: <SearchPage /> });

    const alphabetical = resultTitles();
    selectOption('Сортировка', 'shortest');
    const shortestFirst = resultTitles();

    expect(shortestFirst).not.toEqual(alphabetical);
    expect(shortestFirst).toHaveLength(alphabetical.length);
    // Same records, different order: sorting must not drop anything.
    expect([...shortestFirst].sort()).toEqual([...alphabetical].sort());
  });

  it('reverses the order for longest first', () => {
    savePreferences(normalizePreferences({ preferredAudioLanguages: [] }));
    renderRoute('/search', { path: '/search', element: <SearchPage /> });

    selectOption('Сортировка', 'shortest');
    const shortest = resultTitles();
    selectOption('Сортировка', 'longest');
    const longest = resultTitles();

    // Same records in both directions...
    expect([...longest].sort()).toEqual([...shortest].sort());
    // ...and a genuinely different order, since several fixture editions share
    // the same duration and therefore a tie-broken position.
    expect(longest).not.toEqual(shortest);
    expect(longest[0]).not.toBe(shortest[0]);
  });

  it('remembers the chosen sort in local preferences', async () => {
    renderRoute('/search', { path: '/search', element: <SearchPage /> });
    selectOption('Сортировка', 'longest');

    await waitFor(() => expect(loadPreferences().catalogueSort).toBe('longest'));
  });

  it('restores the remembered sort on the next launch', async () => {
    savePreferences(
      normalizePreferences({ catalogueSort: 'longest', preferredAudioLanguages: [] }),
    );
    renderRoute('/search', { path: '/search', element: <SearchPage /> });

    await waitFor(() =>
      expect((screen.getByLabelText('Сортировка') as HTMLSelectElement).value).toBe('longest'),
    );
  });

  it('keeps the language filter active while sorting', async () => {
    savePreferences(normalizePreferences({ preferredAudioLanguages: ['ru'] }));
    renderRoute('/search', { path: '/search', element: <SearchPage /> });

    selectOption('Сортировка', 'shortest');
    await waitFor(() => expect(loadPreferences().catalogueSort).toBe('shortest'));
    expect((screen.getByLabelText('Язык аудиокниги') as HTMLSelectElement).value).toBe('ru');
  });

  it('never changes the interface language when sorting', () => {
    savePreferences(
      normalizePreferences({ uiLocale: 'ru', preferredAudioLanguages: [] }),
    );
    renderRoute('/search', { path: '/search', element: <SearchPage /> });

    selectOption('Сортировка', 'shortest');
    expect(loadPreferences().uiLocale).toBe('ru');
    expect(screen.getByRole('heading', { level: 1, name: 'Поиск' })).toBeTruthy();
  });
});

describe('partial catalogue honesty', () => {
  it('qualifies a duration sort instead of claiming a provider-wide ranking', () => {
    renderApp('/search');
    selectOption('Сортировка', 'longest');

    const body = document.querySelector('.app-main')?.textContent ?? '';
    expect(body).toMatch(/загруженн/i);
    expect(body).toMatch(/не на весь каталог/i);
  });

  it('shows the provider status block on the library screen', () => {
    renderApp('/');
    const main = document.querySelector('.app-main')?.textContent ?? '';
    // Either a load result, a load failure, or a loading state must be visible;
    // silence about a partial catalogue is not acceptable.
    expect(main).toMatch(/LibriVox|Загрузк|Обновить каталог|Не удалось/i);
  });
});
