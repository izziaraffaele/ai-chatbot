import type { TranslationDict } from "./translations/it";
import type { Locale } from "./types";

const LOCALE_COOKIE_NAME = "locale";
const LOCALE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

/**
 * Get the default locale - always Italian
 */
export function getDefaultLocale(): Locale {
  return "it";
}

/**
 * Get supported locales - Italian only
 */
export function getSupportedLocales(): Locale[] {
  return ["it"];
}

/**
 * Check if a locale is supported - only Italian
 */
export function isSupportedLocale(locale: string): locale is Locale {
  return locale === "it";
}

/**
 * Get the locale from cookie - always returns Italian
 */
export function getLocaleFromCookie(): Locale {
  return "it";
}

/**
 * Set the locale in cookie
 */
export function setLocaleToCookie(locale: Locale): void {
  if (typeof document === "undefined") {
    return;
  }
  // biome-ignore lint: to fix
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}

/**
 * Get the current locale - always Italian
 */
export function getCurrentLocale(): Locale {
  return "it";
}

/**
 * Load Italian translations
 */
export async function loadTranslations(
  _locale?: Locale
): Promise<TranslationDict> {
  return (await import("./translations/it")).it;
}

/**
 * Language names for display in UI
 */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  it: "Italiano",
};
