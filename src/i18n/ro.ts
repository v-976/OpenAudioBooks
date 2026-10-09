import type { CompleteLocaleBundle } from './keys';
import { ru } from './keys';

/**
 * Romanian — the complete translation for this milestone.
 *
 * The interface ships with Romanian because it's a target locale for this project.
 */
export const roBundle: CompleteLocaleBundle = {
  // --- app identity ---------------------------------------------------------
  'app.name': 'OpenAudioBooks',
  'app.tagline': 'Audiobiblii gratuite — de la sursele lor',

  'common.back': 'Înapoi',
  'common.cancel': 'Anulare',
  'common.clear': 'Șterge',
  'common.clearFilters': 'Resetează filtrele',
  'common.retry': 'Reîncearcă',
  'common.skipToContent': 'Sari la conținut',
  'common.save': 'Salvează',
  'common.settings': 'Setări',
  'common.dismiss': 'Închide',
  'common.unknown': 'Necunoscut',
  'common.loading': 'Se încarcă…',
  'common.error': 'Eroare',
  'common.notSpecified': 'Nespecificat',
  'common.source': 'Sursă',
  'common.originalSource': 'Pagina sursei',
  'common.language': 'Limbă',
  'common.languageUnknown': 'Limbă necunoscută',
  'common.durationUnknown': 'Durata necunoscută',
  'common.narrator': 'Narrator',
  'common.narratedBy': 'Citit de',
  'common.author': 'Autor',
  'common.genre': 'Gen',
  'common.duration': 'Durată',
  'common.tracks': 'Capitole',
  'common.track': 'Capitol',
  'common.release': 'Date de publicare',
  'common.rights': 'Drepturi',
  'common.identifier': 'Identificator',
  'common.availability': 'Disponibilitate',
  'common.attribution': 'Atribuire',
  'common.type': 'Tip',
  'common.series': 'Serie',
  'common.bookInSeries': 'cartea {position}',
  'common.originalLanguage': 'Limba originală',
  'common.alsoKnownAs': 'Cunoscut și ca',
  'common.bio': 'Biografie',
  'common.unnamedNarrator': 'narrator nespecificat',

  // --- navigation -----------------------------------------------------------
  'nav.library': 'Bibliotecă',
  'nav.search': 'Căutare',
  'nav.nowPlaying': 'Redă acum',
  'nav.myBooks': 'Cărțile mele',
  'nav.about': 'Despre',
  'nav.primary': 'Navigare principală',

  // --- library / home -------------------------------------------------------
  'library.title': 'Audiobiblii gratuite care redau de la sursele lor',
  'library.description':
    'OpenAudioBooks — un catalog de audiobiblii care pot fi ascultate legal gratuit de pe surse externe. Nu stocăm fișiere audio: sunetul provine de la sursa care îl oferă.',
  'library.version': 'Versiunea {version} · {status}',
  'library.continueListening': 'Continuă ascultarea',
  'library.inCatalogue': 'În catalog',
  'library.searchFullCatalogue': 'Caută în întregul catalog',
  'library.browseByNarrator': 'După narrator',
  'library.sourceAdapters': 'Surse de date',
  'library.allSources': 'Toate sursele',
  'library.builtInDevelopmentData': 'date de test integrate',
  'library.providerAdapter': 'adaptor sursă',
  'library.developmentNoticeTitle': 'Date de test.',
  'library.developmentNoticeBody':
    'În această versiune sunt afișate înregistrări fictive de catalog, marcate ca date de test. Numele narratorilor, titlurile și sursele sunt inventate, iar sunetul este un semnal de test generat. Nimic din această listă nu este o audiobibliu reală.',
  'library.editionsShort': {
    one: '{count} ediție',
    few: '{count} ediții',
    many: '{count} de ediții',
    other: '{count} ediții',
  },

  // --- status ---------------------------------------------------------------
  'status.alpha': 'Alpha · doar pentru dezvoltare · nu e gata pentru producție',
  'status.development': 'Versiune de test · nu e gata pentru producție',

  // --- search ---------------------------------------------------------------
  'search.title': 'Căutare',
  'search.placeholder': 'Titlu, autor, narrator, capitol…',
  'search.submit': 'Caută',
  'search.field.text': 'Titlu, autor, narrator, capitol…',
  'search.field.narrator': 'Narrator',
  'search.field.author': 'Autor',
  'search.field.genre': 'Gen',
  'search.field.source': 'Sursă',
  'search.field.series': 'Serie',
  'search.field.narrationLanguage': 'Limba audiobibliului',
  'search.any.narrator': 'Orice narrator',
  'search.any.author': 'Orice autor',
  'search.any.genre': 'Orice gen',
  'search.any.source': 'Orice sursă',
  'search.any.series': 'Orice serie',
  'search.any.narrationLanguage': 'Orice limbă',
  'search.resultsCount': {
    one: '{count} audiobibliu',
    few: '{count} audiobiblii',
    many: '{count} de audiobiblii',
    other: '{count} audiobiblii',
  },
  'search.noResults': 'Nimic nu a fost găsit pentru aceste filtre.',
  'search.languageNotice':
    'Limba audiobibliului este limba în care este citit. Nu depinde de limba interfeței și nici de limba originală a operei.',

  // --- work / edition / narrator / author / source pages --------------------
  'work.editions': 'Ediții audio ({count})',
  'work.editionsCount': {
    one: 'Ediție audio ({count})',
    few: 'Ediții audio ({count})',
    many: 'Ediții audio ({count})',
    other: 'Ediții audio ({count})',
  },
  'work.notFound': 'Opera nu a fost găsită',
  'work.notFoundBody':
    'Această operă nu este în catalogul local. Conectarea surselor reale încă nu a fost făcută, deci catalogul conține doar înregistrări de test.',
  'work.hiddenByLanguage': {
    one: 'Încă {count} ediție a acestei opere este disponibilă pe o altă limbă și este ascunsă de filtru.',
    few: 'Încă {count} ediții ale acestei opere sunt disponibile pe alte limbi și sunt ascunse de filtru.',
    many: 'Încă {count} ediții ale acestei opere sunt disponibile pe alte limbi și sunt ascunse de filtru.',
    other: 'Încă {count} ediții ale acestei opere sunt disponibile pe alte limbi și sunt ascunse de filtru.',
  },
  'work.noEditions': 'Nu există ediții audio pentru această operă momentan.',
  'work.about': 'Despre operă',

  'narrator.pageTitle': 'Ediții audio citite de {name}',
  'narrator.noEditions': 'Momentan nu există ediții audio pentru acest narrator.',
  'narrator.filteredNote': {
    one: 'Încă {count} ediție a acestui narrator este ascunsă de filtrul limbii audiobibliului. Poți schimba filtrul din setări.',
    few: 'Încă {count} ediții ale acestui narrator sunt ascunse de filtrul limbii audiobibliului. Poți schimba filtrul din setări.',
    many: 'Încă {count} ediții ale acestui narrator sunt ascunse de filtrul limbii audiobibliului. Poți schimba filtrul din setări.',
    other: 'Încă {count} ediții ale acestui narrator sunt ascunse de filtrul limbii audiobibliului. Poți schimba filtrul din setări.',
  },
  'narrator.stats':
    '{editions} ediții audio · {works} opere · {sources} surse',
  'count.audioEditions': {
    one: '{count} audiobibliu',
    few: '{count} audiobiblii',
    many: '{count} de audiobiblii',
    other: '{count} audiobiblii',
  },
  'count.works': {
    one: '{count} operă',
    few: '{count} opere',
    many: '{count} de opere',
    other: '{count} opere',
  },
  'count.sources': {
    one: '{count} sursă',
    few: '{count} surse',
    many: '{count} surse',
    other: '{count} surse',
  },
  'narrator.notFound': 'Narrator negăsit',
  'narrator.notFoundBody':
    'Acest narrator nu este în catalogul local. Poate datele încă nu s-au încărcat sau link-ul a expirat.',

  'author.notFound': 'Autor negăsit',
  'author.notFoundBody': 'Acest autor nu este în catalogul local.',
  'author.stats': '{works} opere · {editions} ediții audio',
  'author.works': 'Opere',
  'author.audioEditions': 'Ediții audio',

  'edition.notFound': 'Ediția audio nu a fost găsită',
  'edition.notFoundBody':
    'Această ediție audio nu este în catalogul local. Sursele reale încă nu sunt conectate.',
  'edition.playFromStart': 'Ascultă de la început',
  'edition.resumeAt': 'Continuă de la {time}',
  'edition.notStarted': 'Încă neînceput. Progresul e salvat doar pe acest dispozitiv.',
  'edition.lastPlayed': 'Ascultat la {date}',
  'edition.state.inProgress': 'în curs',
  'edition.state.finished': 'finalizat',
  'edition.state.favorite': 'în favorite',
  'edition.state.notFavorite': 'nu e în favorite',
  'edition.otherEditions': 'Alte ediții ale acestei opere',
  'edition.otherEditionsNote':
    'Fiecare ediție are propria poziție de ascultare, semne de carte și marcaj „în favorite”.',
  'edition.hasSavedProgress': 'are progres salvat',
  'edition.notStartedYet': 'încă neînceput',
  'edition.rightsUnknownWarning':
    'Sursa nu a specificat statutul juridic al acestei ediții. „Gratuit de ascultat” nu înseamnă „domeniu public”.',

  'source.notFound': 'Sursă negăsită',
  'source.notFoundBody': 'Această sursă nu este în catalogul local.',
  'source.rightsStatus': 'Statut juridic',
  'source.narrators': 'Narratori pe această sursă ({count})',
  'source.narratorsCount': {
    one: 'Narrator pe această sursă ({count})',
    few: 'Narratori pe această sursă ({count})',
    many: 'Narratori pe această sursă ({count})',
    other: 'Narratori pe această sursă ({count})',
  },
  'source.rightsUnknownWarning':
    'Statutul juridic al acestei surse este necunoscut. Conținutul său nu e considerat domeniu public și e marcat corespunzător în fiecare ediție.',
  'source.perEditionRightsNote':
    'Marcajele juridice sunt setate per ediție: pot varia.',

  'browse.narrators.title': 'Narratori',
  'browse.narrators.intro':
    'Narratorii sunt entități independente în OpenAudioBooks. Fiecare duce la edițiile audio pe care le-a citit, în opere și surse diferite.',
  'browse.authors.title': 'Autori',
  'browse.authors.intro': 'Autorii operelor prezente în catalog.',
  'browse.sources.title': 'Surse',
  'browse.sources.intro':
    'OpenAudioBooks — un agregator. Sunetul redă de la aceste surse; fișierele nu sunt stocate de noi.',
  'browse.genres': 'Genuri',
  'browse.languages': 'Limbi audiobiblii',
  'browse.notFound': 'Pagină negăsită',
  'browse.notFoundBody': 'Această secțiune nu există.',
  'browse.editionCount': {
    one: '{count} ediție',
    few: '{count} ediții',
    many: '{count} de ediții',
    other: '{count} ediții',
  },

  'notFound.title': 'Pagină negăsită',
  'notFound.body': 'Această pagină nu există.',
  'notFound.backToLibrary': 'Înapoi la bibliotecă',

  'error.title': 'Ceva a mers prost',
  'error.renderNote': 'Eroarea e înregistrată doar în consola acestui dispozitiv. Niciun date nu sunt trimise nicăieri.',

  // --- player ---------------------------------------------------------------
  'player.play': 'Ascultă',
  'player.pause': 'Pauză',
  'player.previousTrack': 'Capitol anterior',
  'player.nextTrack': 'Capitol următor',
  'player.skipBack': 'Înapoi cu {seconds} s',
  'player.skipForward': 'Înainte cu {seconds} s',
  'player.speed': 'Viteză',
  'player.position': 'Poziție',
  'player.seekWithinTrack': 'Derulare în capitol',
  'player.editionProgress': 'Progres carte {current} / {total} ({percent}%)',
  'player.bookmarkHere': 'Semn de carte aici',
  'player.favoriteAdd': 'În favorite',
  'player.favoriteRemove': 'În favorite',
  'player.emptyTitle': 'Redă acum',
  'player.emptyBody':
    'Nimic nu e încărcat. Selectează o audiobibliu în secțiunea „{search}” pentru a începe ascultarea.',
  'player.resumeSavedNote':
    'Salvat pe acest dispozitiv: {time} capitolul „{track}”.',
  'player.trackOfEdition': 'Capitolul {track} din „{title}”',
  'player.error.noAudio': 'Pentru această audiobibliu nu există fișiere audio disponibile.',
  'player.error.playbackBlocked':
    'Browserul nu a permis începutul redării. Apasă „Ascultă” din nou.',
  'player.error.audioUnavailable':
    'Nu s-a putut încărca audio de la sursă. Verifică conexiunea și încearcă din nou.',

  // --- bookmarks ------------------------------------------------------------
  'bookmarks.title': 'Semne de carte',
  'bookmarks.empty': 'Momentan nu există semne de carte pentru această ediție audio.',
  'bookmarks.noteLabel': 'Notiță pentru următorul semn de carte (opțional)',
  'bookmarks.noNote': 'fără notiță',
  'bookmarks.remove': 'Șterge',

  // --- my books -------------------------------------------------------------
  'myBooks.title': 'Cărțile mele',
  'myBooks.description':
    'Stocat doar pe acest dispozitiv. OpenAudioBooks nu are conturi, și datele de ascultare nu sunt trimise nicăieri.',
  'myBooks.tab.continue': 'Continuă',
  'myBooks.tab.favorites': 'Favorite',
  'myBooks.tab.finished': 'Finalizate',
  'myBooks.loading': 'Se citește stocarea locală…',
  'myBooks.empty': 'Gol momentan. Începe ceva în secțiunea „{search}”.',
  'myBooks.localData': 'Date locale',
  'myBooks.play': 'Ascultă',
  'myBooks.resume': 'Continuă',
  'myBooks.localDataBody':
    'Pozițiile de ascultare, favoritele, semnele de carte și istoricul sunt stocate în IndexedDB al acestui browser sub numele „{database}”. Nimic nu e trimis nicăieri. Ștergerea datelor browserului sau butonul de mai jos le șterge definitiv.',
  'myBooks.deleteAllData': 'Șterge toate datele locale',
  'myBooks.deleteConfirm': 'Ștergi toate datele locale OpenAudioBooks de pe acest dispozitiv?',
  'myBooks.footer': 'OpenAudioBooks {version} · versiune alpha pentru dezvoltare',

  // --- settings -------------------------------------------------------------
  'settings.title': 'Setări',
  'settings.selected': 'Selectat',
  'settings.currentLocale': 'Limba interfeței curentă: {name} ({code}).',
  'settings.uiLocale': 'Limba interfeței',
  'settings.uiLocaleHint':
    'Stabilște doar limba interfeței. Nu afectează limbile audiobibliilor.',
  'settings.audioLanguages': 'Limbi audiobiblii',
  'settings.audioLanguagesHint':
    'Stabilește ce audiobiblii citite sunt afișate în catalog. Nu depinde de limba interfeței și nici de limba originală a operei.',
  'settings.languageOnlyRussian':
    'Momentan doar interfața română e complet tradusă. Selectarea altor limbi audiobiblii e disponibilă și nu necesită schimbarea limbii interfeței.',
  'settings.translationIncomplete': 'traducerea interfeței nu e completă',
  'settings.noAudioLanguagesSelected':
    'Nu e selectată nicio limbă audiobibliu — afișăm toate limbile.',
  'settings.languageIndependentNote':
    'Limba interfeței și limbile audiobibliilor sunt setări independente.',
  'settings.stats': 'În catalog: {editions} ediții audio pe {languages} limbi.',

  // --- duration -------------------------------------------------------------
  'duration.label': 'Durată',
  'duration.from': 'De la',
  'duration.to': 'Până la',
  'duration.minutes': 'min',
  'duration.hours': 'h',
  'duration.seconds': 's',
  'duration.unknown': 'Durată necunoscută',
  'duration.approximate': 'aproximativ',
  'duration.estimated': 'calculată pe capitole',
  'duration.cardLabel': 'Durată',
  'duration.filter.any': 'Orice durată',
  'duration.filter.under15': 'Sub 15 minute',
  'duration.filter.15to30': '15–30 minute',
  'duration.filter.30to60': '30–60 minute',
  'duration.filter.1to3h': '1–3 ore',
  'duration.filter.3to10h': '3–10 ore',
  'duration.filter.over10h': 'Peste 10 ore',
  'duration.filter.custom': 'Interval propriu',
  'duration.filter.reset': 'Resetează filtrul',
  'duration.filter.active': 'Filtru după durată activ',
  'duration.filter.customHint': 'Specifică intervalul în minute, de ex. de la 20 la 45.',
  'duration.filter.invalid': 'Interval invalid: „până la” trebuie să fie mai mare sau egal cu „de la”.',
  'duration.filter.excludesUnknown':
    'Audiobibliile cu durată necunoscută nu intră în intervalul specificat.',

  // --- sorting --------------------------------------------------------------
  'sort.label': 'Sortare',
  'sort.catalogue': 'După titlu',
  'sort.shortest': 'Mai întâi cele scurte',
  'sort.longest': 'Mai întâi cele lungi',
  'sort.partialCatalogue':
    'Sortarea după durată se aplică doar pe {count} înregistrări încărcate, nu pe tot catalogul {source}.',
  'sort.partialCatalogueUnknownCount':
    'Sortarea după durată se aplică doar pe partea încărcată a catalogului {source}, nu pe tot catalogul.',
  'sort.partialLoadedRecords':
    'Sortarea după durată se aplică doar pe {count} înregistrări încărcate din sursele conectate, nu pe tot catalogul.',
  'sort.partialLoadedRecordsUnknownCount':
    'Sortarea după durată se aplică doar pe înregistrările încărcate din sursele conectate, nu pe tot catalogul.',
  'sort.unknownLast': 'Înregistrările cu durată necunoscută — la finalul listei.',

  // --- provider catalogue ---------------------------------------------------
  'provider.loading': 'Se încarcă catalogul sursei…',
  'provider.loaded': 'Încărcate {count} înregistrări din {source}.',
  'provider.refresh': 'Reîmprospătează catalogul',
  'provider.refreshing': 'Se reîmprospătează…',
  'provider.error': 'Nu s-a putut încărca catalogul {source}: {reason}',
  'provider.partialNotice':
    'Se afișează doar o parte a catalogului. Sortarea „mai întâi cele scurte” și „mai întâi cele lungi” se referă la înregistrările încărcate.',
  'provider.offlineNotice':
    'Catalogul sursei e indisponibil. Se afișează datele salvate local.',

  // --- rights labels --------------------------------------------------------
  'rights.publicDomain': 'Domeniu public',
  'rights.creativeCommons': 'Creative Commons',
  'rights.licensedFree': 'Gratuit de ascultat (pe licență)',
  'rights.permissionGranted': 'Permisiune acordată',
  'rights.unknown': 'Drepturi necunoscute',

  // --- about ----------------------------------------------------------------
  'about.title': 'Despre OpenAudioBooks',
  'about.whatIs': 'Ce este',
  'about.whatIsBody':
    'OpenAudioBooks — o aplicație gratuită, publică, non-comercială pentru găsire, catalogare și ascultare audiobiblii care legal pot fi ascultate gratuit de pe surse externe. E un agregator și un player. Nu pretendăm drepturi pe audiobiblii și nu stocăm fișiere audio: sunetul se redă de la sursa care legal îl oferă.',
  'about.privacy': 'Confidențialitate',
  'about.privacyBody':
    'Aplicația funcționează pe principiul „mai întâi local”. Nu există cont, nu există autentificare, nu există profil server și nu există sincronizare cloud. Pozițiile de ascultare, semnele de carte, favoritele și istoricul sunt stocate în browserul tău pe dispozitivul tău. Nicio telemetrie, analitică, publicitate sau urmărire.',
  'about.rights': 'Drepturi și surse',
  'about.rightsBody':
    '„Gratuit de ascultat” nu înseamnă „domeniu public”. Fiecare ediție audio și fiecare sursă are propriul statut juridic, numele licenței, atribuirea și link-ul către original. Drepturile necunoscute sunt marcate ca necunoscute, nu deduse.',
  'about.browseSources': 'Vezi sursele',
  'about.status': 'Starea dezvoltării',
  'about.statusBody':
    'Aceasta e alpha {version}. Sursele reale încă nu sunt conectate, iar catalogul conține înregistrări de test, marcate ca atare în interfață. Consideră această versiune un preview arhitectural, nu o bibliotecă funcțională.',
} as const;