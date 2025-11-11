# Design: Client-Side Internationalization

## Context

The application needs internationalization support to serve international customers as part of its white-label capabilities. The primary use case is supporting Italian alongside English, with a simple mechanism for adding more languages.

Key constraints:
- The app is primarily client-based (no SSR i18n requirements)
- Must be simple to maintain (no complex tooling or build processes)
- Should integrate with existing Next.js 15 and React 19 architecture
- Must work with the existing white-label branding system

## Goals / Non-Goals

**Goals:**
- Support English and Italian languages
- Cookie-based language persistence
- Simple JSON/TypeScript translation files
- Type-safe translation keys via TypeScript
- Easy to add new languages
- Minimal bundle size impact
- Works with existing React Server Components where needed

**Non-Goals:**
- Server-side rendering with locale routes (`/en/`, `/it/`)
- Browser language auto-detection
- Translation management UI
- Pluralization or complex ICU format
- Number/date formatting (can be added later)
- RTL language support

## Decisions

### API Design Summary

**Chosen API Pattern:** `t('translation.key', 'Fallback value')`

This matches popular i18n libraries (i18next, react-intl, vue-i18n) and provides:
- **Type safety**: All keys are typed as literal union from English translations
- **Graceful degradation**: Fallback ensures messages always display
- **Familiar DX**: Standard pattern developers already know
- **In-code documentation**: Fallback doubles as English text reference

**Key architectural decisions:**

1. **Flat translation objects** - Store translations as `{ 'auth.login.title': 'Sign In' }` instead of nested objects
   - **Why:** Simpler types, easier to search, no runtime traversal
   - **Trade-off:** Keys are longer but more explicit

2. **Flatten at source** - Don't transform nested objects to flat keys at runtime
   - **Why:** Zero runtime overhead, types are simpler
   - **Trade-off:** Must write flat keys manually (accepted for simplicity)

### 1. Translation Storage Format

**Decision:** Use flat TypeScript objects with dot-notation keys.

**Why:**
- Simple key-value structure is easier to maintain
- Natural fit for `t('key', 'fallback')` API pattern
- Type safety via generated union types
- No nested object navigation needed
- Easy to search and grep for keys
- Simpler to flatten at compile time

**Alternatives considered:**
- Nested objects: More complex type flattening, harder to search
- JSON files: No type safety, requires separate type definitions
- YAML: Requires parser, no native TypeScript support
- Database: Overcomplicated for static content

**Structure:**
```typescript
// translations/en.ts
export const en = {
  'auth.login.title': 'Sign In',
  'auth.login.emailLabel': 'Email Address',
  'auth.login.passwordLabel': 'Password',
  'auth.login.submit': 'Sign in',
  'auth.login.noAccount': "Don't have an account?",
  'auth.login.signUp': 'Sign up',
  'auth.login.signUpSuffix': 'for free.',
  'chat.input.placeholder': 'Send a message...',
  'chat.input.errorWait': 'Please wait for the model to finish its response!',
  'chat.greeting.hello': 'Hello there!',
  'chat.greeting.help': 'How can I help you today?',
  // ... etc
} as const;

// Extract keys for type safety
export type TranslationKey = keyof typeof en;
```

**Rationale for flat structure:**
- **Simpler types**: `type TranslationKey = keyof typeof en` gives us `'auth.login.title' | 'auth.login.emailLabel' | ...`
- **Better DX**: `t('auth.login.title', 'Sign In')` is clear and autocomplete works perfectly
- **No runtime overhead**: Direct object access `translations[key]` vs nested traversal
- **Easier to manage**: Can organize visually with comments but keep structure flat

### 2. Language Switching Mechanism

**Decision:** Cookie-based preference storage (`locale` cookie).

**Why:**
- Persists across sessions
- Works with client and server components
- No URL complexity
- Simple to implement
- Compatible with existing auth system

**Fallback chain:**
1. Check `locale` cookie
2. Fall back to `NEXT_PUBLIC_DEFAULT_LOCALE` env var
3. Fall back to `"en"`

**Cookie details:**
- Name: `locale`
- Max-Age: 1 year
- Path: `/`
- SameSite: `lax`

### 3. React Integration Pattern

**Decision:** React Context + Hook pattern with function-based API similar to i18next/react-intl.

**Why:**
- Idiomatic React pattern
- Works with both Client and Server Components (with 'use client')
- Minimal re-renders (context value memoized)
- Familiar API for developers coming from other i18n libraries
- Type-safe keys with autocomplete
- Fallback support built-in

**API:**
```typescript
// In components
const t = useTranslations();
return <label>{t('auth.login.emailLabel', 'Email Address')}</label>;

// With fallback (optional but recommended for better DX)
<input placeholder={t('chat.input.placeholder', 'Send a message...')} />

// Error handling
toast.error(t('errors.fileUploadFailed', 'Failed to upload file, please try again!'));

// Language switching
const { locale, setLocale } = useLanguage();
setLocale('it'); // Sets cookie and updates context
```

**Type signature:**
```typescript
type TranslateFn = <K extends TranslationKey>(
  key: K,
  fallback: string
) => string;

function useTranslations(): TranslateFn;
```

**Benefits of this approach:**
1. **Type safety**: TypeScript autocompletes all valid keys
2. **Fallback safety**: Fallback value serves as in-code documentation and dev-time default
3. **Graceful degradation**: If translation missing, fallback is used (shows English by default)
4. **Familiar pattern**: Matches popular libraries like i18next, react-intl
5. **Simple implementation**: Just object lookup with fallback

### 4. Component Migration Strategy

**Decision:** Incremental migration - add translations alongside existing hard-coded text, then replace.

**Why:**
- Allows testing as we go
- No big-bang deployment risk
- Can prioritize visible UI first

**Pattern:**
```typescript
// Before
<label>Email Address</label>

// After
const t = useTranslations();
<label>{t.auth.login.emailLabel}</label>
```

### 5. Type Safety Approach

**Decision:** Use `as const` assertions with flat object and `keyof` for key union type.

**Why:**
- Single source of truth (English translations define the keys)
- Other languages must have same keys (TypeScript enforces it)
- IDE autocomplete works everywhere
- Compile-time errors for missing keys
- Simple type extraction with `keyof`

**Implementation:**
```typescript
// en.ts - source of truth for keys
export const en = {
  'auth.login.title': 'Sign In',
  'auth.login.emailLabel': 'Email Address',
  // ... all keys
} as const;

export type TranslationKey = keyof typeof en;
export type TranslationDict = Record<TranslationKey, string>;

// it.ts - must have all the same keys
import type { TranslationDict } from './en';

export const it: TranslationDict = {
  'auth.login.title': 'Accedi',
  'auth.login.emailLabel': 'Indirizzo Email',
  // ... must include all keys from en.ts
};
```

**Type checking:**
- TypeScript errors if Italian is missing any English keys
- TypeScript errors if Italian has extra keys not in English
- Autocomplete works for all valid keys in `t()` function calls

### 6. Bundle Size Optimization

**Decision:** Dynamic imports for translation files.

**Why:**
- Only load the active language
- Reduces initial bundle size
- Each translation file is ~10-20KB (estimated 100-150 keys)

**Implementation:**
```typescript
async function loadTranslations(locale: string): Promise<TranslationDict> {
  switch (locale) {
    case 'it':
      return (await import('./translations/it')).it;
    case 'en':
    default:
      return (await import('./translations/en')).en;
  }
}
```

**Translation function implementation:**
```typescript
function createTranslateFn(translations: TranslationDict): TranslateFn {
  return (key, fallback) => {
    return translations[key] ?? fallback;
  };
}
```

**Performance:**
- Direct object property access: O(1) lookup
- No nested traversal needed
- Minimal runtime overhead

### 7. Translation Key Naming Conventions

**Decision:** Use consistent, hierarchical naming pattern with clear semantic grouping.

**Why:**
- Easy to find related translations
- Prevents key collisions
- Self-documenting structure
- Scalable as app grows
- Easy to grep and refactor

**Key Structure Pattern:**
```
{domain}.{feature}.{element}.{variant}
```

**Naming Guidelines:**

1. **Domain** - Top-level area of the app (2-3 levels max)
   - `auth.*` - Authentication/authorization
   - `chat.*` - Chat interface
   - `sidebar.*` - Sidebar navigation
   - `settings.*` - Settings panel
   - `artifact.*` - Document artifacts
   - `errors.*` - Error messages
   - `common.*` - Shared/reusable text

2. **Feature** - Specific feature within domain
   - `auth.login.*` - Login page
   - `auth.register.*` - Register page
   - `chat.input.*` - Chat input area
   - `chat.greeting.*` - Welcome greeting
   - `chat.suggestions.*` - Suggested actions

3. **Element** - UI element or content type
   - `.title` - Page/section titles
   - `.label` - Form labels
   - `.placeholder` - Input placeholders
   - `.button` - Button text
   - `.tooltip` - Tooltip text
   - `.description` - Descriptive text
   - `.message` - User-facing messages

4. **Variant** (optional) - Specific state or context
   - `.submit` vs `.cancel`
   - `.success` vs `.error`
   - `.empty` vs `.loading`

**Examples:**
```typescript
export const en = {
  // Authentication - Login
  'auth.login.title': 'Sign In',
  'auth.login.emailLabel': 'Email Address',
  'auth.login.emailPlaceholder': 'user@example.com',
  'auth.login.passwordLabel': 'Password',
  'auth.login.buttonSubmit': 'Sign in',
  'auth.login.noAccount': "Don't have an account?",
  'auth.login.linkSignUp': 'Sign up',
  'auth.login.linkSignUpSuffix': 'for free.',

  // Authentication - Register
  'auth.register.title': 'Create Account',
  'auth.register.emailLabel': 'Email Address',
  'auth.register.passwordLabel': 'Password',
  'auth.register.buttonSubmit': 'Create account',

  // Chat - Input
  'chat.input.placeholder': 'Send a message...',
  'chat.input.buttonAttach': 'Attach file',
  'chat.input.buttonSend': 'Send message',
  'chat.input.buttonStop': 'Stop generating',

  // Chat - Greeting
  'chat.greeting.title': 'Hello there!',
  'chat.greeting.subtitle': 'How can I help you today?',

  // Chat - Suggestions
  'chat.suggestions.prompt1': 'What are the advantages of using Next.js?',
  'chat.suggestions.prompt2': 'Write code to demonstrate Dijkstra\'s algorithm',
  'chat.suggestions.prompt3': 'Help me write an essay about Silicon Valley',
  'chat.suggestions.prompt4': 'What is the weather in San Francisco?',

  // Sidebar
  'sidebar.buttonNewChat': 'New Chat',
  'sidebar.tooltipNewChat': 'Start a new conversation',
  'sidebar.buttonDeleteAll': 'Delete all chats',
  'sidebar.history.today': 'Today',
  'sidebar.history.yesterday': 'Yesterday',
  'sidebar.history.last7Days': 'Last 7 days',
  'sidebar.history.last30Days': 'Last 30 days',

  // Settings
  'settings.title': 'Settings',
  'settings.language.label': 'Language',
  'settings.language.description': 'Choose your preferred language',
  'settings.theme.label': 'Theme',
  'settings.theme.description': 'Customize the appearance',

  // Artifacts
  'artifact.actions.edit': 'Edit',
  'artifact.actions.delete': 'Delete',
  'artifact.actions.copy': 'Copy',
  'artifact.actions.download': 'Download',
  'artifact.code.tooltipCopy': 'Copy code',
  'artifact.code.tooltipCopied': 'Copied!',

  // Errors
  'errors.fileUploadFailed': 'Failed to upload file, please try again!',
  'errors.fileUploadSize': 'File is too large. Maximum size is 10MB.',
  'errors.modelWait': 'Please wait for the model to finish its response!',
  'errors.networkError': 'Network error. Please check your connection.',
  'errors.authInvalid': 'Invalid credentials!',
  'errors.authValidation': 'Failed validating your submission!',

  // Common
  'common.loading': 'Loading...',
  'common.saving': 'Saving...',
  'common.saved': 'Saved',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.close': 'Close',
};
```

**Anti-Patterns to Avoid:**

❌ **Too generic:**
```typescript
'button': 'Submit'  // Which button? Where?
'error': 'Failed'   // What failed?
```

❌ **Too specific (encoding component names):**
```typescript
'AuthFormEmailInputLabel': 'Email'  // Component names change
'MultimodalInputPlaceholderText': 'Send...'  // Brittle
```

❌ **Inconsistent nesting:**
```typescript
'auth.loginTitle': 'Sign In',      // Missing level
'auth.login.email': 'Email',        // 3 levels
'authRegisterPassword': 'Password', // No dots
```

❌ **Mixing languages in keys:**
```typescript
'auth.accedi.title': 'Sign In'  // Don't translate keys!
```

**Organization in File:**

Group keys with comments to improve readability:

```typescript
export const en = {
  // ============================================================================
  // Authentication
  // ============================================================================

  // Login Page
  'auth.login.title': 'Sign In',
  'auth.login.emailLabel': 'Email Address',
  // ... more login keys

  // Register Page
  'auth.register.title': 'Create Account',
  // ... more register keys

  // ============================================================================
  // Chat Interface
  // ============================================================================

  // Input Area
  'chat.input.placeholder': 'Send a message...',
  // ... more input keys

  // Greeting
  'chat.greeting.title': 'Hello there!',
  // ... more greeting keys
} as const;
```

**Benefits:**
- **Searchable**: `grep "auth.login" translations/` finds all login text
- **Refactorable**: Easy to move keys when restructuring UI
- **Reviewable**: Translation PRs are clear and organized
- **Maintainable**: Pattern is consistent across the app
- **Scalable**: Can add hundreds of keys without chaos

### 8. Toast Notifications

**Decision:** Use translation function with fallback for all toast messages.

**Why:**
- Consistent UX across all messages
- Centralized error message management
- Easy to maintain
- Fallback ensures messages always show even if translation missing

**Pattern:**
```typescript
// Before
toast.error("Failed to upload file, please try again!");

// After
const t = useTranslations();
toast.error(t('errors.fileUploadFailed', 'Failed to upload file, please try again!'));
```

**Benefits:**
- Fallback string serves as English translation inline
- If translation file incomplete, fallback prevents blank toasts
- Easy to search codebase for all toast messages
- Clear at call site what message will show

## Risks / Trade-offs

**Risk:** Large translation objects increase bundle size
- **Mitigation:** Dynamic imports, code splitting per language
- **Impact:** Each language adds ~10-20KB (gzipped ~3-5KB)

**Risk:** Missing translations at runtime if type checking fails
- **Mitigation:** TypeScript strict mode enforces completeness
- **Fallback:** Default to English key path if translation missing

**Risk:** Translation keys become outdated as UI evolves
- **Mitigation:** TypeScript errors on missing keys
- **Process:** Update all translations when adding new UI text

**Trade-off:** No pluralization support
- **Accepted:** English and Italian can work with simple strings for v1
- **Future:** Add ICU-style format library if needed

**Trade-off:** No automatic browser language detection
- **Accepted:** Users must explicitly choose language
- **Future:** Can add detection as enhancement

## Migration Plan

**Phase 1: Infrastructure (Day 1)**
1. Create `lib/i18n/` structure
2. Implement context and hooks
3. Add English translations (copy existing text)
4. Add Italian translations
5. Create language switcher component

**Phase 2: Authentication Pages (Day 1-2)**
1. Migrate login page
2. Migrate register page
3. Update auth form component

**Phase 3: Chat Interface (Day 2-3)**
1. Migrate multimodal input
2. Migrate greeting component
3. Migrate suggested actions
4. Update chat header

**Phase 4: Sidebar & Navigation (Day 3)**
1. Migrate app sidebar
2. Migrate sidebar history
3. Migrate user navigation
4. Migrate settings

**Phase 5: Messages & Artifacts (Day 4)**
1. Migrate message actions
2. Migrate artifact components
3. Migrate document editors
4. Update all tooltips

**Phase 6: Error Messages (Day 4-5)**
1. Audit all `toast()` calls
2. Replace with translated messages
3. Test error scenarios

**Testing:**
- Manual testing in both languages for each phase
- Playwright tests with language switching
- Visual regression testing for text overflow

**Rollback:**
- Feature can be disabled by setting `NEXT_PUBLIC_SUPPORTED_LOCALES=en`
- Cookie can be cleared to reset to default
- No database migrations required

## Open Questions

None - requirements are clear based on user specification.
