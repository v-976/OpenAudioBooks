/**
 * Translation keys.
 *
 * The key set is derived from the Russian catalogue, which is the one complete
 * translation in this milestone. Deriving it this way means adding a Russian
 * string automatically makes that key required in every other locale, so a
 * half-finished translation fails typecheck instead of silently falling back at
 * runtime.
 *
 * Key naming is English and code-facing on purpose: keys are identifiers, not
 * display text, and must not change when a translation is reworded.
 */

export const ru = {
  // --- app identity ---------------------------------------------------------
  'app.name': 'OpenAudioBooks',
  'app.tagline': 'Бесплатные аудиокниги — с их источников',

  'common.back': 'Назад',
  'common.cancel': 'Отмена',
  'common.clear': 'Очистить',
  'common.clearFilters': 'Сбросить фильтры',
  'common.retry': 'Повторить',
  'common.skipToContent': 'Перейти к содержимому',
  'common.save': 'Сохранить',
  'common.settings': 'Настройки',
  'common.dismiss': 'Закрыть',
  'common.unknown': 'Неизвестно',
  'common.loading': 'Загрузка…',
  'common.error': 'Ошибка',
  'common.notSpecified': 'Не указано',
  'common.source': 'Источник',
  'common.originalSource': 'Страница на источнике',
  'common.language': 'Язык',
  'common.languageUnknown': 'Язык неизвестен',
  'common.durationUnknown': 'Длительность неизвестна',
  'common.narrator': 'Диктор',
  'common.narratedBy': 'Читает',
  'common.author': 'Автор',
  'common.genre': 'Жанр',
  'common.duration': 'Длительность',
  'common.tracks': 'Главы',
  'common.track': 'Глава',
  'common.release': 'Выходные данные',
  'common.rights': 'Права',
  'common.identifier': 'Идентификатор',
  'common.availability': 'Доступность',
  'common.attribution': 'Авторство',
  'common.type': 'Тип',
  'common.series': 'Серия',
  'common.bookInSeries': 'книга {position}',
  'common.originalLanguage': 'Язык оригинала',
  'common.alsoKnownAs': 'Известен также как',
  'common.bio': 'О биографии',
  'common.unnamedNarrator': 'диктор не указан',

  // --- navigation -----------------------------------------------------------
  'nav.library': 'Библиотека',
  'nav.search': 'Поиск',
  'nav.nowPlaying': 'Сейчас играет',
  'nav.myBooks': 'Моя полка',
  'nav.about': 'О проекте',
  'nav.primary': 'Основная навигация',

  // --- library / home -------------------------------------------------------
  'library.title': 'Бесплатные аудиокниги, которые играются с их источников',
  'library.description':
    'OpenAudioBooks — каталог аудиокниг, которые законно можно слушать бесплатно на внешних источниках. Мы не храним аудиофайлы: звук идёт с источника, который его предоставляет.',
  'library.version': 'Версия {version} · {status}',
  'library.continueListening': 'Продолжить прослушивание',
  'library.inCatalogue': 'В каталоге',
  'library.searchFullCatalogue': 'Искать по всему каталогу',
  'library.browseByNarrator': 'По дикторам',
  'library.sourceAdapters': 'Источники данных',
  'library.allSources': 'Все источники',
  'library.builtInDevelopmentData': 'встроенные тестовые данные',
  'library.providerAdapter': 'адаптер источника',
  'library.developmentNoticeTitle': 'Тестовые данные.',
  'library.developmentNoticeBody':
    'В этой сборке показаны вымышленные записи каталога, помеченные как тестовые. Дикторы, названия и источники здесь вымышлены, а звук — сгенерированный тестовый сигнал. Ничего из этого списка не является настоящей аудиокнигой.',
  'library.editionsShort': {
    one: '{count} издание',
    few: '{count} издания',
    many: '{count} изданий',
    other: '{count} издания',
  },

  // --- status ---------------------------------------------------------------
  'status.alpha': 'Альфа · только для разработки · не готово к продакшену',
  'status.development': 'Тестовая сборка · не готова к продакшену',

  // --- search ---------------------------------------------------------------
  'search.title': 'Поиск',
  'search.placeholder': 'Название, автор, диктор, глава…',
  'search.submit': 'Найти',
  'search.field.text': 'Название, автор, диктор, глава…',
  'search.field.narrator': 'Диктор',
  'search.field.author': 'Автор',
  'search.field.genre': 'Жанр',
  'search.field.source': 'Источник',
  'search.field.series': 'Серия',
  'search.field.narrationLanguage': 'Язык аудиокниги',
  'search.any.narrator': 'Любой диктор',
  'search.any.author': 'Любой автор',
  'search.any.genre': 'Любой жанр',
  'search.any.source': 'Любой источник',
  'search.any.series': 'Любая серия',
  'search.any.narrationLanguage': 'Любой язык',
  'search.resultsCount': {
    one: '{count} аудиоиздание',
    few: '{count} аудиокниги',
    many: '{count} аудиокниг',
    other: '{count} аудиокниги',
  },
  'search.noResults': 'По этим фильтрам ничего не найдено.',
  'search.languageNotice':
    'Язык аудиокниги — это язык озвучки. Он не зависит от языка интерфейса и от языка оригинала произведения.',

  // --- work / edition / narrator / author / source pages --------------------
  'work.editions': 'Аудиоиздания ({count})',
  'work.editionsCount': {
    one: 'Аудиоиздание ({count})',
    few: 'Аудиоиздания ({count})',
    many: 'Аудиоизданий ({count})',
    other: 'Аудиоиздания ({count})',
  },
  'work.notFound': 'Произведение не найдено',
  'work.notFoundBody':
    'Этого произведения нет в локальном каталоге. Подключение реальных источников ещё не выполнено, поэтому каталог пока содержит только тестовые записи.',
  'work.hiddenByLanguage': {
    one: 'Ещё {count} издание этого произведения доступно на другом языке и скрыто фильтром.',
    few: 'Ещё {count} издания этого произведения доступны на других языках и скрыты фильтром.',
    many: 'Ещё {count} изданий этого произведения доступно на других языках и скрыто фильтром.',
    other: 'Ещё {count} издания этого произведения доступны на других языках и скрыты фильтром.',
  },
  'work.noEditions': 'Аудиоизданий этого произведения пока нет.',
  'work.about': 'О произведении',

  'narrator.pageTitle': 'Аудиоиздания, прочитанные {name}',
  'narrator.noEditions': 'Для этого диктора пока нет аудиоизданий.',
  'narrator.filteredNote': {
    one: 'Ещё {count} издание этого диктора скрыто фильтром языка аудиокниги. Изменить фильтр можно в настройках.',
    few: 'Ещё {count} издания этого диктора скрыто фильтром языка аудиокниги. Изменить фильтр можно в настройках.',
    many: 'Ещё {count} изданий этого диктора скрыто фильтром языка аудиокниги. Изменить фильтр можно в настройках.',
    other: 'Ещё {count} издания этого диктора скрыто фильтром языка аудиокниги. Изменить фильтр можно в настройках.',
  },
  'narrator.stats':
    '{editions} аудиоизданий · {works} произведений · {sources} источников',
  // Russian counts take the genitive singular after 2–4 ("2 произведения"), so
  // the stat line is composed from individually pluralised parts rather than one
  // fixed template. "3 аудиоизданий" would be a visible grammatical error.
  'count.audioEditions': {
    one: '{count} аудиоиздание',
    few: '{count} аудиокниги',
    many: '{count} аудиокниг',
    other: '{count} аудиокниги',
  },
  'count.works': {
    one: '{count} произведение',
    few: '{count} произведения',
    many: '{count} произведений',
    other: '{count} произведения',
  },
  'count.sources': {
    one: '{count} источник',
    few: '{count} источника',
    many: '{count} источников',
    other: '{count} источника',
  },
  'narrator.notFound': 'Диктор не найден',
  'narrator.notFoundBody':
    'Этого диктора нет в локальном каталоге. Возможно, данные ещё не загружены или ссылка устарела.',

  'author.notFound': 'Автор не найден',
  'author.notFoundBody': 'Этого автора нет в локальном каталоге.',
  'author.stats': '{works} произведений · {editions} аудиоизданий',
  'author.works': 'Произведения',
  'author.audioEditions': 'Аудиоиздания',

  'edition.notFound': 'Аудиоиздание не найдено',
  'edition.notFoundBody':
    'Этого аудиоиздания нет в локальном каталоге. Реальные источники ещё не подключены.',
  'edition.playFromStart': 'Слушать с начала',
  'edition.resumeAt': 'Продолжить с {time}',
  'edition.notStarted': 'Ещё не начато. Прогресс сохраняется только на этом устройстве.',
  'edition.lastPlayed': 'Слушали {date}',
  'edition.state.inProgress': 'в процессе',
  'edition.state.finished': 'прослушано',
  'edition.state.favorite': 'в избранном',
  'edition.state.notFavorite': 'не в избранном',
  'edition.otherEditions': 'Другие издания этого произведения',
  'edition.otherEditionsNote':
    'У каждого издания своя позиция прослушивания, закладки и отметка «в избранном».',
  'edition.hasSavedProgress': 'есть сохранённый прогресс',
  'edition.notStartedYet': 'ещё не начато',
  'edition.rightsUnknownWarning':
    'Источник не указал правовой статус этого издания. «Бесплатно для прослушивания» не значит «общественное достояние».',

  'source.notFound': 'Источник не найден',
  'source.notFoundBody': 'Этого источника нет в локальном каталоге.',
  'source.rightsStatus': 'Правовой статус',
  'source.narrators': 'Дикторы на этом источнике ({count})',
  'source.narratorsCount': {
    one: 'Диктор на этом источнике ({count})',
    few: 'Диктора на этом источнике ({count})',
    many: 'Дикторов на этом источнике ({count})',
    other: 'Дикторы на этом источнике ({count})',
  },
  'source.rightsUnknownWarning':
    'Правовой статус этого источника неизвестен. Его содержимое не считается общественным достоянием и помечается соответствующим образом в каждом издании.',
  'source.perEditionRightsNote':
    'Правовые пометки задаются для каждого издания: они могут различаться.',

  'browse.narrators.title': 'Дикторы',
  'browse.narrators.intro':
    'Дикторы — самостоятельные записи в OpenAudioBooks. Каждая ведёт к аудиоизданиям, которые этот человек прочитал, в разных произведениях и источниках.',
  'browse.authors.title': 'Авторы',
  'browse.authors.intro': 'Авторы произведений, представленных в каталоге.',
  'browse.sources.title': 'Источники',
  'browse.sources.intro':
    'OpenAudioBooks — агрегатор. Звук воспроизводится с этих источников; файлы не хранятся у нас.',
  'browse.genres': 'Жанры',
  'browse.languages': 'Языки аудиокниг',
  'browse.notFound': 'Страница не найдена',
  'browse.notFoundBody': 'Такого раздела нет.',
  'browse.editionCount': {
    one: '{count} издание',
    few: '{count} издания',
    many: '{count} изданий',
    other: '{count} издания',
  },

  'notFound.title': 'Страница не найдена',
  'notFound.body': 'Такой страницы нет.',
  'notFound.backToLibrary': 'Вернуться в библиотеку',
  'error.title': 'Что-то пошло не так',
  'error.renderNote': 'Ошибка показа записана только в консоль этого устройства. Никакие данные никуда не отправляются.',

  // --- player ---------------------------------------------------------------
  'player.play': 'Слушать',
  'player.pause': 'Пауза',
  'player.previousTrack': 'Предыдущая глава',
  'player.nextTrack': 'Следующая глава',
  'player.skipBack': 'Назад на {seconds} с',
  'player.skipForward': 'Вперёд на {seconds} с',
  'player.speed': 'Скорость',
  'player.position': 'Позиция',
  'player.seekWithinTrack': 'Перемотка внутри главы',
  'player.editionProgress': 'Прогресс по книге {current} / {total} ({percent}%)',
  'player.bookmarkHere': 'Закладка здесь',
  'player.favoriteAdd': 'В избранное',
  'player.favoriteRemove': 'В избранном',
  'player.emptyTitle': 'Сейчас играет',
  'player.emptyBody':
    'Ничего не загружено. Выберите аудиокнигу в разделе «{search}», чтобы начать прослушивание.',
  'player.resumeSavedNote':
    'Сохранено на этом устройстве: {time} главы «{track}».',
  'player.trackOfEdition': 'Глава {track} из «{title}»',
  'player.error.noAudio': 'Для этой аудиокниги нет доступных аудиофайлов.',
  'player.error.playbackBlocked':
    'Браузер не разрешил начать воспроизведение. Нажмите «Слушать» ещё раз.',
  'player.error.audioUnavailable':
    'Не удалось загрузить аудио из источника. Проверьте подключение и повторите попытку.',

  // --- bookmarks ------------------------------------------------------------
  'bookmarks.title': 'Закладки',
  'bookmarks.empty': 'Закладок для этого аудиоиздания пока нет.',
  'bookmarks.noteLabel': 'Заметка для следующей закладки (необязательно)',
  'bookmarks.noNote': 'без заметки',
  'bookmarks.remove': 'Удалить',

  // --- my books -------------------------------------------------------------
  'myBooks.title': 'Моя полка',
  'myBooks.description':
    'Хранится только на этом устройстве. В OpenAudioBooks нет учётных записей, и данные о прослушивании никуда не отправляются.',
  'myBooks.tab.continue': 'Продолжить',
  'myBooks.tab.favorites': 'Избранное',
  'myBooks.tab.finished': 'Прослушано',
  'myBooks.loading': 'Чтение локального хранилища…',
  'myBooks.empty': 'Пока пусто. Начните что-нибудь в разделе «{search}».',
  'myBooks.localData': 'Локальные данные',
  'myBooks.play': 'Слушать',
  'myBooks.resume': 'Продолжить',
  'myBooks.localDataBody':
    'Позиции прослушивания, избранное, закладки и история хранятся в IndexedDB этого браузера под именем «{database}». Никуда ничего не отправляется. Очистка данных браузера или кнопка ниже удаляют их безвозвратно.',
  'myBooks.deleteAllData': 'Удалить все локальные данные',
  'myBooks.deleteConfirm': 'Удалить все локальные данные OpenAudioBooks на этом устройстве?',
  'myBooks.footer': 'OpenAudioBooks {version} · альфа-сборка для разработки',

  // --- settings -------------------------------------------------------------
  'settings.title': 'Настройки',
  'settings.selected': 'Выбрано',
  'settings.currentLocale': 'Текущий язык интерфейса: {name} ({code}).',
  'settings.uiLocale': 'Язык интерфейса',
  'settings.uiLocaleHint':
    'Определяет только язык интерфейса. На языки аудиокниг не влияет.',
  'settings.audioLanguages': 'Языки аудиокниг',
  'settings.audioLanguagesHint':
    'Определяет, какие озвученные аудиокниги показывать в каталоге. Не зависит от языка интерфейса и от языка оригинала произведения.',
  'settings.languageOnlyRussian':
    'Пока полностью переведён только русский интерфейс. Выбор другого языка аудиокниг доступен и не требует смены языка интерфейса.',
  'settings.translationIncomplete': 'перевод интерфейса не завершён',
  'settings.noAudioLanguagesSelected':
    'Не выбран ни один язык аудиокниг — показываем все языки.',
  'settings.languageIndependentNote':
    'Язык интерфейса и языки аудиокниг — независимые настройки.',
  'settings.stats': 'В каталоге: {editions} аудиоизданий на {languages} языках.',

  // --- duration -------------------------------------------------------------
  'duration.label': 'Длительность',
  'duration.from': 'От',
  'duration.to': 'До',
  'duration.minutes': 'мин',
  'duration.hours': 'ч',
  'duration.seconds': 'с',
  'duration.unknown': 'Длительность неизвестна',
  'duration.approximate': 'около',
  'duration.estimated': 'подсчитано по главам',
  'duration.cardLabel': 'Длительность',
  'duration.filter.any': 'Любая продолжительность',
  'duration.filter.under15': 'До 15 минут',
  'duration.filter.15to30': '15–30 минут',
  'duration.filter.30to60': '30–60 минут',
  'duration.filter.1to3h': '1–3 часа',
  'duration.filter.3to10h': '3–10 часов',
  'duration.filter.over10h': 'Более 10 часов',
  'duration.filter.custom': 'Свой диапазон',
  'duration.filter.reset': 'Сбросить фильтр',
  'duration.filter.active': 'Фильтр по длительности активен',
  'duration.filter.customHint': 'Укажите диапазон в минутах, например от 20 до 45.',
  'duration.filter.invalid': 'Неверный диапазон: «до» должно быть не меньше «от».',
  'duration.filter.excludesUnknown':
    'Аудиокниги с неизвестной длительностью не попадают в заданный диапазон.',

  // --- sorting --------------------------------------------------------------
  'sort.label': 'Сортировка',
  'sort.catalogue': 'По названию',
  'sort.shortest': 'Сначала короткие',
  'sort.longest': 'Сначала длинные',
  'sort.partialCatalogue':
    'Сортировка по длительности действует только на {count} загруженных записей, а не на весь каталог {source}.',
  'sort.partialCatalogueUnknownCount':
    'Сортировка по длительности действует только на загруженную часть каталога {source}, а не на весь каталог.',
  'sort.unknownLast': 'Записи с неизвестной длительностью — в конце списка.',

  // --- provider catalogue ---------------------------------------------------
  'provider.loading': 'Загрузка каталога источника…',
  'provider.loaded': 'Загружено записей из {source}: {count}.',
  'provider.refresh': 'Обновить каталог',
  'provider.refreshing': 'Обновление…',
  'provider.error': 'Не удалось загрузить каталог {source}: {reason}',
  'provider.partialNotice':
    'Показана только часть каталога. Сортировка «сначала короткие» и «сначала длинные» относится к загруженным записям.',
  'provider.offlineNotice':
    'Каталог источника недоступен. Показаны сохранённые локально данные.',

  // --- rights labels --------------------------------------------------------
  'rights.publicDomain': 'Общественное достояние',
  'rights.creativeCommons': 'Creative Commons',
  'rights.licensedFree': 'Бесплатно для прослушивания (по лицензии)',
  'rights.permissionGranted': 'Разрешение получено',
  'rights.unknown': 'Права неизвестны',

  // --- about ----------------------------------------------------------------
  'about.title': 'Об OpenAudioBooks',
  'about.whatIs': 'Что это такое',
  'about.whatIsBody':
    'OpenAudioBooks — бесплатное, публичное, некоммерческое приложение для поиска, каталогизации и прослушивания аудиокниг, которые законно можно слушать бесплатно с внешних источников. Это агрегатор и плеер. Мы не претендуем на права на аудиокниги и не храним аудиофайлы: звук воспроизводится с источника, который его законно предоставляет.',
  'about.privacy': 'Приватность',
  'about.privacyBody':
    'Приложение работает по принципу «сначала локально». Нет учётной записи, нет входа, нет серверного профиля и нет облачной синхронизации. Позиции прослушивания, закладки, избранное и история хранятся в вашем браузере на вашем устройстве. Никакой телеметрии, аналитики, рекламы и отслеживания.',
  'about.rights': 'Права и источники',
  'about.rightsBody':
    '«Бесплатно для прослушивания» не значит «общественное достояние». У каждого аудиоиздания и каждого источника свой правовой статус, название лицензии, авторство и ссылка на оригинал. Неизвестные права помечаются как неизвестные, а не додумываются.',
  'about.browseSources': 'Посмотреть источники',
  'about.status': 'Состояние разработки',
  'about.statusBody':
    'Это альфа {version}. Реальные источники ещё не подключены, а каталог содержит тестовые записи, которые так и помечены в интерфейсе. Считайте эту сборку архитектурным предпросмотром, а не рабочей библиотекой.',
} as const;

/** Every key the interface can ask for. */
export type TranslationKey = keyof typeof ru;

/** A plural category chosen for the active locale's rules. */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export type TranslationValue = string | Partial<Record<PluralCategory, string>>;

/** Values substituted into `{placeholder}` markers. */
export type TranslateParams = Record<string, string | number>;

/**
 * A locale's translations.
 *
 * Keys are `Partial` on purpose: a locale that is still in progress must be
 * able to exist in the tree. `LocaleBundle.pluralRules` and the completeness
 * check in `index.ts` make that visible rather than hidden, and the UI says so
 * explicitly instead of pretending the translation is finished.
 */
export type LocaleBundle = Partial<Record<TranslationKey, TranslationValue>>;

/** A complete locale. Only Russian is complete in Alpha 0.1.1. */
export type CompleteLocaleBundle = Record<TranslationKey, TranslationValue>;
