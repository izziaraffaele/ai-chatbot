# Change: Add Client-Side Internationalization

## Why

The application currently has hard-coded English text throughout the UI (labels, placeholders, error messages, button text). To make this platform truly white-label and serve international customers, we need support for multiple languages. The primary requirement is to support Italian in addition to English, with a simple mechanism for adding more languages in the future.

The application is primarily client-based without specific server-side rendering requirements for i18n, making a lightweight client-side solution ideal.

## What Changes

This change adds client-side internationalization (i18n) support with the following features:

- **Simple translation system** - JSON/TypeScript files for language definitions (no complex tooling)
- **Cookie-based language preference** - Store user's language choice in cookies, fallback to English
- **Two language support** - English (default) and Italian
- **Comprehensive UI coverage** - Translate all user-facing text including:
  - Authentication pages (login, register)
  - Chat interface (input placeholders, greeting, suggestions)
  - Navigation and sidebar (buttons, tooltips, menu items)
  - Error messages and toast notifications
  - Settings and configuration UI
  - Document artifacts interface
- **React hook API** - `useTranslations()` hook for accessing translations in components
- **Language switcher** - UI control in settings/user menu for changing language
- **No URL routing changes** - Language preference managed via cookies only

**Non-goals:**
- Server-side rendering with locale-specific routes
- Translation management UI or admin panel
- Automatic language detection from browser
- RTL (right-to-left) language support
- Pluralization rules or complex ICU message format
- Dynamic content translation (AI responses remain as-is)

## Impact

**Affected capabilities:**
- `internationalization` (new capability)

**Affected code:**
- `lib/i18n/` - New directory for translation system
  - `translations/en.ts` - English translations
  - `translations/it.ts` - Italian translations
  - `context.tsx` - React context for i18n
  - `use-translations.ts` - Hook for accessing translations
  - `types.ts` - TypeScript types for translations
  - `utils.ts` - Language cookie management
- `app/layout.tsx` - Wrap app with i18n provider
- `components/auth-form.tsx` - Translate labels and placeholders
- `components/multimodal-input.tsx` - Translate placeholder and error messages
- `components/suggested-actions.tsx` - Translate suggestion prompts
- `components/greeting.tsx` - Translate welcome message
- `components/app-sidebar.tsx` - Translate UI text
- `components/sidebar-history.tsx` - Translate "Today", "Last 7 days", etc.
- `components/settings.tsx` - Translate settings labels
- `components/message-actions.tsx` - Translate action tooltips
- `components/artifact-*.tsx` - Translate artifact UI text
- `components/model-selector.tsx` - Translate model descriptions
- `components/visibility-selector.tsx` - Translate visibility options
- `app/(auth)/login/page.tsx` - Translate page text
- `app/(auth)/register/page.tsx` - Translate page text
- Toast notifications throughout the app
- All error messages shown to users

**New components:**
- `components/language-switcher.tsx` - Language selection dropdown

**Environment variables:**
- `NEXT_PUBLIC_DEFAULT_LOCALE` - Default language (optional, defaults to "en")
- `NEXT_PUBLIC_SUPPORTED_LOCALES` - Comma-separated list of supported locales (optional, defaults to "en,it")
