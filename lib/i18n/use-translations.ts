"use client";

import { useLanguageContext } from "./context";
import type { TranslateFn } from "./types";

/**
 * Hook to access translations in components
 * Returns a function t(key, fallback) that returns translated text
 */
export function useTranslations(): TranslateFn {
  const { t } = useLanguageContext();
  return t;
}

/**
 * Hook to access language state and controls
 */
export function useLanguage() {
  const { locale, setLocale } = useLanguageContext();
  return { locale, setLocale };
}
