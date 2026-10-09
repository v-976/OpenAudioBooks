/**
 * Language utilities and registry.
 *
 * Three distinct language concepts exist in this project and must never be
 * conflated (AGENTS.md rule: language concepts):
 *
 *  1. UI locale               — which language the interface is rendered in.
 *  2. Work.originalLanguage   — the language a literary work was written in.
 *  3. AudioEdition.narrationLanguage — the language actually spoken in the audio.
 *
 * Only the third describes audio, and it is the one catalogue language filtering
 * operates on. This module deals with identifiers only: it never infers one
 * concept from another, and it never decides what a user prefers.
 *
 * Provider-specific normalisation is deliberately NOT implemented here. When a
 * real adapter arrives it must map provider values through
 * `normalizeLanguageCode()` before exposing an AudioEdition to the domain.
 */

/** An ISO 639-1 primary language subtag, e.g. `ru`, `en`, `fi`. */
export type LanguageCode = string;

export interface LanguageDefinition {
  /** Normalised identifier used everywhere in the domain. */
  code: LanguageCode;
  /** English name. Stable, and the fallback for display when untranslated. */
  englishName: string;
}

/**
 * Languages with a complete translation of the user interface.
 *
 * This list governs what a user may pick as `uiLocale`. It is deliberately
 * separate from `LANGUAGES`: a catalogue can contain audio in a language the UI
 * has no translation for.
 */
export const TRANSLATED_UI_LOCALES: LanguageDefinition[] = [
  { code: 'ru', englishName: 'Russian' },
  { code: 'en', englishName: 'English' },
  { code: 'ro', englishName: 'Romanian' },
];

/** The locale every missing translation falls back to. */
export const FALLBACK_UI_LOCALE = 'ru';

/**
 * Languages this build knows how to name and filter on.
 *
 * Not a closed list: an adapter may legitimately deliver a code that is not
 * here, and unknown codes must still work (they fall back to the raw identifier).
 */
export const LANGUAGES: LanguageDefinition[] = [
  { code: 'ru', englishName: 'Russian' },
  { code: 'en', englishName: 'English' },
  { code: 'fi', englishName: 'Finnish' },
  { code: 'de', englishName: 'German' },
  { code: 'fr', englishName: 'French' },
  { code: 'es', englishName: 'Spanish' },
  { code: 'it', englishName: 'Italian' },
  { code: 'no', englishName: 'Norwegian' },
  { code: 'sv', englishName: 'Swedish' },
  { code: 'uk', englishName: 'Ukrainian' },
  { code: 'pl', englishName: 'Polish' },
  { code: 'cs', englishName: 'Czech' },
  { code: 'pt', englishName: 'Portuguese' },
  { code: 'zh', englishName: 'Chinese' },
  { code: 'ja', englishName: 'Japanese' },
];

const BY_CODE = new Map(LANGUAGES.map((language) => [language.code, language]));

/** English name for a code, or the code itself when unknown. */
export function languageEnglishName(code: LanguageCode): string {
  return BY_CODE.get(code)?.englishName ?? code;
}

/** True when the registry knows this code. */
export function isKnownLanguage(code: LanguageCode): boolean {
  return BY_CODE.has(code);
}

/**
 * Provider and user-supplied aliases mapped to normalised identifiers.
 *
 * Language *names* are included because providers and hand-entered data use
 * them ("Russian", "Русский"). This is deliberately a generic, domain-level
 * table rather than per-provider logic; a real adapter may add a mapping for a
 * provider-specific code before calling `normalizeLanguageCode`.
 */
const ALIASES: Record<string, LanguageCode> = {
  // ISO 639-2/B and 639-3 codes
  rus: 'ru',
  eng: 'en',
  fin: 'fi',
  ger: 'de',
  deu: 'de',
  fre: 'fr',
  fra: 'fr',
  spa: 'es',
  ita: 'it',
  nor: 'no',
  nob: 'no',
  nno: 'no',
  swe: 'sv',
  ukr: 'uk',
  pol: 'pl',
  ces: 'cs',
  cze: 'cs',
  por: 'pt',
  zho: 'zh',
  chi: 'zh',
  jpn: 'ja',
};

/** English names, mapped through the registry. */
const ENGLISH_NAME_ALIASES: Record<string, LanguageCode> = Object.fromEntries(
  LANGUAGES.map((language) => [language.englishName.toLowerCase(), language.code]),
  [['romanian', 'ro']],
);

/** Names in the locales the UI itself is translated into. */
const LOCALISED_NAME_ALIASES: Record<string, LanguageCode> = {
  русский: 'ru',
  английский: 'en',
  engleză: 'en',
  română: 'ro',
  romanian: 'ro',
};

/**
 * Normalises a language identifier to its canonical form.
 *
 * Handles what real sources and hand-entered data actually contain:
 *   "ru", "RU", "ru-RU", "ru_RU", "rus", "Русский", "Russian", "  en  "
 * all resolve to "ru"/"en"/etc.
 *
 * Returns `undefined` when there is nothing usable, so callers can represent
 * "unknown" explicitly rather than storing a junk string.
 *
 * An unrecognised but well-formed tag is passed through as a normalised
 * primary subtag ("pt-BR" → "pt"): refusing to handle a real language because
 * it is missing from our registry would be worse than carrying it through.
 */
export function normalizeLanguageCode(input: unknown): LanguageCode | undefined {
  if (typeof input !== 'string') return undefined;

  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const lower = trimmed.toLowerCase();

  // Whole-string aliases: ISO 639-2/3 codes and language names.
  const direct =
    ALIASES[lower] ?? ENGLISH_NAME_ALIASES[lower] ?? LOCALISED_NAME_ALIASES[lower];
  if (direct) return direct;

  // BCP 47 style tags: take the primary subtag and re-check it as an alias.
  const primary = lower.split(/[-_]/)[0];
  if (!primary) return undefined;
  if (ALIASES[primary]) return ALIASES[primary];
  if (ENGLISH_NAME_ALIASES[primary]) return ENGLISH_NAME_ALIASES[primary];
  if (LOCALISED_NAME_ALIASES[primary]) return LOCALISED_NAME_ALIASES[primary];
  if (BY_CODE.has(primary)) return primary;

  // A single-token value that is not a known code: still return it if it looks
  // like a language tag, so a new provider language is not silently dropped.
  return /^[a-z]{2,3}$/.test(primary) ? primary : undefined;
}

/**
 * Normalises a user-supplied list of languages, dropping unknowns and
 * duplicates while preserving the user's ordering.
 */
export function normalizeLanguageList(input: unknown): LanguageCode[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<LanguageCode>();
  for (const entry of input) {
    const code = normalizeLanguageCode(entry);
    if (code && !seen.has(code)) seen.add(code);
  }
  return [...seen];
}

/** True when `candidate` appears in `list`. */
export function includesLanguage(list: LanguageCode[], candidate: LanguageCode): boolean {
  return list.includes(candidate);
}