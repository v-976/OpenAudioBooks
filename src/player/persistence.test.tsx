import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CatalogueProvider } from '../app/CatalogueProvider';
import { UserDataProvider } from '../app/UserDataProvider';
import { PlayerProvider } from './PlayerProvider';
import { AppRoutes } from '../app/AppRoutes';
import { resetDatabaseHandle } from '../persistence/db';
import { getAllUserState, savePlaybackPosition } from '../persistence/userStateRepository';

const EDITION = 'dev:edition:salt-and-lanterns:archive-en';
const EDITION_PATH = '/editions/dev%3Aedition%3Asalt-and-lanterns%3Aarchive-en';

beforeEach(() => {
  resetDatabaseHandle();
  globalThis.indexedDB = new IDBFactory();
});

function mediaElement(): HTMLAudioElement {
  const audio = document.querySelector('audio[data-testid="player-audio"]');
  if (!(audio instanceof HTMLAudioElement)) {
    throw new Error('Player audio element not found');
  }
  return audio;
}

async function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <CatalogueProvider>
        <UserDataProvider>
          <PlayerProvider>
            <AppRoutes />
          </PlayerProvider>
        </UserDataProvider>
      </CatalogueProvider>
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.queryByText(/Reading local storage/i)).toBeNull());
}

/** Seeds a persisted position, exactly as a previous session would leave it. */
async function seedPosition(editionId: string, trackId: string, positionSeconds: number) {
  await savePlaybackPosition({
    audioEditionId: editionId,
    trackId,
    positionSeconds,
    playbackRate: 1,
    lastPlayedAt: '2026-02-01T10:00:00.000Z',
  });
}

/**
 * jsdom cannot decode media, so `load()` never produces real metadata. Firing
 * `loadedmetadata` after the source is set is what the player waits for before
 * applying the resume offset.
 */
async function waitForTrack(fixture: string) {
  await waitFor(() => expect(mediaElement().src).toContain(fixture));
  await act(async () => {
    Object.defineProperty(mediaElement(), 'duration', {
      configurable: true,
      value: 8,
    });
    mediaElement().dispatchEvent(new Event('loadedmetadata'));
  });
}

async function startPlayback(path: string, buttonName: RegExp, fixture: string) {
  await renderAt(path);
  const button = await screen.findByRole('button', { name: buttonName });
  await act(async () => {
    button.click();
  });
  await waitForTrack(fixture);
  return mediaElement();
}

/** The transport lives on the Now Playing screen; navigate there the real way. */
async function openTransport() {
  const nav = await screen.findByRole('link', { name: /Now Playing/ });
  await act(async () => {
    nav.click();
  });
  await screen.findByRole('group', { name: 'Playback controls' });
}

/**
 * The mini player also renders a play/pause button, so the transport is
 * addressed through its own group to avoid ambiguity.
 */
function transportControl(name: string | RegExp): HTMLElement {
  const group = screen.getByRole('group', { name: 'Playback controls' });
  return within(group).getByRole('button', { name });
}

function pauseInTransport(): HTMLElement {
  return transportControl('Pause');
}

describe('playback persistence across restarts', () => {
  it('writes a played position to local storage', async () => {
    await startPlayback(EDITION_PATH, /Play from start/, 'tone-a.wav');

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
      expect(stored[0].trackId).toBe('dev:track:salt-archive:1');
      expect(stored[0].positionSeconds).toBeCloseTo(3.5, 1);
    });
  });

  it('offers a resume button at the stored position', async () => {
    await seedPosition(EDITION, 'dev:track:salt-archive:2', 4);
    await renderAt(EDITION_PATH);

    const resume = await screen.findByRole('button', { name: /Resume at 0:04/ });
    await act(async () => {
      resume.click();
    });

    // Resuming loads the stored track, not the first one.
    await waitForTrack('tone-b.wav');
    await waitFor(() => expect(mediaElement().currentTime).toBeCloseTo(4, 0));
  });

  it('restores the exact position on a fresh start of the app', async () => {
    await seedPosition(EDITION, 'dev:track:salt-archive:2', 4);

    // New provider stack, new media element: only IndexedDB survives.
    await startPlayback(EDITION_PATH, /Resume at 0:04/, 'tone-b.wav');

    expect(mediaElement().currentTime).toBeCloseTo(4, 0);
  });

  it('resumes at the stored chapter when no track is requested', async () => {
    // The failure this guards against: pressing a bare Play/Resume on an edition
    // silently starting at chapter 1 instead of the saved position.
    await seedPosition(EDITION, 'dev:track:salt-archive:2', 4);
    await renderAt('/now-playing');

    const resume = await screen.findByRole('button', { name: 'Resume' });
    await act(async () => {
      resume.click();
    });

    await waitForTrack('tone-b.wav');
    await waitFor(() => expect(mediaElement().currentTime).toBeCloseTo(4, 0));
  });

  it('lists a started edition under continue listening', async () => {
    await seedPosition(EDITION, 'dev:track:salt-archive:1', 2);
    await renderAt('/my-books');

    expect(await screen.findByRole('tab', { name: 'Continue listening' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Resume' })).toBeTruthy();
  });

  it('does not leak state between two editions of the same work', async () => {
    await seedPosition(EDITION, 'dev:track:salt-archive:1', 5);

    const otherEditionPath =
      '/editions/dev%3Aedition%3Asalt-and-lanterns%3Adonated-en';
    await renderAt(otherEditionPath);

    // The other edition of the same work has no saved state of its own.
    expect(
      await screen.findByText(/Each edition keeps its own playback position/i),
    ).toBeTruthy();
    const states = await getAllUserState();
    expect(states.map((state) => state.audioEditionId)).toEqual([EDITION]);
  });
});

describe('player controls', () => {
  it('exposes the full transport with accessible labels', async () => {
    await startPlayback(EDITION_PATH, /Play from start/, 'tone-a.wav');
    await openTransport();

    expect(screen.getByRole('button', { name: 'Previous track' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next track' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Skip back/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Skip forward/ })).toBeTruthy();
    expect(screen.getByRole('slider', { name: /Seek within current track/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bookmark here' })).toBeTruthy();
  });

  it('switches to the next track and persists the new track id', async () => {
    await startPlayback(EDITION_PATH, /Play from start/, 'tone-a.wav');
    await openTransport();

    await act(async () => {
      screen.getByRole('button', { name: 'Next track' }).click();
    });
    await waitForTrack('tone-b.wav');

    await waitFor(async () => {
      const stored = await getAllUserState();
      expect(stored[0]?.trackId).toBe('dev:track:salt-archive:2');
    });
  });

  it('stores a bookmark at the current position', async () => {
    await startPlayback(EDITION_PATH, /Play from start/, 'tone-a.wav');
    await openTransport();

    await act(async () => {
      mediaElement().currentTime = 2;
      mediaElement().dispatchEvent(new Event('timeupdate'));
    });
    await act(async () => {
      screen.getByRole('button', { name: 'Bookmark here' }).click();
    });

    const { getBookmarks } = await import('../persistence/userStateRepository');
    const bookmarks = await getBookmarks(EDITION);
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].positionSeconds).toBeCloseTo(2, 0);
    expect(bookmarks[0].audioEditionId).toBe(EDITION);
  });

  it('seeks and persists the new position', async () => {
    await startPlayback(EDITION_PATH, /Play from start/, 'tone-a.wav');
    await openTransport();

    await act(async () => {
      const slider = screen.getByRole('slider', { name: /Seek within current track/i });
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
});
