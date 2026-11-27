import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';

import { getItem, setItem } from '../util/deviceStore';
import {
  Lang,
  LANG_STORAGE_KEY,
  StringKey,
  isRtlLang,
  localizedName,
  resolveLang,
  translate,
} from './strings';

export interface LanguageContextValue {
  lang: Lang;
  isRTL: boolean;
  /** Translate a UI string key, with optional `{token}` interpolation. */
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  /** Pick the display name for a backend value carrying `name` + `nameAr`. */
  tn: (name: string | null | undefined, nameAr: string | null | undefined) => string;
  /** Switch language: persists, flips text/content now, mirrors layout on restart. */
  setLanguage: (next: Lang) => void;
}

/**
 * Applies the right-to-left preference to the native layout engine.
 *
 * `I18nManager` is how React Native mirrors *layout* (flex rows, `start`/`end`,
 * default text alignment). Changing it takes full effect only on the next app
 * launch — RN cannot re-mirror a tree that is already laid out — so this is the
 * groundwork for a correct restart, while the context (below) flips the copy
 * and content names immediately in the current session. `allowRTL` is always
 * enabled so the preference can take once the app relaunches.
 */
function applyRtlPreference(lang: Lang): void {
  try {
    I18nManager.allowRTL(true);
    const wantRtl = isRtlLang(lang);
    if (I18nManager.isRTL !== wantRtl) {
      I18nManager.forceRTL(wantRtl);
    }
  } catch {
    // I18nManager is a no-op/absent in some environments (web, tests). The
    // context's own `isRTL` still drives text direction, so this never blocks.
  }
}

const DEFAULT: LanguageContextValue = {
  lang: 'en',
  isRTL: false,
  t: (key, vars) => translate('en', key, vars),
  tn: (name, nameAr) => localizedName('en', name, nameAr),
  setLanguage: () => undefined,
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Holds the current language for the whole app.
 *
 * The saved preference is read once on mount (and applied to `I18nManager` so a
 * relaunch mirrors the layout). Switching language updates the context — which
 * re-renders every screen with the new copy and Arabic content names at once —
 * persists the choice, and re-applies the RTL preference for the next launch.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    let mounted = true;
    getItem(LANG_STORAGE_KEY).then((stored) => {
      const resolved = resolveLang(stored);
      applyRtlPreference(resolved);
      if (mounted) {
        setLang(resolved);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback((next: Lang) => {
    setLang(next);
    applyRtlPreference(next);
    // Persistence is best-effort, exactly like every other deviceStore write.
    void setItem(LANG_STORAGE_KEY, next);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      isRTL: isRtlLang(lang),
      t: (key, vars) => translate(lang, key, vars),
      tn: (name, nameAr) => localizedName(lang, name, nameAr),
      setLanguage,
    }),
    [lang, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/**
 * Reads the language context. Like `useMotion`, it never throws without a
 * provider — it returns an English, LTR default — so any component (and the
 * screen tests, which mount without the provider) stays renderable.
 */
export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext) ?? DEFAULT;
}
