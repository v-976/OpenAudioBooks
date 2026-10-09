import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import indexJson from '../../public/data/mds-index.json';
import type { MdsIndex } from '../sources/mds/types';
import { renderApp, waitForUserData } from '../test/renderApp';
import { resetDatabaseHandle } from '../persistence/db';
import { normalizePreferences, savePreferences } from '../persistence/preferencesRepository';
import { getAllUserState } from '../persistence/userStateRepository';

const index = indexJson as MdsIndex;

beforeEach(() => {
  resetDatabaseHandle();
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
  savePreferences(normalizePreferences({ preferredAudioLanguages: ['ru'] }));
});

function playerAudio(): HTMLAudioElement {
  const audio = document.querySelector('audio[data-testid="player-audio"]');
  if (!(audio instanceof HTMLAudioElement)) throw new Error('Player audio element not found');
  return audio;
}

describe('MDS playback through the shared player', () => {
  it('opens Now Playing, supports pause/resume, and persists the MDS position', async () => {
    const titleCounts = new Map<string, number>();
    for (const item of index.records) {
      titleCounts.set(item.title, (titleCounts.get(item.title) ?? 0) + 1);
    }
    const record = index.records.find((candidate) => titleCounts.get(candidate.title) === 1);
    if (!record) throw new Error('The MDS index has no uniquely titled record');
    renderApp(`/search?q=${encodeURIComponent(record.title)}&source=mds`, 'ru', {
      includeStaticSources: true,
      mdsIndex: index,
    });
    await waitForUserData();

    const title = await screen.findByRole('link', { name: record.title });
    const card = title.closest('.card');
    if (!(card instanceof HTMLElement)) throw new Error('MDS card not found');
    await act(async () => {
      within(card).getByRole('button', { name: 'Слушать' }).click();
    });

    const nowPlayingLink = await screen.findByRole('link', { name: /Сейчас играет/ });
    expect(nowPlayingLink.getAttribute('aria-current')).toBe('page');
    expect(playerAudio().src).toBe(`https://mds-old.ru/api/play/${record.id}`);
    expect(playerAudio().paused).toBe(false);
    const transport = screen.getByRole('group', { name: 'Слушать' });

    await act(async () => {
      within(transport).getByRole('button', { name: 'Пауза' }).click();
    });
    expect(playerAudio().paused).toBe(true);

    await act(async () => {
      within(transport).getByRole('button', { name: 'Слушать' }).click();
    });
    expect(playerAudio().paused).toBe(false);

    Object.defineProperty(playerAudio(), 'duration', { configurable: true, value: 600 });
    playerAudio().currentTime = 73;
    fireEvent.timeUpdate(playerAudio());
    await act(async () => {
      within(transport).getByRole('button', { name: 'Пауза' }).click();
    });

    await waitFor(async () => {
      const saved = await getAllUserState();
      expect(saved.find((state) => state.audioEditionId === `mds:edition:${record.id}`)).toMatchObject({
        trackId: `mds:track:${record.id}`,
        positionSeconds: 73,
      });
    });

    await act(async () => playerAudio().dispatchEvent(new Event('error')));
    expect((await screen.findByRole('alert')).textContent).toMatch(
      /Не удалось загрузить аудио из источника/i,
    );
  });
});
