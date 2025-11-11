# internationalization Specification

## Purpose
TBD - created by archiving change add-client-i18n. Update Purpose after archive.
## Requirements
### Requirement: Translation File Structure

The system SHALL provide translation files as flat TypeScript objects with dot-notation keys following a consistent naming convention.

#### Scenario: English translations exist

- **WHEN** the application loads
- **THEN** English translations are available from `lib/i18n/translations/en.ts`
- **AND** the exported object is a flat key-value structure with string keys and values
- **AND** the object uses `as const` assertion for type inference

#### Scenario: Italian translations exist

- **WHEN** the application loads
- **THEN** Italian translations are available from `lib/i18n/translations/it.ts`
- **AND** it contains the same keys as the English translation
- **AND** values are translated to Italian

#### Scenario: Translation type safety

- **WHEN** a developer adds a new translation key to English
- **THEN** TypeScript requires the same key in all other language files
- **AND** missing keys cause compilation errors

#### Scenario: Flat key structure

- **WHEN** a translation is defined
- **THEN** keys use dot-notation format like `'auth.login.title'`
- **AND** no nested object structures are used

#### Scenario: Key naming follows conventions

- **WHEN** translation keys are created
- **THEN** they follow the pattern `{domain}.{feature}.{element}.{variant}`
- **AND** domain indicates the app area (auth, chat, sidebar, settings, artifact, errors, common)
- **AND** keys are organized and grouped with comments for readability

#### Scenario: Key naming anti-patterns are avoided

- **WHEN** reviewing translation keys
- **THEN** keys are not overly generic (e.g., 'button', 'error')
- **AND** keys do not encode component names (e.g., 'AuthFormEmailInputLabel')
- **AND** keys maintain consistent nesting depth
- **AND** keys are always in English (not translated)

### Requirement: Language Context Provider

The system SHALL provide a React context that manages the current language and translations.

#### Scenario: Context provides current locale

- **WHEN** a component uses the language context
- **THEN** it receives the current locale string (e.g., "en" or "it")
- **AND** it receives a function to change the locale

#### Scenario: Context provides translations

- **WHEN** a component uses the translations hook
- **THEN** it receives the translation object for the current locale
- **AND** the object is fully typed based on the English translations

#### Scenario: Locale change updates all consumers

- **WHEN** the locale is changed via `setLocale()`
- **THEN** all components using `useTranslations()` re-render with new translations
- **AND** the new locale is persisted to a cookie

### Requirement: Translation Hook API

The system SHALL provide a `useTranslations()` hook that returns a translation function.

#### Scenario: Hook returns translation function

- **WHEN** a component calls `useTranslations()`
- **THEN** it receives a function with signature `(key: TranslationKey, fallback: string) => string`
- **AND** the function is type-safe with autocomplete for all valid keys

#### Scenario: Translation function with valid key

- **WHEN** calling `t('auth.login.title', 'Sign In')`
- **THEN** it returns the translated value for the current locale
- **AND** for Italian locale, it returns 'Accedi'

#### Scenario: Translation function with fallback

- **WHEN** calling `t('some.missing.key', 'Fallback Text')`
- **THEN** it returns 'Fallback Text'
- **AND** no error is thrown

#### Scenario: Hook works in client components

- **WHEN** a client component marked with "use client" calls the hook
- **THEN** it successfully receives the translation function
- **AND** no hydration errors occur

#### Scenario: Type safety for translation keys

- **WHEN** a developer uses an invalid key in TypeScript
- **THEN** TypeScript shows a compilation error
- **AND** IDE autocomplete suggests only valid keys

### Requirement: Language Hook API

The system SHALL provide a `useLanguage()` hook that returns language state and controls.

#### Scenario: Hook returns current locale

- **WHEN** a component calls `useLanguage()`
- **THEN** it receives the current locale string

#### Scenario: Hook provides locale setter

- **WHEN** a component calls `useLanguage()`
- **THEN** it receives a `setLocale` function
- **AND** calling `setLocale('it')` changes the active language

### Requirement: Cookie-Based Language Persistence

The system SHALL store the user's language preference in a cookie named `locale`.

#### Scenario: Language preference persists across sessions

- **WHEN** a user selects Italian and closes the browser
- **THEN** the `locale` cookie is set to "it" with 1 year expiration
- **AND** on next visit, the application loads in Italian

#### Scenario: Cookie is set on language change

- **WHEN** the user changes language via the UI
- **THEN** the `locale` cookie is immediately updated
- **AND** the cookie has path "/" and SameSite "lax"

#### Scenario: Fallback to default language

- **WHEN** no `locale` cookie exists
- **THEN** the application uses the value from `NEXT_PUBLIC_DEFAULT_LOCALE`
- **AND** if that is not set, defaults to "en"

### Requirement: Language Switcher Component

The system SHALL provide a language switcher component for user-facing language selection.

#### Scenario: Language switcher displays current language

- **WHEN** the language switcher is rendered
- **THEN** it shows the currently active language

#### Scenario: Language switcher lists available languages

- **WHEN** the user opens the language switcher
- **THEN** it displays all supported languages (English and Italian)
- **AND** the current language is visually indicated

#### Scenario: User can change language

- **WHEN** the user selects a different language from the switcher
- **THEN** the UI immediately switches to that language
- **AND** the preference is saved to the cookie

### Requirement: Authentication Page Translations

The system SHALL translate all text on authentication pages (login and register) using the translation function.

#### Scenario: Login page in English

- **WHEN** the locale is "en"
- **THEN** components call `t('auth.login.title', 'Sign In')` and receive "Sign In"
- **AND** all labels, placeholders, and buttons use the translation function with fallbacks

#### Scenario: Login page in Italian

- **WHEN** the locale is "it"
- **THEN** components call `t('auth.login.title', 'Sign In')` and receive "Accedi"
- **AND** all Italian translations are displayed

#### Scenario: Register page translations

- **WHEN** the user views the register page
- **THEN** all text elements use translation function calls with fallbacks
- **AND** translated text includes title, labels, buttons, and helper text

### Requirement: Chat Interface Translations

The system SHALL translate all text in the chat interface.

#### Scenario: Input placeholder translation

- **WHEN** the chat input is rendered
- **THEN** the placeholder text is translated to the current locale
- **AND** English shows "Send a message...", Italian shows Italian equivalent

#### Scenario: Greeting message translation

- **WHEN** a new chat is started
- **THEN** the greeting "Hello there!" and "How can I help you today?" are translated
- **AND** the translation matches the current locale

#### Scenario: Suggested actions translation

- **WHEN** suggested actions are displayed
- **THEN** all suggestion text is translated to the current locale
- **AND** suggestions are culturally appropriate for the language

#### Scenario: Model selector translation

- **WHEN** the model selector is rendered
- **THEN** model descriptions are translated
- **AND** the selector UI labels are in the current locale

### Requirement: Sidebar and Navigation Translations

The system SHALL translate all text in the sidebar and navigation components.

#### Scenario: Sidebar menu items translation

- **WHEN** the sidebar is displayed
- **THEN** all menu items, buttons, and tooltips are translated
- **AND** the new chat button text respects the locale

#### Scenario: Chat history grouping translation

- **WHEN** chat history is grouped by time
- **THEN** group labels like "Today", "Yesterday", "Last 7 days" are translated
- **AND** the translation is appropriate for the locale

#### Scenario: Settings panel translation

- **WHEN** the settings panel is opened
- **THEN** all setting labels and descriptions are translated
- **AND** the tooltip shows translated text

### Requirement: Error and Toast Message Translations

The system SHALL translate all error messages and toast notifications using translation function with fallbacks.

#### Scenario: File upload error in English

- **WHEN** a file upload fails and locale is "en"
- **THEN** code calls `t('errors.fileUploadFailed', 'Failed to upload file, please try again!')`
- **AND** the toast shows the fallback or English translation

#### Scenario: File upload error in Italian

- **WHEN** a file upload fails and locale is "it"
- **THEN** code calls `t('errors.fileUploadFailed', 'Failed to upload file, please try again!')`
- **AND** the toast shows the Italian translation

#### Scenario: Model wait error translation

- **WHEN** user tries to send message while model is responding
- **THEN** error uses `t('errors.modelWait', 'Please wait for the model to finish its response!')`
- **AND** the message is translated to current locale

#### Scenario: Fallback prevents blank messages

- **WHEN** a translation key is missing from the translation file
- **THEN** the fallback value is displayed
- **AND** the user sees a meaningful message instead of a blank toast

### Requirement: Artifact Interface Translations

The system SHALL translate all text in the document artifact interface.

#### Scenario: Artifact action buttons translation

- **WHEN** artifact actions are displayed (edit, delete, copy)
- **THEN** all button labels and tooltips are translated
- **AND** the current locale determines the text

#### Scenario: Artifact editor UI translation

- **WHEN** document editors are opened (text, code, sheet)
- **THEN** all UI controls are translated
- **AND** toolbar buttons show translated tooltips

### Requirement: Dynamic Translation Loading

The system SHALL load translation files dynamically to minimize bundle size.

#### Scenario: Only active language is loaded

- **WHEN** the application initializes with locale "en"
- **THEN** only the English translation file is loaded
- **AND** Italian translations are not included in the initial bundle

#### Scenario: Language switch loads new translations

- **WHEN** the user switches from English to Italian
- **THEN** the Italian translation file is dynamically imported
- **AND** the UI updates once translations are loaded

### Requirement: Configuration via Environment Variables

The system SHALL support configuration of i18n behavior via environment variables.

#### Scenario: Default locale configuration

- **WHEN** `NEXT_PUBLIC_DEFAULT_LOCALE` is set to "it"
- **THEN** users without a locale cookie see Italian by default

#### Scenario: Supported locales configuration

- **WHEN** `NEXT_PUBLIC_SUPPORTED_LOCALES` is set to "en,it,es"
- **THEN** the language switcher offers those three options
- **AND** unsupported locale cookies fall back to default

#### Scenario: Default values when not configured

- **WHEN** no i18n environment variables are set
- **THEN** default locale is "en" and supported locales are "en,it"

