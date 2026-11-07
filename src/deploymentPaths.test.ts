// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const workerSource = readFileSync(resolve('public/sw.js'), 'utf8');
const manifest = JSON.parse(readFileSync(resolve('public/manifest.webmanifest'), 'utf8'));

function worker(base = '/OpenAudioBooks/') {
  const scope = `https://example.invalid${base}`;
  const prefix = `openaudiobooks-shell-${encodeURIComponent(base)}-`;
  type WorkerEvent = {
    request?: { method: string; url: string; mode: string };
    waitUntil?: (task: Promise<unknown>) => void;
    respondWith?: (response: Promise<unknown>) => void;
  };
  const handlers = new Map<string, Array<(event: WorkerEvent) => void>>();
  const cache = {
    addAll: vi.fn().mockResolvedValue(undefined),
    match: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi.fn().mockResolvedValue([`${prefix}v4`, `${prefix}v5`, 'other-app', 'openaudiobooks-shell-other-v5']),
    delete: vi.fn().mockResolvedValue(true),
  };
  const fetch = vi.fn().mockRejectedValue(new Error('offline'));
  runInNewContext(workerSource, {
    URL, caches, fetch,
    self: {
      registration: { scope },
      skipWaiting: vi.fn().mockResolvedValue(undefined),
      clients: { claim: vi.fn().mockResolvedValue(undefined), matchAll: vi.fn().mockResolvedValue([]) },
      addEventListener(type: string, handler: (event: WorkerEvent) => void) {
        handlers.set(type, [...(handlers.get(type) ?? []), handler]);
      },
    },
  });
  const dispatch = (type: string, event: WorkerEvent) => handlers.get(type)?.forEach((handler) => handler(event));
  return { scope, prefix, cache, caches, fetch, dispatch };
}

describe('deployment paths at root and project scope', () => {
  it.each(['/', '/OpenAudioBooks/'])('resolves manifest and precache within %s', async (base) => {
    const { scope, dispatch, cache } = worker(base);
    for (const field of ['id', 'start_url', 'scope']) {
      expect(new URL(manifest[field], `${scope}manifest.webmanifest`).href).toBe(scope);
    }
    for (const icon of manifest.icons) {
      expect(new URL(icon.src, `${scope}manifest.webmanifest`).href).toBe(`${scope}${icon.src}`);
    }
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('any');
    const tasks: Promise<unknown>[] = [];
    dispatch('install', { waitUntil: (task) => { tasks.push(task); } });
    await Promise.all(tasks);
    expect(cache.addAll).toHaveBeenCalledWith([
      scope, `${scope}index.html`, `${scope}manifest.webmanifest`,
      `${scope}icons/icon-192.png`, `${scope}icons/icon-512.png`,
    ]);
  });

  it('cleans up only this scope’s old caches', async () => {
    const { dispatch, caches, prefix } = worker();
    const tasks: Promise<unknown>[] = [];
    dispatch('activate', { waitUntil: (task) => { tasks.push(task); } });
    await Promise.all(tasks);
    expect(caches.delete.mock.calls).toEqual([[`${prefix}v4`]]);
  });

  it('uses the scoped shell for an offline deep link', async () => {
    const { scope, dispatch, cache } = worker();
    cache.match.mockResolvedValue(new Response('shell'));
    const respondWith = vi.fn();
    dispatch('fetch', {
      request: { method: 'GET', url: `${scope}now-playing`, mode: 'navigate' }, respondWith,
    });
    const response = await respondWith.mock.calls[0][0] as Response;
    expect(await response.text()).toBe('shell');
    expect(cache.match).toHaveBeenCalledWith(`${scope}index.html`);
  });

  it('never caches a Pages 404 navigation over the shell', async () => {
    const { scope, dispatch, fetch, cache } = worker();
    fetch.mockResolvedValue(new Response('SPA fallback', { status: 404 }));
    const respondWith = vi.fn();
    dispatch('fetch', {
      request: { method: 'GET', url: `${scope}settings`, mode: 'navigate' }, respondWith,
    });
    expect((await respondWith.mock.calls[0][0]).status).toBe(404);
    expect(cache.put).not.toHaveBeenCalled();
  });

  it('does not intercept external audio or same-origin paths outside the app', () => {
    const { dispatch, fetch } = worker();
    const respondWith = vi.fn();
    for (const url of ['https://audio.example.invalid/dev:track.mp3', 'https://example.invalid/another-app/']) {
      dispatch('fetch', { request: { method: 'GET', url, mode: 'cors' }, respondWith });
    }
    expect(respondWith).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
