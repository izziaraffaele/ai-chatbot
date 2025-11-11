# Implementation Tasks

## 1. Environment Variable Integration

- [x] 1.1 Update `config/demo.ts` to read `NEXT_PUBLIC_*` environment variables and merge them as defaults
- [x] 1.2 Update `hooks/use-branding.ts` to remove hard-coded fallbacks (rely on config defaults)
- [x] 1.3 Verify environment variable precedence: env → demo config → schema defaults
- [x] 1.4 Update `.env.example` with comprehensive branding variable documentation

## 2. Core Branding Utilities

- [x] 2.1 Add favicon update utility function to `lib/utils.ts`
- [x] 2.2 Add custom CSS injection utility function to `lib/utils.ts`
- [x] 2.3 Create `useEffect` hook in root layout or app component to apply dynamic favicon
- [x] 2.4 Create `useEffect` hook to inject custom CSS variables from branding config

## 3. Server-Side Metadata

- [x] 3.1 Update `app/layout.tsx` to read metadata from environment variables
- [x] 3.2 Update `metadataBase` to use `NEXT_PUBLIC_APP_URL`
- [x] 3.3 Update `title` to use `NEXT_PUBLIC_METADATA_TITLE` or `NEXT_PUBLIC_APP_NAME`
- [x] 3.4 Update `description` to use `NEXT_PUBLIC_METADATA_DESCRIPTION`
- [x] 3.5 Ensure proper fallbacks for missing metadata variables

## 4. Authentication Pages

- [x] 4.1 Update `app/(auth)/login/page.tsx` to display logo from branding config
- [x] 4.2 Update `app/(auth)/register/page.tsx` to display logo from branding config
- [x] 4.3 Add fallback for missing authLogo (use regular logo)
- [x] 4.4 Ensure auth pages are client components if using `useBranding` hook

## 5. Avatar Service Configuration

- [x] 5.1 Update `components/sidebar-user-nav.tsx` to use `NEXT_PUBLIC_AVATAR_SERVICE_URL`
- [x] 5.2 Add fallback to `https://avatar.vercel.sh/` if environment variable not set
- [x] 5.3 Support `{email}` placeholder in avatar service URL template

## 6. Component Updates

- [x] 6.1 Audit `components/app-sidebar.tsx` for consistent branding usage (already implemented)
- [x] 6.2 Remove debug `console.log` from `components/app-sidebar.tsx:49`
- [x] 6.3 Verify all navigation components use `useBranding` for logos and names
- [x] 6.4 Update any remaining components with hard-coded organization/app names

## 7. Theme and Styling

- [x] 7.1 Implement custom CSS variable injection based on `appearance.customCss`
- [x] 7.2 Apply theme preset based on `appearance.preset`
- [x] 7.3 Initialize theme mode based on `appearance.defaultMode`
- [x] 7.4 Ensure custom CSS updates when demo config changes

## 8. Testing and Validation

- [ ] 8.1 Test environment variable integration (set vars, verify they appear in UI)
- [ ] 8.2 Test demo config override (ensure demo panel values override env vars)
- [ ] 8.3 Test favicon updates (change favicon in demo panel, verify browser updates)
- [ ] 8.4 Test custom CSS injection (set customCss in demo config, verify styles applied)
- [ ] 8.5 Test auth page logos (verify logo displays on login/register)
- [ ] 8.6 Test avatar service configuration (change URL, verify avatars update)
- [ ] 8.7 Test fallback behaviors (missing logos, missing env vars)
- [ ] 8.8 Run `pnpm lint` to ensure code quality standards
- [ ] 8.9 Run `pnpm format` to auto-fix any style issues

## 9. Documentation

- [x] 9.1 Update `.env.example` with all branding environment variables
- [x] 9.2 Add comments to `.env.example` explaining each branding variable
- [ ] 9.3 Document branding hook usage patterns for developers
- [ ] 9.4 Document fallback behavior and precedence rules
