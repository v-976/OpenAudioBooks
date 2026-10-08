import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderApp, waitForUserData } from '../test/renderApp';
import { resetDatabaseHandle } from '../persistence/db';
import {
  getAllUserState,
  getBookmarks,
  savePlaybackPosition,
} from '../persistence/userStateRepository';
import {
  loadPreferences,
  normalizePreferences,
  savePreferences,
} from '../persistence/preferencesRepository';

/**
 * Alpha 0.1.0 playback regressions, re-verified under the Russian UI and the
 * language-filtered catalogue of Alpha 0.1.1.
 *
 * The two fixes that must not regress:
 *  - `play(editionId)` restores the stored track and position;
 *  - completion is inferred only from the final track of an edition.
 */

const EDITION = 'dev:edition:mysterious-lighthouse:ru';
const EDITION_PATH = '/editions/dev%3Aedition%3Amysterious-lighthouse%3Aru';
const OTHER_EDITION = 'dev:edition:mysterious-lighthouse:en';
const OTHER_EDITION_PATH = '/editions/dev%3Aedition%3Amysterious-lighthouse%3Aen';

beforeEach(() => {
  resetDatabaseHandle();
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
});

function mediaElement(): HTMLAudioElement {
  const audio = document.querySelector('audio[data-testid="player-audio"]');
  if (!(audio instanceof HTMLAudioElement)) {
    throw new Error('Player audio element not found');
  }
  return audio;
}

/**
 * jsdom cannot decode media, so `load()` never produces real metadata. Firing
 * `loadedmetadata` after the source is set is what the player waits for before
 * applying the resume offset.
 */
async function waitForTrack(fixture: string) {
  await waitFor(() => expect(mediaElement().src).toContain(fixture));
  await act(async () => {
    Object.defineProperty(mediaElement(), 'duration', { configurable: true, value: 8 });
    mediaElement().dispatchEvent(new Event('loadedmetadata'));
  });
}

async function seedPosition(editionId: string, trackId: string, positionSeconds: number) {
  await savePlaybackPosition({
    audioEditionId: editionId,
    trackId,
    positionSeconds,
    playbackRate: 1,
    lastPlayedAt: '2026-02-01T10:00:00.000Z',
  });
}

async function startPlayback(path: string, buttonName: RegExp, fixture: string) {
  renderApp(path);
  await waitForUserData();
  const button = await screen.findByRole('button', { name: buttonName });
  await act(async () => {
    button.click();
  });
  await waitForTrack(fixture);
  return mediaElement();
}

/** The transport lives on the Now Playing screen; navigate there the real way. */
async function openTransport() {
  const nav = await screen.findByRole('link', { name: /Сейчас играет/ });
  await act(async () => {
    nav.click();
  });
  await screen.findByRole('group', { name: /Слушать|Пауза/ });
}

/** The mini player also renders a play/pause button, so scope to the transport. */
function transportControl(name: string | RegExp): HTMLElement {
  const group = screen.getByRole('group', { name: /Слушать|Пауза/ });
  return within(group).getByRole('button', { name });
}

function pauseInTransport(): HTMLElement {
  return transportControl('Пауза');
}

describe('playback persistence across restarts (regression)', () => {
  it('writes a played position to local storage', async () => {
    await startPlayback(EDITION_PATH, /Слушать с начала/, 'tone-a.wav');
    await openTransport();

    await act(async () => {
      mediaElement().currentTime = 3.5;
      mediaElement().dispatchEvent(new Event('timeupdate'));
    });
    await act(async () => {
      pauseInTransport().click();
    });

    await waitFor(async () => {
      const stored = await getAllUserState();
      expect(stored).toHaveLength(1);
      expect(stored[0].audioEditionId).toBe(EDITION);
      expect(stored[0].trackId).toBe('dev:track:lighthouse-ru:1');
      expect(stored[0].positionSeconds).toBeCloseTo(3.5, 1);
    });
  });

  it('offers a resume button at the stored position', async () => {
    await seedPosition(EDITION, 'dev:track:lighthouse-ru:2', 4);
    renderApp(EDITION_PATH);
    await waitForUserData();

    const resume = await screen.findByRole('button', { name: /Продолжить с 0:04/ });
    await act(async () => {
      resume.click();
    });

    // Resuming loads the stored track, not the first one.
    await waitForTrack('tone-b.wav');
    await waitFor(() => expect(mediaElement().currentTime).toBeCloseTo(4, 0));
  });

  it('restores the exact position on a fresh start of the app', async () => {
    await seedPosition(EDITION, 'dev:track:lighthouse-ru:2', 4);
    await startPlayback(EDITION_PATH, /Продолжить с 0:04/, 'tone-b.wav');
    expect(mediaElement().currentTime).toBeCloseTo(4, 0);
  });

  it('resumes at the stored chapter when no track is requested', async () => {
    // The Alpha 0.1.0 fix: a bare Play/Resume must not restart at chapter 1.
    await seedPosition(EDITION, 'dev:track:lighthouse-ru:2', 4);
    renderApp('/now-playing');
    await waitForUserData();

    const resume = await screen.findByRole('button', { name: /Продолжить/ });
    await act(async () => {
      resume.click();
    });

    await waitForTrack('tone-b.wav');
    await waitFor(() => expect(mediaElement().currentTime).toBeCloseTo(4, 0));
  });

  it('lists a started edition under continue listening', async () => {
    await seedPosition(EDITION, 'dev:track:lighthouse-ru:1', 2);
    renderApp('/my-books');
    await waitForUserData();

    expect(await screen.findByRole('tab', { name: 'Продолжить' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Продолжить' })).toBeTruthy();
  });

  it('keeps personal state visible regardless of the language filter', async () => {
    // My Books is personal state, not catalogue browsing: a Russian-only filter
    // must not hide a book the user actually listened to.
    await seedPosition(OTHER_EDITION, 'dev:track:lighthouse-en:1', 2);
    savePreferences(normalizePreferences({ preferredAudioLanguages: ['ru'] }));

    renderApp('/my-books');
    await waitForUserData();

    const titles = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent);
    expect(titles).toContain('Тайна маяка');
    expect(screen.getByText('Язык: Английский')).toBeTruthy();
  });

  it('does not leak state between two editions of the same work', async () => {
    await seedPosition(EDITION, 'dev:track:lighthouse-ru:1', 5);
    savePreferences(normalizePreferences({ preferredAudioLanguages: ['ru', 'en'] }));

    renderApp(OTHER_EDITION_PATH);
    await waitForUserData();

    // The other edition has no saved state of its own: its own note says so, and
    // the sibling edition is the one carrying the stored position.
    const notes = screen.getAllByText(/сохранённый прогресс|не начато/);
    expect(notes.length).toBeGreaterThan(0);
    const states = await getAllUserState();
    expect(states.map((state) => state.audioEditionId)).toEqual([EDITION]);
  });
});

describe('completion semantics (regression)', () => {
  it('does not mark an edition complete when a middle chapter ends', async () => {
    // Chapter 1 of 3 finishing must not complete the book.
    await startPlayback(EDITION_PATH, /Слушать с начала/, 'tone-a.wav');
    await openTransport();

    await act(async () => {
      const audio = mediaElement();
      Object.defineProperty(audio, 'duration', { configurable: true, value: 6 });
      audio.currentTime = 6;
      audio.dispatchEvent(new Event('timeupdate'));
      audio.dispatchEvent(new Event('ended'));
    });

    await waitFor(async () => {
      const stored = await getAllUserState();
      expect(stored[0].completed).toBe(false);
    });
  });

  it('marks the edition complete only after the final chapter ends', async () => {
    await startPlayback(EDITION_PATH, /Слушать с начала/, 'tone-a.wav');
    await openTransport();

    // Walk to the last chapter, then let it end.
    for (const fixture of ['tone-b.wav', 'tone-c.wav']) {
      await act(async () => {
        transportControl('Следующая глава').click();
      });
      await waitForTrack(fixture);
    }
    expect(document.querySelector('.now-playing__track')?.textContent).toBe('Глава 3 — Малая вода');

    await act(async () => {
      const audio = mediaElement();
      Object.defineProperty(audio, 'duration', { configurable: true, value: 5 });
      audio.currentTime = 5;
      audio.dispatchEvent(new Event('timeupdate'));
      audio.dispatchEvent(new Event('ended'));
    });

    await waitFor(async () => {
      const stored = await getAllUserState();
      expect(stored[0].completed).toBe(true);
      // A finished edition rewinds so resuming starts the book again.
      expect(stored[0].positionSeconds).toBe(0);
    });
  });
});

describe('player controls (regression)', () => {
  it('exposes the full transport with Russian accessible labels', async () => {
    await startPlayback(EDITION_PATH, /Слушать с начала/, 'tone-a.wav');
    await openTransport();

    expect(screen.getByRole('button', { name: 'Предыдущая глава' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Следующая глава' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Назад на/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Вперёд на/ })).toBeTruthy();
    expect(screen.getByRole('slider', { name: /Перемотка внутри главы/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Закладка здесь' })).toBeTruthy();
    expect(screen.getByLabelText('Скорость')).toBeTruthy();
  });

  it('switches to the next track and persists the new track id', async () => {
    await startPlayback(EDITION_PATH, /Слушать с начала/, 'tone-a.wav');
    await openTransport();

    await act(async () => {
      transportControl('Следующая глава').click();
    });
    await waitForTrack('tone-b.wav');

    await waitFor(async () => {
      const stored = await getAllUserState();
      expect(stored[0]?.trackId).toBe('dev:track:lighthouse-ru:2');
    });
  });

  it('stores a bookmark at the current position', async () => {
    await startPlayback(EDITION_PATH, /Слушать с начала/, 'tone-a.wav');
    await openTransport();

    await act(async () => {
      mediaElement().currentTime = 2;
      mediaElement().dispatchEvent(new Event('timeupdate'));
    });
    await act(async () => {
      screen.getByRole('button', { name: 'Закладка здесь' }).click();
    });

    const bookmarks = await getBookmarks(EDITION);
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].positionSeconds).toBeCloseTo(2, 0);
    expect(bookmarks[0].audioEditionId).toBe(EDITION);
  });

  it('seeks and persists the new position', async () => {
    await startPlayback(EDITION_PATH, /Слушать с начала/, 'tone-a.wav');
    await openTransport();

    await act(async () => {
      const slider = screen.getByRole('slider', { name: /Перемотка внутри главы/ });
      fireEvent.change(slider, { target: { value: '5' } });
    });
    await act(async () => {
      pauseInTransport().click();
    });

    await waitFor(async () => {
      const stored = await getAllUserState();
      expect(stored[0].positionSeconds).toBeCloseTo(5, 1);
    });
  });

  it('does not touch the audiobook language preference while playing', async () => {
    savePreferences(normalizePreferences({ preferredAudioLanguages: ['ru'] }));
    await startPlayback(EDITION_PATH, /Слушать с начала/, 'tone-a.wav');

    expect(loadPreferences().preferredAudioLanguages).toEqual(['ru']);
    expect(loadPreferences().uiLocale).toBe('ru');
  });
});
