"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { LanguageContextValue, Locale, TranslationDict } from "./types";
import { getCurrentLocale, loadTranslations, setLocaleToCookie } from "./utils";

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(
    initialLocale ?? getCurrentLocale()
  );
  const [translations, setTranslations] = useState<TranslationDict>({} as TranslationDict);
  const [isLoading, setIsLoading] = useState(true);

  // Create translate function
  const t = useMemo(() => {
    return <K extends keyof TranslationDict>(key: K, fallback: string): string => {
      return translations[key] ?? fallback;
    };
  }, [translations]);

  // Load translations when locale changes
  const loadCurrentTranslations = useCallback(async () => {
    try {
      setIsLoading(true);
      const newTranslations = await loadTranslations(locale);
      setTranslations(newTranslations);
    } catch (error) {
      console.error("Failed to load translations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  // Load initial translations
  const loadInitialTranslations = useCallback(async () => {
    try {
      setIsLoading(true);
      const currentLocale = initialLocale ?? getCurrentLocale();
      setLocaleState(currentLocale);
      const newTranslations = await loadTranslations(currentLocale);
      setTranslations(newTranslations);
    } catch (error) {
      console.error("Failed to load translations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [initialLocale]);

  // Set locale and update translations
  const setLocale = useCallback(
    async (newLocale: Locale) => {
      if (newLocale === locale) return;

      try {
        const newTranslations = await loadTranslations(newLocale);
        setLocaleState(newLocale);
        setTranslations(newTranslations);
        setLocaleToCookie(newLocale);
      } catch (error) {
        console.error("Failed to switch locale:", error);
      }
    },
    [locale]
  );

  // Memoize context value
  const contextValue = useMemo((): LanguageContextValue => {
    return {
      locale,
      setLocale,
      translations,
      t,
    };
  }, [locale, setLocale, translations, t]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook to use the language context
export function useLanguageContext(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (context === null) {
    throw new Error(
      "useLanguageContext must be used within a LanguageProvider"
    );
  }
  return context;
}
