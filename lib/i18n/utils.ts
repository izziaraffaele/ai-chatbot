import type { TranslationDict } from "./translations/en";
import type { Locale } from "./types";

const LOCALE_COOKIE_NAME = "locale";
const LOCALE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

/**
 * Get the default locale from environment or fallback to 'en'
 */
export function getDefaultLocale(): Locale {
  const envLocale = process.env.NEXT_PUBLIC_DEFAULT_LOCALE;
  if (envLocale === "it" || envLocale === "en") {
    return envLocale;
  }
  return "en";
}

/**
 * Get supported locales from environment or fallback to ['en', 'it']
 */
export function getSupportedLocales(): Locale[] {
  const envLocales = process.env.NEXT_PUBLIC_SUPPORTED_LOCALES;
  if (envLocales) {
    const locales = envLocales.split(",").map((l) => l.trim());
    return locales.filter((l): l is Locale => l === "en" || l === "it");
  }
  return ["en", "it"];
}

/**
 * Check if a locale is supported
 */
export function isSupportedLocale(locale: string): locale is Locale {
  const supported = getSupportedLocales();
  return supported.includes(locale as Locale);
}

/**
 * Get the locale from cookie
 */
export function getLocaleFromCookie(): Locale | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split("; ");
  const localeCookie = cookies.find((cookie) =>
    cookie.startsWith(`${LOCALE_COOKIE_NAME}=`)
  );

  if (localeCookie) {
    const locale = localeCookie.split("=")[1];
    return isSupportedLocale(locale) ? locale : null;
  }

  return null;
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
 * Get the current locale (from cookie or default)
 */
export function getCurrentLocale(): Locale {
  const cookieLocale = getLocaleFromCookie();
  if (cookieLocale) {
    return cookieLocale;
  }
  return getDefaultLocale();
}

/**
 * Dynamically load translation file for a given locale
 */
export async function loadTranslations(
  locale: Locale
): Promise<TranslationDict> {
  switch (locale) {
    case "it":
      return (await import("./translations/it")).it;
    default:
      return (await import("./translations/en")).en;
  }
}

/**
 * Language names for display in UI
 */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  it: "Italiano",
};
