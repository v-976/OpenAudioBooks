import type { CompleteLocaleBundle } from './keys';

/**
 * English — complete translation for Alpha 0.2.1.
 */
export const enBundle: CompleteLocaleBundle = {
  // --- app identity ---------------------------------------------------------
  'app.name': 'OpenAudioBooks',
  'app.tagline': 'Free audiobooks — from their sources',

  'common.back': 'Back',
  'common.cancel': 'Cancel',
  'common.clear': 'Clear',
  'common.clearFilters': 'Reset filters',
  'common.retry': 'Retry',
  'common.skipToContent': 'Skip to content',
  'common.save': 'Save',
  'common.settings': 'Settings',
  'common.dismiss': 'Dismiss',
  'common.unknown': 'Unknown',
  'common.loading': 'Loading…',
  'common.error': 'Error',
  'common.notSpecified': 'Not specified',
  'common.source': 'Source',
  'common.originalSource': 'Source page',
  'common.language': 'Language',
  'common.languageUnknown': 'Language unknown',
  'common.durationUnknown': 'Duration unknown',
  'common.narrator': 'Narrator',
  'common.narratedBy': 'Narrated by',
  'common.author': 'Author',
  'common.genre': 'Genre',
  'common.duration': 'Duration',
  'common.tracks': 'Chapters',
  'common.track': 'Chapter',
  'common.release': 'Release info',
  'common.rights': 'Rights',
  'common.identifier': 'Identifier',
  'common.availability': 'Availability',
  'common.attribution': 'Attribution',
  'common.type': 'Type',
  'common.series': 'Series',
  'common.bookInSeries': 'book {position}',
  'common.originalLanguage': 'Original language',
  'common.alsoKnownAs': 'Also known as',
  'common.bio': 'Bio',
  'common.unnamedNarrator': 'narrator not specified',

  // --- navigation -----------------------------------------------------------
  'nav.library': 'Library',
  'nav.search': 'Search',
  'nav.nowPlaying': 'Now Playing',
  'nav.myBooks': 'My Books',
  'nav.about': 'About',
  'nav.primary': 'Primary navigation',

  // --- library / home -------------------------------------------------------
  'library.title': 'Free audiobooks that play from their sources',
  'library.description':
    'OpenAudioBooks — a catalogue of audiobooks that can be legally listened to for free from external sources. We do not store audio files: the sound comes from the source that provides it.',
  'library.version': 'Version {version} · {status}',
  'library.continueListening': 'Continue listening',
  'library.inCatalogue': 'In catalogue',
  'library.searchFullCatalogue': 'Search entire catalogue',
  'library.browseByNarrator': 'By narrator',
  'library.sourceAdapters': 'Data sources',
  'library.allSources': 'All sources',
  'library.builtInDevelopmentData': 'built-in test data',
  'library.providerAdapter': 'provider adapter',
  'library.developmentNoticeTitle': 'Test data.',
  'library.developmentNoticeBody':
    'This build shows fictional catalogue records marked as test data. Narrator names, titles and sources are invented, and the audio is a generated test signal. Nothing in this list is a real audiobook.',
  'library.editionsShort': {
    one: '{count} edition',
    other: '{count} editions',
  },

  // --- status ---------------------------------------------------------------
  'status.alpha': 'Alpha · development only · not production-ready',
  'status.development': 'Development build · not production-ready',

  // --- search ---------------------------------------------------------------
  'search.title': 'Search',
  'search.placeholder': 'Title, author, narrator, chapter…',
  'search.submit': 'Search',
  'search.field.text': 'Title, author, narrator, chapter…',
  'search.field.narrator': 'Narrator',
  'search.field.author': 'Author',
  'search.field.genre': 'Genre',
  'search.field.source': 'Source',
  'search.field.series': 'Series',
  'search.field.narrationLanguage': 'Audiobook language',
  'search.any.narrator': 'Any narrator',
  'search.any.author': 'Any author',
  'search.any.genre': 'Any genre',
  'search.any.source': 'Any source',
  'search.any.series': 'Any series',
  'search.any.narrationLanguage': 'Any language',
  'search.resultsCount': {
    one: '{count} audiobook',
    other: '{count} audiobooks',
  },
  'search.noResults': 'Nothing found for these filters.',
  'search.languageNotice':
    'Audiobook language is the narration language. It is independent of the interface language and the work\'s original language.',

  // --- work / edition / narrator / author / source pages --------------------
  'work.editions': 'Audio editions ({count})',
  'work.editionsCount': {
    one: 'Audio edition ({count})',
    other: 'Audio editions ({count})',
  },
  'work.notFound': 'Work not found',
  'work.notFoundBody':
    'This work is not in the local catalogue. Real source integration has not yet been performed, so the catalogue only contains test records.',
  'work.hiddenByLanguage': {
    one: 'Another {count} edition of this work is available in another language and hidden by the filter.',
    other: 'Another {count} editions of this work are available in other languages and hidden by the filter.',
  },
  'work.noEditions': 'No audio editions of this work yet.',
  'work.about': 'About the work',

  'narrator.pageTitle': 'Audio editions narrated by {name}',
  'narrator.noEditions': 'No audio editions for this narrator yet.',
  'narrator.filteredNote': {
    one: 'Another {count} edition by this narrator is hidden by the audiobook language filter. Change the filter in settings.',
    other: 'Another {count} editions by this narrator are hidden by the audiobook language filter. Change the filter in settings.',
  },
  'narrator.stats':
    '{editions} audio editions · {works} works · {sources} sources',
  'count.audioEditions': {
    one: '{count} audio edition',
    other: '{count} audio editions',
  },
  'count.works': {
    one: '{count} work',
    other: '{count} works',
  },
  'count.sources': {
    one: '{count} source',
    other: '{count} sources',
  },
  'narrator.notFound': 'Narrator not found',
  'narrator.notFoundBody':
    'This narrator is not in the local catalogue. Data may not have loaded yet or the link may be stale.',

  'author.notFound': 'Author not found',
  'author.notFoundBody': 'This author is not in the local catalogue.',
  'author.stats': '{works} works · {editions} audio editions',
  'author.works': 'Works',
  'author.audioEditions': 'Audio editions',

  'edition.notFound': 'Audio edition not found',
  'edition.notFoundBody':
    'This audio edition is not in the local catalogue. Real sources are not yet connected.',
  'edition.playFromStart': 'Listen from start',
  'edition.resumeAt': 'Resume at {time}',
  'edition.notStarted': 'Not started yet. Progress is saved only on this device.',
  'edition.lastPlayed': 'Listened {date}',
  'edition.state.inProgress': 'in progress',
  'edition.state.finished': 'finished',
  'edition.state.favorite': 'in favorites',
  'edition.state.notFavorite': 'not in favorites',
  'edition.otherEditions': 'Other editions of this work',
  'edition.otherEditionsNote':
    'Each edition has its own playback position, bookmarks and favorite mark.',
  'edition.hasSavedProgress': 'has saved progress',
  'edition.notStartedYet': 'not started yet',
  'edition.rightsUnknownWarning':
    'The source did not state a rights status for this edition. "Free to listen" does not mean "public domain".',

  'source.notFound': 'Source not found',
  'source.notFoundBody': 'This source is not in the local catalogue.',
  'source.rightsStatus': 'Rights status',
  'source.narrators': 'Narrators on this source ({count})',
  'source.narratorsCount': {
    one: 'Narrator on this source ({count})',
    other: 'Narrators on this source ({count})',
  },
  'source.rightsUnknownWarning':
    'The legal status of this source is unknown. Its content is not considered public domain and is marked accordingly in each edition.',
  'source.perEditionRightsNote':
    'Rights labels are set per edition: they may differ.',

  'browse.narrators.title': 'Narrators',
  'browse.narrators.intro':
    'Narrators are first-class entities in OpenAudioBooks. Each leads to the audio editions they narrated, across works and sources.',
  'browse.authors.title': 'Authors',
  'browse.authors.intro': 'Authors of works present in the catalogue.',
  'browse.sources.title': 'Sources',
  'browse.sources.intro':
    'OpenAudioBooks — an aggregator. Audio plays from these sources; files are not stored by us.',
  'browse.genres': 'Genres',
  'browse.languages': 'Audiobook languages',
  'browse.notFound': 'Page not found',
  'browse.notFoundBody': 'This section does not exist.',
  'browse.editionCount': {
    one: '{count} edition',
    other: '{count} editions',
  },

  'notFound.title': 'Page not found',
  'notFound.body': 'This page does not exist.',
  'notFound.backToLibrary': 'Back to library',

  'error.title': 'Something went wrong',
  'error.renderNote': 'The render error is logged only to this device\'s console. No data is sent anywhere.',

  // --- player ---------------------------------------------------------------
  'player.play': 'Play',
  'player.pause': 'Pause',
  'player.previousTrack': 'Previous chapter',
  'player.nextTrack': 'Next chapter',
  'player.skipBack': 'Back {seconds} s',
  'player.skipForward': 'Forward {seconds} s',
  'player.speed': 'Speed',
  'player.position': 'Position',
  'player.seekWithinTrack': 'Seek within chapter',
  'player.editionProgress': 'Book progress {current} / {total} ({percent}%)',
  'player.bookmarkHere': 'Bookmark here',
  'player.favoriteAdd': 'Add to favorites',
  'player.favoriteRemove': 'In favorites',
  'player.emptyTitle': 'Now Playing',
  'player.emptyBody':
    'Nothing loaded yet. Pick an audiobook in the "{search}" section to start listening.',
  'player.resumeSavedNote':
    'Saved on this device: {time} into chapter "{track}".',
  'player.trackOfEdition': 'Chapter {track} of "{title}"',
  'player.error.noAudio': 'No audio files available for this audiobook.',
  'player.error.playbackBlocked':
    'The browser blocked playback start. Press "Play" again.',
  'player.error.audioUnavailable':
    'Failed to load audio from source. Check connection and try again.',

  // --- bookmarks ------------------------------------------------------------
  'bookmarks.title': 'Bookmarks',
  'bookmarks.empty': 'No bookmarks for this audio edition yet.',
  'bookmarks.noteLabel': 'Note for next bookmark (optional)',
  'bookmarks.noNote': 'no note',
  'bookmarks.remove': 'Remove',

  // --- my books -------------------------------------------------------------
  'myBooks.title': 'My Books',
  'myBooks.description':
    'Stored only on this device. OpenAudioBooks has no accounts, and listening data is never sent anywhere.',
  'myBooks.tab.continue': 'Continue',
  'myBooks.tab.favorites': 'Favorites',
  'myBooks.tab.finished': 'Finished',
  'myBooks.loading': 'Reading local storage…',
  'myBooks.empty': 'Empty for now. Start something in the "{search}" section.',
  'myBooks.localData': 'Local data',
  'myBooks.play': 'Play',
  'myBooks.resume': 'Resume',
  'myBooks.localDataBody':
    'Playback positions, favorites, bookmarks and history are stored in this browser\'s IndexedDB under the name "{database}". Nothing is sent anywhere. Clearing browser data or the button below deletes them permanently.',
  'myBooks.deleteAllData': 'Delete all local data',
  'myBooks.deleteConfirm': 'Delete all OpenAudioBooks local data on this device?',
  'myBooks.footer': 'OpenAudioBooks {version} · alpha development build',

  // --- settings -------------------------------------------------------------
  'settings.title': 'Settings',
  'settings.selected': 'Selected',
  'settings.currentLocale': 'Current interface language: {name} ({code}).',
  'settings.uiLocale': 'Interface language',
  'settings.uiLocaleHint':
    'Determines only the interface language. Does not affect audiobook languages.',
  'settings.audioLanguages': 'Audiobook languages',
  'settings.audioLanguagesHint':
    'Determines which narrated audiobooks appear in the catalogue. Independent of interface language and work original language.',
  'settings.languageOnlyRussian':
    'Only the Romanian interface is fully translated at this time. Choosing other audiobook languages is available and does not require changing the interface language.',
  'settings.translationIncomplete': 'interface translation not complete',
  'settings.noAudioLanguagesSelected':
    'No audiobook language selected — showing all languages.',
  'settings.languageIndependentNote':
    'Interface language and audiobook languages are independent settings.',
  'settings.stats': 'In catalogue: {editions} audio editions in {languages} languages.',

  // --- duration -------------------------------------------------------------
  'duration.label': 'Duration',
  'duration.from': 'From',
  'duration.to': 'To',
  'duration.minutes': 'min',
  'duration.hours': 'h',
  'duration.seconds': 's',
  'duration.unknown': 'Duration unknown',
  'duration.approximate': 'approx',
  'duration.estimated': 'calculated from chapters',
  'duration.cardLabel': 'Duration',
  'duration.filter.any': 'Any duration',
  'duration.filter.under15': 'Under 15 minutes',
  'duration.filter.15to30': '15–30 minutes',
  'duration.filter.30to60': '30–60 minutes',
  'duration.filter.1to3h': '1–3 hours',
  'duration.filter.3to10h': '3–10 hours',
  'duration.filter.over10h': 'Over 10 hours',
  'duration.filter.custom': 'Custom range',
  'duration.filter.reset': 'Reset filter',
  'duration.filter.active': 'Duration filter active',
  'duration.filter.customHint': 'Specify range in minutes, e.g. 20 to 45.',
  'duration.filter.invalid': 'Invalid range: "to" must not be less than "from".',
  'duration.filter.excludesUnknown':
    'Audiobooks with unknown duration do not fall into the specified range.',

  // --- sorting --------------------------------------------------------------
  'sort.label': 'Sort',
  'sort.catalogue': 'By title',
  'sort.shortest': 'Shortest first',
  'sort.longest': 'Longest first',
  'sort.partialCatalogue':
    'Duration sort applies only to {count} loaded records, not the entire {source} catalogue.',
  'sort.partialCatalogueUnknownCount':
    'Duration sort applies only to the loaded portion of the {source} catalogue, not the entire catalogue.',
  'sort.partialLoadedRecords':
    'Duration sort applies only to {count} loaded records from connected sources, not the entire catalogue.',
  'sort.partialLoadedRecordsUnknownCount':
    'Duration sort applies only to loaded records from connected sources, not the entire catalogue.',
  'sort.unknownLast': 'Records with unknown duration — at the end of the list.',

  // --- provider catalogue ---------------------------------------------------
  'provider.loading': 'Loading source catalogue…',
  'provider.loaded': 'Loaded {count} records from {source}.',
  'provider.refresh': 'Refresh catalogue',
  'provider.refreshing': 'Refreshing…',
  'provider.error': 'Failed to load catalogue {source}: {reason}',
  'provider.partialNotice':
    'Only a slice of the catalogue is shown. "Shortest first" and "Longest first" refer to loaded records.',
  'provider.offlineNotice':
    'Source catalogue unavailable. Showing locally saved data.',

  // --- rights labels --------------------------------------------------------
  'rights.publicDomain': 'Public domain',
  'rights.creativeCommons': 'Creative Commons',
  'rights.licensedFree': 'Free to listen (licensed)',
  'rights.permissionGranted': 'Permission granted',
  'rights.unknown': 'Rights unknown',

  // --- about ----------------------------------------------------------------
  'about.title': 'About OpenAudioBooks',
  'about.whatIs': 'What is this',
  'about.whatIsBody':
    'OpenAudioBooks — a free, public, non-commercial app for discovering, cataloguing and listening to audiobooks that are legally available to listen to for free from external sources. It is an aggregator and a player. We do not claim ownership of audiobook content and do not store audiobook files: audio plays from the source that legitimately provides it.',
  'about.privacy': 'Privacy',
  'about.privacyBody':
    'The app works on a "local-first" principle. No account, no sign-in, no server profile, no cloud sync. Playback positions, bookmarks, favorites and history are stored in your browser on your device. No telemetry, analytics, advertising or tracking.',
  'about.rights': 'Rights and sources',
  'about.rightsBody':
    '"Free to listen" does not mean "public domain". Every audio edition and every source has its own rights status, licence name, attribution and link to the original. Unknown rights are marked as unknown, not inferred.',
  'about.browseSources': 'Browse sources',
  'about.status': 'Development status',
  'about.statusBody':
    'This is alpha {version}. Real sources are not yet connected, and the catalogue contains test records marked as such in the UI. Treat this build as an architectural preview, not a working library.',
} as const;