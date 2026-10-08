import type { LocaleBundle } from './keys';

/**
 * English — INTENTIONALLY INCOMPLETE.
 *
 * This bundle exists to prove that the localization layer, plural handling and
 * fallback chain work for a second locale, and to give future English work a
 * place to start. It is not offered as a selectable UI locale in Alpha 0.1.1
 * (see `TRANSLATED_UI_LOCALES`), and the interface never claims English
 * localisation is finished.
 *
 * Any key missing here resolves through the fallback chain, i.e. it is shown in
 * Russian. That is a deliberate, visible state rather than a hidden failure.
 */
export const enBundle: LocaleBundle = {
  'common.source': 'Source',
  'common.narratedBy': 'Narrated by',
  'common.originalLanguage': 'Original language',
  'nav.library': 'Library',
  'nav.search': 'Search',
  'nav.nowPlaying': 'Now Playing',
  'nav.myBooks': 'My Books',
  'player.play': 'Play',
  'player.pause': 'Pause',
  'player.speed': 'Speed',
  'player.bookmarkHere': 'Bookmark here',
  'player.previousTrack': 'Previous track',
  'player.nextTrack': 'Next track',
  'rights.publicDomain': 'Public domain',
  'rights.unknown': 'Rights unknown',
  'status.alpha': 'Alpha · development only · not production-ready',
};
