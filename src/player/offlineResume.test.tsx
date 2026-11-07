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

/** Only model the failed-resource/reset contract; no media bytes or redirects. */
function failedResource() {
  const element = audio();
  Object.defineProperty(element, 'error', { configurable: true, value: { code: 2 } });
  Object.defineProperty(element, 'networkState', { configurable: true, value: 3 });
  Object.defineProperty(element, 'readyState', { configurable: true, value: 0 });
  Object.defineProperty(element, 'paused', { configurable: true, value: true });
  element.currentTime = 0;
}

function retryLifecycle() {
  const element = audio();
  const load = vi.spyOn(element, 'load').mockImplementation(() => {
    // A fresh resource selection clears the terminal media error.
    expect(element.src).toBe(`https://mds-old.ru/api/play/${record.id}`);
    Object.defineProperty(element, 'error', { configurable: true, value: null });
    Object.defineProperty(element, 'networkState', { configurable: true, value: 2 });
    Object.defineProperty(element, 'readyState', { configurable: true, value: 0 });
    element.currentTime = 0;
    fireEvent.emptied(element);
    fireEvent.timeUpdate(element);
  });
  const play = vi.spyOn(element, 'play').mockImplementation(async () => {
    if (element.error) throw new DOMException('Failed resource', 'NotSupportedError');
    Object.defineProperty(element, 'paused', { configurable: true, value: false });
    fireEvent.play(element);
  });
  return { load, play };
}

async function pressPlay() {
  await act(async () => within(document.querySelector('.transport') as HTMLElement)
    .getByRole('button', { name: 'Слушать' }).click());
}

async function finishRetry() {
  await act(async () => {
    Object.defineProperty(audio(), 'duration', { configurable: true, value: 822 });
    Object.defineProperty(audio(), 'readyState', { configurable: true, value: 1 });
    fireEvent.loadedMetadata(audio());
    fireEvent.playing(audio());
    window.dispatchEvent(new Event('pagehide'));
  });
  expect(audio().currentTime).toBe(167);
  expect(screen.queryByRole('alert')).toBeNull();
  await expectSaved(167);
}

describe('explicit playback recovery after a failed resource', () => {
  it('reloads the stable MDS URL after offline cold start and resumes without losing progress', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const app = await open();
    const { load, play } = retryLifecycle();
    const redirected = vi.spyOn(audio(), 'currentSrc', 'get')
      .mockReturnValue('https://example.invalid/dev:expired.mp3?signature=dev:expired');
    const setSource = vi.spyOn(audio(), 'src', 'set');
    await act(async () => {
      failedResource();
      fireEvent.error(audio());
    });
    expect(screen.getByRole('alert').textContent).toContain('без подключения к интернету');
    online.mockReturnValue(true);
    await act(async () => window.dispatchEvent(new Event('online')));
    expect(load).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
    await pressPlay();
    expect(load).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledTimes(1);
    expect(setSource).toHaveBeenCalledWith(`https://mds-old.ru/api/play/${record.id}`);
    expect(redirected).not.toHaveBeenCalled();
    expect(audio().currentTime).toBe(0); // not yet initialized, never authoritative
    expect(document.querySelector('.mini-player__time')?.textContent).toBe('2:47 / 13:42');
    await act(async () => window.dispatchEvent(new Event('pagehide')));
    await expectSaved(167);
    await finishRetry();
    app.unmount();
    resetDatabaseHandle();
    online.mockReturnValue(false);
    await open();
    await expectSaved(167);
  });

  it('makes a fresh load on every explicit retry after another media error', async () => {
    await open();
    const { load, play } = retryLifecycle();
    for (let attempt = 1; attempt <= 2; attempt++) {
      await act(async () => {
        failedResource();
        fireEvent.error(audio());
      });
      expect(screen.getByRole('alert').textContent).toContain('Не удалось загрузить аудио');
      await pressPlay();
      expect(load).toHaveBeenCalledTimes(attempt);
      expect(play).toHaveBeenCalledTimes(attempt);
      await expectSaved(167);
    }
    await finishRetry();
  });

  it('does not retry or play while still offline after media error', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await open();
    const { load, play } = retryLifecycle();
    await act(async () => {
      failedResource();
      fireEvent.error(audio());
    });
    await pressPlay();
    expect(load).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('без подключения к интернету');
    await expectSaved(167);
  });

  it('ignores an older play rejection aborted by a newer resource load', async () => {
    await open();
    const { load, play } = retryLifecycle();
    let rejectEarlier: (reason: unknown) => void = () => { throw new Error('No pending play'); };
    play.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { rejectEarlier = reject; }));
    await act(async () => {
      failedResource();
      fireEvent.error(audio());
    });
    await pressPlay();
    await act(async () => {
      failedResource();
      fireEvent.error(audio());
    });
    await pressPlay();
    expect(load).toHaveBeenCalledTimes(2);
    await finishRetry();
    await act(async () => rejectEarlier(new DOMException('Superseded by load()', 'AbortError')));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(within(document.querySelector('.transport') as HTMLElement)
      .getByRole('button', { name: 'Пауза' })).toBeTruthy();
    await expectSaved(167);
  });

  it('keeps real browser rejection distinct when a recovered resource cannot autoplay', async () => {
    await open();
    const { load, play } = retryLifecycle();
    await act(async () => {
      failedResource();
      fireEvent.error(audio());
    });
    play.mockRejectedValueOnce(new DOMException('User activation required', 'NotAllowedError'));
    await pressPlay();
    expect(screen.getByRole('alert').textContent).toContain('Браузер не разрешил');
    await expectSaved(167);
    await pressPlay();
    expect(load).toHaveBeenCalledTimes(1); // permission failure is not a failed source
    await finishRetry();
  });

  it('retries a source failure reported by play() even without a media error event', async () => {
    await open();
    const { load, play } = retryLifecycle();
    play.mockRejectedValueOnce(new DOMException('Source failed', 'NotSupportedError'));
    await pressPlay();
    expect(screen.getByRole('alert').textContent).toContain('Не удалось загрузить аудио');
    expect(load).not.toHaveBeenCalled();
    await pressPlay();
    expect(load).toHaveBeenCalledTimes(1);
    await finishRetry();
  });

  it('does not classify a cancelled play as a failed resource or reload on the next Play', async () => {
    await open();
    const { load, play } = retryLifecycle();
    play.mockRejectedValueOnce(new DOMException('Interrupted by pause()', 'AbortError'));
    await pressPlay();
    expect(screen.queryByRole('alert')).toBeNull();
    await pressPlay();
    expect(load).not.toHaveBeenCalled();
    await finishRetry();
  });

  it.each(['error', 'networkState'])('detects terminal media %s even before an error event is delivered', async (property) => {
    await open();
    const { load } = retryLifecycle();
    Object.defineProperty(audio(), property, {
      configurable: true, value: property === 'error' ? { code: 4 } : 3,
    });
    await pressPlay();
    expect(load).toHaveBeenCalledTimes(1);
    await finishRetry();
  });

  it('retries the current edition through the My Books Play entry point too', async () => {
    await open();
    const { load } = retryLifecycle();
    await act(async () => {
      failedResource();
      fireEvent.error(audio());
      screen.getByRole('link', { name: 'Моя полка' }).click();
    });
    const resume = await screen.findByRole('button', { name: 'Продолжить' });
    await act(async () => resume.click());
    expect(load).toHaveBeenCalledTimes(1);
    await finishRetry();
  });
});
