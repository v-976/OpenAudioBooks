import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import indexJson from '../../public/data/mds-index.json';
import type { MdsIndex } from '../sources/mds/types';
import { renderApp, waitForUserData } from '../test/renderApp';
import { resetDatabaseHandle } from '../persistence/db';
import { getAllUserState, savePlaybackPosition } from '../persistence/userStateRepository';
import { normalizePreferences, savePreferences } from '../persistence/preferencesRepository';

const index = indexJson as MdsIndex;
const record = index.records.find((item) => item.durationSeconds === 822)!;
const editionId = `mds:edition:${record.id}`;
const trackId = `mds:track:${record.id}`;
const options = { includeStaticSources: true, mdsIndex: index };

function audio(): HTMLAudioElement {
  return screen.getByTestId('player-audio') as HTMLAudioElement;
}

async function expectSaved(position: number) {
  await waitFor(async () => {
    expect((await getAllUserState()).find((item) => item.audioEditionId === editionId))
      .toMatchObject({ trackId, positionSeconds: position });
  });
}

async function open(locale = 'ru') {
  const app = renderApp('/now-playing', locale, options);
  await waitForUserData();
  await waitFor(() => expect(document.querySelector('.mini-player__time')?.textContent)
    .toBe('2:47 / 13:42'));
  return app;
}

beforeEach(async () => {
  resetDatabaseHandle();
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
  savePreferences(normalizePreferences({ lastAudioEditionId: editionId }));
  await savePlaybackPosition({
    audioEditionId: editionId,
    trackId,
    positionSeconds: 167,
    playbackRate: 1,
    lastPlayedAt: '2026-02-01T10:00:00.000Z',
  });
  resetDatabaseHandle();
});

afterEach(() => vi.restoreAllMocks());

describe('local progress before media initialization', () => {
  it('restores cold offline UI and mini-player without metadata or autoplay', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play');
    const app = await open();
    expect(play).not.toHaveBeenCalled();
    expect(document.querySelector('.progress__edition')?.textContent).toContain('2:47');
    expect(document.querySelector('.progress__edition')?.textContent).toContain('13:42');
    expect(document.querySelector('.progress__edition')?.textContent).toContain('20%');
    await act(async () => {
      fireEvent.emptied(audio());
      audio().currentTime = 0;
      fireEvent.timeUpdate(audio());
      fireEvent.durationChange(audio());
      fireEvent.error(audio());
      window.dispatchEvent(new Event('pagehide'));
    });
    await expectSaved(167);
    app.unmount();
    resetDatabaseHandle();
    await open();
    await expectSaved(167);
  });

  it('does not replace saved progress on failed online load or lifecycle flush', async () => {
    await open();
    await act(async () => {
      fireEvent.error(audio());
      audio().currentTime = 0;
      fireEvent.timeUpdate(audio());
      window.dispatchEvent(new Event('pagehide'));
    });
    expect((await screen.findByRole('alert')).textContent).toContain('Не удалось загрузить аудио');
    await expectSaved(167);
    expect(document.querySelector('.mini-player__time')?.textContent).toBe('2:47 / 13:42');
  });

  it.each([0, NaN])('ignores invalid media duration %s and reset time after initialization', async (duration) => {
    await open();
    await act(async () => {
      Object.defineProperty(audio(), 'duration', { configurable: true, value: 822 });
      fireEvent.loadedMetadata(audio());
      Object.defineProperty(audio(), 'duration', { configurable: true, value: duration });
      audio().currentTime = 0;
      fireEvent.durationChange(audio());
      fireEvent.timeUpdate(audio());
      window.dispatchEvent(new Event('pagehide'));
    });
    await expectSaved(167);
    expect(document.querySelector('.mini-player__time')?.textContent).toBe('2:47 / 13:42');
  });

  it('classifies an offline play request for an edition not yet loaded', async () => {
    savePreferences(normalizePreferences({}));
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play');
    renderApp(`/editions/${encodeURIComponent(editionId)}`, 'ru', options);
    await waitForUserData();
    const resume = await screen.findByRole('button', { name: /Продолжить с 2:47/ });
    await act(async () => resume.click());
    expect(screen.getByRole('alert').textContent).toBe('Аудио недоступно без подключения к интернету.');
    expect(play).not.toHaveBeenCalled();
    await expectSaved(167);
  });

  it.each([
    ['ru', 'Аудио недоступно без подключения к интернету.'],
    ['en', 'Audio is unavailable without an internet connection.'],
    ['ro', 'Conținutul audio nu este disponibil fără conexiune la internet.'],
  ])('classifies offline play in %s without claiming browser rejection', async (locale, message) => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play');
    await open(locale);
    await act(async () => {
      within(document.querySelector('.transport') as HTMLElement).getAllByRole('button')[2].click();
    });
    expect(screen.getByRole('alert').textContent).toBe(message);
    expect(play).not.toHaveBeenCalled();
    await expectSaved(167);
  });

  it('distinguishes online autoplay rejection from source failure', async () => {
    await open();
    vi.spyOn(HTMLMediaElement.prototype, 'play')
      .mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'))
      .mockRejectedValueOnce(new DOMException('Source failed', 'NotSupportedError'));
    const play = within(document.querySelector('.transport') as HTMLElement)
      .getByRole('button', { name: 'Слушать' });
    await act(async () => play.click());
    expect(screen.getByRole('alert').textContent).toContain('Браузер не разрешил');
    await act(async () => play.click());
    expect(screen.getByRole('alert').textContent).toContain('Не удалось загрузить аудио');
    await expectSaved(167);
  });

  it('applies the local offset when media loads, then persists playback and seeks across restart', async () => {
    const app = await open();
    await act(async () => {
      Object.defineProperty(audio(), 'duration', { configurable: true, value: 822 });
      fireEvent.loadedMetadata(audio());
    });
    expect(audio().currentTime).toBe(167);
    await act(async () => {
      within(document.querySelector('.transport') as HTMLElement)
        .getByRole('button', { name: 'Слушать' }).click();
      audio().currentTime = 180;
      fireEvent.timeUpdate(audio());
    });
    await act(async () => {
      within(document.querySelector('.transport') as HTMLElement)
        .getByRole('button', { name: 'Пауза' }).click();
    });
    await expectSaved(180);
    await act(async () => {
      fireEvent.change(screen.getByRole('slider'), { target: { value: '167' } });
    });
    expect(audio().currentTime).toBe(167);
    await expectSaved(167);
    app.unmount();
    resetDatabaseHandle();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await open();
    await expectSaved(167);
  });
});
