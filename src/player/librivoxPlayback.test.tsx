import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { act, screen, waitFor, within } from '@testing-library/react';
import { renderApp, waitForUserData } from '../test/renderApp';
import { resetDatabaseHandle } from '../persistence/db';
import { writeCachedProjects } from '../persistence/catalogueCacheRepository';
import { normalizePreferences, savePreferences } from '../persistence/preferencesRepository';
import {
  RUSSIAN_PROJECT,
  SPARSE_PROJECT,
} from '../sources/librivox/fixtures';

const FETCHED_AT = '2026-10-08T00:00:00.000Z';

beforeEach(() => {
  resetDatabaseHandle();
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
  savePreferences(normalizePreferences({ preferredAudioLanguages: [] }));
});

function playerAudio(): HTMLAudioElement {
  const audio = document.querySelector('audio[data-testid="player-audio"]');
  if (!(audio instanceof HTMLAudioElement)) throw new Error('Player audio element not found');
  return audio;
}

describe('LibriVox Listen button regression', () => {
  it('loads the real LibriVox MP3 queue and opens the player', async () => {
    await writeCachedProjects([
      { id: '559', project: RUSSIAN_PROJECT, fetchedAt: FETCHED_AT },
    ]);
    renderApp('/search');
    await waitForUserData();

    const title = await screen.findByText('Zapiski iz podpolya (Notes from the Underground)');
    const card = title.closest('.card');
    if (!(card instanceof HTMLElement)) throw new Error('LibriVox card not found');

    await act(async () => {
      within(card).getByRole('button', { name: 'Слушать' }).click();
    });

    await waitFor(() => {
      expect(playerAudio().src).toBe(
        'https://www.archive.org/download/notes_underground_russian/01-dostoevsky-zapiski-iz-podpolya-I-01-02_64kb.mp3',
      );
      expect(document.querySelector('.mini-player')).not.toBeNull();
    });

    // Follow the real mini-player route and verify that the complete LibriVox
    // section list became the player's chapter queue, not development audio.
    const miniPlayerLink = document.querySelector('.mini-player__meta');
    if (!(miniPlayerLink instanceof HTMLElement)) throw new Error('Mini-player link not found');
    await act(async () => miniPlayerLink.click());

    await screen.findByRole('heading', { name: 'Главы' });
    const list = document.querySelector('.track-list');
    if (!(list instanceof HTMLElement)) throw new Error('Track list not found');
    expect(within(list).getAllByRole('button')).toHaveLength(3);
    expect(playerAudio().src).not.toContain('tone-');
  });

  it('shows a visible error instead of ignoring Listen when no audio exists', async () => {
    await writeCachedProjects([
      { id: '902', project: SPARSE_PROJECT, fetchedAt: FETCHED_AT },
    ]);
    renderApp('/search');
    await waitForUserData();

    const title = await screen.findByText('Minimal Record');
    const card = title.closest('.card');
    if (!(card instanceof HTMLElement)) throw new Error('Sparse LibriVox card not found');

    await act(async () => {
      within(card).getByRole('button', { name: 'Слушать' }).click();
    });

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/Для этой аудиокниги нет доступных аудиофайлов/i);
    expect(document.querySelector('.mini-player')).toBeNull();
    expect(playerAudio().src).toBe('');
  });

  it('shows a visible source error when the real media element cannot load the MP3', async () => {
    await writeCachedProjects([
      { id: '559', project: RUSSIAN_PROJECT, fetchedAt: FETCHED_AT },
    ]);
    renderApp('/search');
    await waitForUserData();

    const title = await screen.findByText('Zapiski iz podpolya (Notes from the Underground)');
    const card = title.closest('.card');
    if (!(card instanceof HTMLElement)) throw new Error('LibriVox card not found');
    await act(async () => {
      within(card).getByRole('button', { name: 'Слушать' }).click();
    });
    await waitFor(() => expect(playerAudio().src).toContain('archive.org'));

    await act(async () => playerAudio().dispatchEvent(new Event('error')));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/Не удалось загрузить аудио из источника/i);
  });
});
