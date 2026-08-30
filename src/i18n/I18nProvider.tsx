import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';

import en, { TranslationKey, Translations } from './en';
import ar from './ar';

export type Locale = 'en' | 'ar';

interface I18nContextValue {
  locale: Locale;
  isRTL: boolean;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const strings: Record<Locale, Translations> = { en, ar };

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [locale, setLocaleState] = useState<Locale>('en');

  const setLocale = useCallback((l: Locale) => {
    const rtl = l === 'ar';
    I18nManager.forceRTL(rtl);
    I18nManager.allowRTL(rtl);
    setLocaleState(l);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => strings[locale][key] ?? strings.en[key] ?? key,
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, isRTL: locale === 'ar', setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

/** Pick the localised name: Arabic when the locale is `ar` and `nameAr` exists, else English. */
export function useLocalName(): (name: string, nameAr: string | null | undefined) => string {
  const { locale } = useI18n();
  return useCallback(
    (name: string, nameAr: string | null | undefined) =>
      locale === 'ar' && nameAr ? nameAr : name,
    [locale],
  );
}
