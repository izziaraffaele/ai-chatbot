import type {
  TranslationDict as TDict,
  TranslationKey as TKey,
} from "./translations/en";

export type TranslationKey = TKey;
export type TranslationDict = TDict;

export type TranslateFn = <K extends TranslationKey>(
  key: K,
  fallback: string
) => string;

export type Locale = "en" | "it";

export type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  translations: TranslationDict;
  t: TranslateFn;
};
