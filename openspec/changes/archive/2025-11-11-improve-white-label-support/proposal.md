# Change: Improve White-Label Support

## Why

The application has foundational white-label infrastructure (`useBranding` and `useDemoConfig` hooks) but only one component (app-sidebar) currently uses it. The majority of the application uses hard-coded values for branding elements like organization names, logos, assistant names, colors, and theming. This limits the ability to customize the application's look and feel for different customers or use cases without code changes.

Environment variables are defined in `.env.example` for branding configuration but are never read or integrated into the branding system, creating confusion about how to configure the application.

## What Changes

This change completes the white-label support by:

- **Integrating environment variables** - Connect `NEXT_PUBLIC_*` branding variables from `.env.example` to the demo config system as fallback values
- **Adopting useBranding throughout** - Replace all hard-coded branding values in components with `useBranding` hook calls for visual customization (logos, colors, theming, avatars)
- **Dynamic favicon support** - Implement client-side favicon updates based on demo config
- **Avatar service configuration** - Use `NEXT_PUBLIC_AVATAR_SERVICE_URL` instead of hard-coded avatar.vercel.sh
- **Logo display consistency** - Ensure logos are displayed from branding config across auth pages and navigation
- **Theme customization** - Apply custom CSS variables from branding config to support custom color schemes
- **Consistent branding patterns** - Establish clear patterns for how components should consume branding data
- **Server-side metadata support** - Use environment variables for server-rendered metadata in root layout

**Non-goals (deferred to future proposals):**
- Internationalization and text content (placeholders, labels, messages)
- Chat suggestions and welcome screen content
- Demo config panel schema changes

**Breaking Changes:**
- **BREAKING**: Root layout metadata now reads from environment variables (`NEXT_PUBLIC_METADATA_TITLE`, `NEXT_PUBLIC_METADATA_DESCRIPTION`) instead of hard-coded values

## Impact

**Affected capabilities:**
- `white-label` (new capability)

**Affected code:**
- `hooks/use-branding.ts` - Enhanced to provide fallback values from environment
- `config/demo.ts` - Integrated with environment variables for default values
- `app/layout.tsx` - Metadata from environment variables, favicon management
- `app/(auth)/login/page.tsx` - Logo display from branding config
- `app/(auth)/register/page.tsx` - Logo display from branding config
- `components/sidebar-user-nav.tsx` - Configurable avatar service
- `components/app-sidebar.tsx` - Already uses branding (verify consistency)
- `lib/utils.ts` - Favicon and theme customization utilities
- `.env.example` - Documentation of required/optional branding variables
- Global styles - Custom CSS variable injection from branding config

**Affected components for visual branding:**
- Authentication pages (logos, theming)
- Navigation and sidebar (logos, organization name, theming)
- User avatars (service URL configuration)
- Application chrome (favicon, page titles, colors)

**Not affected (out of scope per requirements):**
- `components/suggested-actions.tsx` - Chat content (non-goal)
- `components/demo-config/panel.tsx` - Demo panel unchanged (non-goal)
- `components/auth-form.tsx` - Form text content (i18n, non-goal)
- `components/multimodal-input.tsx` - Input text content (i18n, non-goal)
