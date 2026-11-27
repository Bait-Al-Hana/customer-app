/**
 * The i18n system's public surface. Screens import from here, never from deep
 * paths, so the API is one reviewable list.
 */
export { LanguageProvider, useLanguage } from './LanguageProvider';
export type { LanguageContextValue } from './LanguageProvider';
export { LANGS, isRtlLang, localizedName, resolveLang, translate } from './strings';
export type { Lang, StringKey } from './strings';
