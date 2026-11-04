import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadPreferences,
  savePreferences,
  normalizePreferences,
} from './preferencesRepository';

beforeEach(() => {
  localStorage.clear();
});

describe('first-launch locale detection', () => {
  it('detects supported browser languages (ru, en, ro)', () => {
    // Simulate a Russian browser
    const originalLanguage = Object.getOwnPropertyDescriptor(navigator, 'language');
    Object.defineProperty(navigator, 'language', { value: 'ru-RU', configurable: true });

    const prefs = loadPreferences();
    expect(prefs.uiLocale).toBe('ru');

    // Restore
    if (originalLanguage) Object.defineProperty(navigator, 'language', originalLanguage);
  });

  it('falls back to English for unsupported browser languages', () => {
    // Simulate a Finnish browser (fi is supported for audio but not UI)
    const originalLanguage = Object.getOwnPropertyDescriptor(navigator, 'language');
    Object.defineProperty(navigator, 'language', { value: 'fi-FI', configurable: true });

    const prefs = loadPreferences();
    expect(prefs.uiLocale).toBe('en');

    // Restore
    if (originalLanguage) Object.defineProperty(navigator, 'language', originalLanguage);
  });

  it('falls back to English for Greek (el) browser', () => {
    const originalLanguage = Object.getOwnPropertyDescriptor(navigator, 'language');
    Object.defineProperty(navigator, 'language', { value: 'el-GR', configurable: true });

    const prefs = loadPreferences();
    expect(prefs.uiLocale).toBe('en');

    if (originalLanguage) Object.defineProperty(navigator, 'language', originalLanguage);
  });

  it('saved manual choice always wins over browser detection', () => {
    // User manually chose Romanian
    savePreferences(normalizePreferences({ uiLocale: 'ro' }));

    // Even if browser is Russian, saved choice wins
    const originalLanguage = Object.getOwnPropertyDescriptor(navigator, 'language');
    Object.defineProperty(navigator, 'language', { value: 'ru-RU', configurable: true });

    const prefs = loadPreferences();
    expect(prefs.uiLocale).toBe('ro');

    if (originalLanguage) Object.defineProperty(navigator, 'language', originalLanguage);
  });

  it('first launch persists the detected locale', () => {
    const originalLanguage = Object.getOwnPropertyDescriptor(navigator, 'language');
    Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });

    // First load detects and saves
    loadPreferences();

    // Second load reads from storage (not re-detecting)
    const stored = JSON.parse(localStorage.getItem('openaudiobooks.preferences.v1') ?? '{}');
    expect(stored.uiLocale).toBe('en');

    if (originalLanguage) Object.defineProperty(navigator, 'language', originalLanguage);
  });
});

describe('language settings independence', () => {
  it('changing uiLocale does not affect preferredAudioLanguages', () => {
    savePreferences(
      normalizePreferences({ uiLocale: 'ru', preferredAudioLanguages: ['fi', 'de'] }),
    );

    // Change UI locale to English
    savePreferences(
      normalizePreferences({ uiLocale: 'en', preferredAudioLanguages: ['fi', 'de'] }),
    );

    const prefs = loadPreferences();
    expect(prefs.uiLocale).toBe('en');
    expect(prefs.preferredAudioLanguages).toEqual(['fi', 'de']);
  });

  it('changing preferredAudioLanguages does not affect uiLocale', () => {
    savePreferences(
      normalizePreferences({ uiLocale: 'ro', preferredAudioLanguages: ['ru'] }),
    );

    // Add more audio languages
    savePreferences(
      normalizePreferences({ uiLocale: 'ro', preferredAudioLanguages: ['ru', 'en', 'fi'] }),
    );

    const prefs = loadPreferences();
    expect(prefs.uiLocale).toBe('ro');
    expect(prefs.preferredAudioLanguages).toEqual(['ru', 'en', 'fi']);
  });

  it('preserves existing data when changing language settings', () => {
    // Save initial preferences
    savePreferences(
      normalizePreferences({
        uiLocale: 'ru',
        preferredAudioLanguages: ['ru'],
        playbackRate: 1.5,
        skipForwardSeconds: 30,
      }),
    );

    // Change UI locale only
    savePreferences(
      normalizePreferences({
        uiLocale: 'en',
        preferredAudioLanguages: ['ru'],
        playbackRate: 1.5,
        skipForwardSeconds: 30,
      }),
    );

    const prefs = loadPreferences();
    expect(prefs.uiLocale).toBe('en');
    expect(prefs.playbackRate).toBe(1.5);
    expect(prefs.skipForwardSeconds).toBe(30);
  });
});
