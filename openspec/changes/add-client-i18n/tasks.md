# Implementation Tasks

## 1. Create i18n Infrastructure

- [x] 1.1 Create `lib/i18n/` directory structure
- [x] 1.2 Implement TypeScript type definitions in `lib/i18n/types.ts`
- [x] 1.3 Create English translations file `lib/i18n/translations/en.ts` with all required keys
- [x] 1.4 Create Italian translations file `lib/i18n/translations/it.ts` matching English structure
- [x] 1.5 Implement translation loading utility in `lib/i18n/utils.ts` with dynamic imports
- [x] 1.6 Implement cookie management utilities for locale persistence

## 2. Implement React Context and Hooks

- [x] 2.1 Create `lib/i18n/context.tsx` with LanguageProvider component
- [x] 2.2 Implement `useTranslations()` hook in `lib/i18n/use-translations.ts`
- [x] 2.3 Implement `useLanguage()` hook for locale state and setter
- [x] 2.4 Add locale cookie read/write logic to context
- [x] 2.5 Implement dynamic translation loading on locale change
- [x] 2.6 Add memoization to prevent unnecessary re-renders

## 3. Integrate i18n Provider

- [x] 3.1 Wrap application with LanguageProvider in `app/layout.tsx`
- [x] 3.2 Ensure provider works with existing ThemeProvider and BrandingProvider
- [x] 3.3 Test that context is available to all client components

## 4. Create Language Switcher Component

- [x] 4.1 Create `components/language-switcher.tsx` with dropdown UI
- [x] 4.2 Implement language selection logic with cookie update
- [x] 4.3 Style switcher to match existing UI design system
- [x] 4.4 Add language switcher to settings panel or user navigation menu
- [x] 4.5 Display current language with visual indicator

## 5. Translate Authentication Pages

- [x] 5.1 Update `components/auth-form.tsx` to use translations for labels and placeholders
- [x] 5.2 Update `app/(auth)/login/page.tsx` with translated text
- [x] 5.3 Update `app/(auth)/register/page.tsx` with translated text
- [x] 5.4 Test both pages in English and Italian
- [x] 5.5 Verify form validation messages are translated

## 6. Translate Chat Interface

- [x] 6.1 Update `components/multimodal-input.tsx` placeholder and error messages
- [x] 6.2 Update `components/greeting.tsx` with translated greeting text
- [x] 6.3 Update `components/suggested-actions.tsx` with translated suggestions
- [x] 6.4 Update `components/chat-header.tsx` if it contains user-facing text
- [x] 6.5 Test chat flow in both languages

## 7. Translate Sidebar and Navigation

- [x] 7.1 Update `components/app-sidebar.tsx` with translated UI text
- [x] 7.2 Update `components/sidebar-history.tsx` for time grouping labels
- [x] 7.3 Update `components/sidebar-user-nav.tsx` with translated menu items
- [x] 7.4 Update `components/settings.tsx` with translated labels
- [x] 7.5 Update all tooltip text in navigation components

## 8. Translate Message and Artifact UI

- [x] 8.1 Update `components/message-actions.tsx` with translated action labels
- [x] 8.2 Update `components/artifact-actions.tsx` with translated button text
- [x] 8.3 Update `components/document.tsx` with translated UI elements
- [x] 8.4 Update artifact editor components (text, code, sheet) with translated UI
- [x] 8.5 Update `components/toolbar.tsx` with translated tooltips

## 9. Translate Model and Visibility Selectors

- [x] 9.1 Update `components/model-selector.tsx` with translated model descriptions
- [x] 9.2 Update `components/visibility-selector.tsx` with translated visibility options
- [x] 9.3 Test selector functionality in both languages

## 10. Translate Toast Notifications and Errors

- [x] 10.1 Audit all `toast.error()` calls across the codebase
- [x] 10.2 Audit all `toast.success()` and `toast.info()` calls
- [x] 10.3 Replace hard-coded messages with translation keys
- [x] 10.4 Add comprehensive error message translations to both language files
- [x] 10.5 Test error scenarios to verify translated messages appear correctly

## 11. Add Environment Variable Support

- [x] 11.1 Add `NEXT_PUBLIC_DEFAULT_LOCALE` to `.env.example` with documentation
- [x] 11.2 Add `NEXT_PUBLIC_SUPPORTED_LOCALES` to `.env.example`
- [x] 11.3 Implement environment variable reading in i18n utils
- [x] 11.4 Update `CLAUDE.md` documentation with i18n configuration instructions

## 12. Testing and Validation

- [ ] 12.1 Create Playwright test for language switching
- [ ] 12.2 Test cookie persistence across browser sessions
- [ ] 12.3 Verify all UI text is translated in both languages
- [ ] 12.4 Test with long Italian text to check for UI overflow issues
- [ ] 12.5 Verify no TypeScript errors for missing translation keys
- [ ] 12.6 Test fallback behavior when locale cookie is invalid
- [ ] 12.7 Verify dynamic import performance and bundle size

## 13. Documentation

- [ ] 13.1 Update `CLAUDE.md` with i18n architecture section
- [ ] 13.2 Document translation file structure and conventions
- [ ] 13.3 Document how to add new languages
- [ ] 13.4 Add comments to translation files for translator guidance
- [ ] 13.5 Document language switcher usage
