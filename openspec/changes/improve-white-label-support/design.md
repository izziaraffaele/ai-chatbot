# Design: Improve White-Label Support

## Context

The application has a dual-hook architecture for branding:
- `useDemoConfig()` - SWR-based state management for all demo configuration including branding
- `useBranding()` - Thin wrapper that flattens branding-specific properties from demo config

Currently, only one component (`app-sidebar.tsx`) uses this system. The rest of the application uses hard-coded values. Environment variables are defined but never integrated with the configuration system.

**Key constraints:**
- Client-side rendering focus (SEO not relevant)
- Demo config panel schema is locked (cannot modify)
- Internationalization deferred to future work
- Must maintain backwards compatibility with existing demo config structure

## Goals / Non-Goals

**Goals:**
- Complete white-label support by connecting all visual branding elements to `useBranding` hook
- Integrate environment variables as fallback defaults for demo configuration
- Enable dynamic favicon and custom CSS theming
- Support both server-rendered metadata and client-rendered components
- Maintain single source of truth for branding data

**Non-Goals:**
- Internationalization (text content, labels, placeholders) - future proposal
- Chat suggestions or welcome screen content - not branding related
- Demo config panel UI or schema changes - locked by requirement
- Multi-tenant support with per-tenant configs - out of scope
- Server-side rendering optimization - client-side focus per requirements

## Decisions

### Decision 1: Environment Variable Integration Pattern

**What:** Use environment variables as the default layer in a three-tier fallback system: `env → demo config → schema defaults`

**Why:**
- Allows deployment-time configuration without code changes
- Provides sensible defaults for new deployments
- Demo config can override for testing/development
- Schema defaults as final fallback ensure system never breaks

**Implementation:**
```typescript
// config/demo.ts
export function getDemoConfig(): DemoConfig {
  const envDefaults = {
    appearance: {
      logo: process.env.NEXT_PUBLIC_LOGO_URL,
      favicon: process.env.NEXT_PUBLIC_FAVICON_URL,
      authLogo: process.env.NEXT_PUBLIC_AUTH_LOGO_URL,
      defaultMode: process.env.NEXT_PUBLIC_DEFAULT_THEME_MODE,
      // ... other appearance vars
    },
    app: {
      name: process.env.NEXT_PUBLIC_APP_NAME,
      description: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
    },
    organization: {
      name: process.env.NEXT_PUBLIC_ORGANIZATION_NAME,
      websiteUrl: process.env.NEXT_PUBLIC_ORGANIZATION_URL,
    },
    assistant: {
      name: process.env.NEXT_PUBLIC_ASSISTANT_NAME,
      avatar: process.env.NEXT_PUBLIC_ASSISTANT_AVATAR_URL,
    },
  };

  // Merge: schema defaults < env defaults < persisted demo config
  return deepMerge(schemaDefaults, envDefaults, getPersistedConfig());
}
```

**Alternatives considered:**
- Environment variables as overrides (highest priority) - Rejected: would prevent demo config panel from working
- Separate config files - Rejected: adds complexity, environment variables are standard Next.js pattern
- Build-time configuration only - Rejected: demo config requires runtime updates

### Decision 2: Server vs Client Branding Split

**What:** Use environment variables directly for server-rendered content (metadata), use `useBranding` hook for client-rendered components

**Why:**
- Server Components cannot access client-side state (SWR-based demo config)
- Metadata is server-rendered and cached, dynamic updates not useful
- Keeps server bundle small by avoiding client-side dependencies
- Client components get full dynamic branding with runtime updates

**Implementation:**
```typescript
// app/layout.tsx (Server Component)
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://chat.vercel.ai'),
  title: process.env.NEXT_PUBLIC_METADATA_TITLE || 'AI Chatbot',
  description: process.env.NEXT_PUBLIC_METADATA_DESCRIPTION || 'AI chatbot template',
};

// app/branding-provider.tsx (Client Component)
'use client';
export function BrandingProvider({ children }) {
  const branding = useBranding();

  useEffect(() => {
    // Update favicon
    if (branding.favicon) updateFavicon(branding.favicon);

    // Inject custom CSS
    if (branding.customCss) injectCustomCss(branding.customCss);
  }, [branding]);

  return children;
}
```

**Alternatives considered:**
- Server-side branding config separate from client config - Rejected: duplicates configuration
- Dynamic metadata generation - Rejected: not supported for static export, adds complexity
- Client-side only metadata updates - Rejected: bad for initial page load and crawlers

### Decision 3: Dynamic Favicon Implementation

**What:** Use client-side JavaScript to update favicon `<link>` element when branding config changes

**Why:**
- Favicon must be dynamic per requirement
- Next.js static favicon in `/public` cannot be dynamic
- DOM manipulation is straightforward and well-supported across browsers
- Happens after initial page load, no performance impact

**Implementation:**
```typescript
// lib/utils.ts
export function updateFavicon(url: string) {
  const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']")
    || document.createElement('link');
  link.type = 'image/x-icon';
  link.rel = 'shortcut icon';
  link.href = url;
  document.head.appendChild(link);
}
```

**Alternatives considered:**
- Server-side favicon generation - Rejected: requires server rendering, against requirements
- Separate favicon per route - Rejected: overkill, branding is global
- Static favicon only - Rejected: doesn't meet dynamic requirement

### Decision 4: Custom CSS Variable Injection

**What:** Inject CSS custom properties from `appearance.customCss` into a `<style>` tag in document head

**Why:**
- CSS variables provide theme customization without rebuilding styles
- Scoped to `:root` for global application
- Can override Tailwind CSS defaults and shadcn theme tokens
- Clean separation between structure (components) and styling (theme)

**Implementation:**
```typescript
// lib/utils.ts
export function injectCustomCss(css: string) {
  const styleId = 'branding-custom-css';
  let style = document.getElementById(styleId);

  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }

  style.textContent = `:root { ${css} }`;
}
```

**Example usage in demo config:**
```typescript
appearance: {
  customCss: `
    --primary: 220 90% 56%;
    --primary-foreground: 0 0% 100%;
    --radius: 0.5rem;
  `
}
```

**Alternatives considered:**
- CSS-in-JS library - Rejected: adds bundle size, existing Tailwind setup sufficient
- Separate theme files - Rejected: requires build step, not runtime configurable
- Inline styles on components - Rejected: doesn't support CSS variables, less maintainable

### Decision 5: Avatar Service URL Template

**What:** Support URL templates with `{email}` placeholder for avatar service configuration

**Why:**
- Different avatar services use different URL patterns
- Template pattern is flexible and intuitive
- Maintains compatibility with default `avatar.vercel.sh/{email}` format

**Implementation:**
```typescript
// components/sidebar-user-nav.tsx
const avatarServiceUrl = process.env.NEXT_PUBLIC_AVATAR_SERVICE_URL
  || 'https://avatar.vercel.sh/{email}';

const avatarUrl = avatarServiceUrl.replace('{email}', user.email);
```

**Alternatives considered:**
- Fixed URL format - Rejected: not flexible enough for different services
- Callback function for URL generation - Rejected: cannot be configured via environment variables
- Multiple avatar service integrations - Rejected: overengineering for current needs

### Decision 6: Auth Page Logo Fallback Chain

**What:** Auth pages check `authLogo` first, fall back to `logo`, then fall back to text

**Why:**
- Allows separate logo for auth pages (common pattern for security/trust)
- Graceful degradation ensures something always displays
- Reduces configuration burden (single logo config works everywhere)

**Implementation:**
```typescript
// app/(auth)/login/page.tsx
'use client';

export default function LoginPage() {
  const branding = useBranding();
  const logoUrl = branding.authLogo || branding.logo;

  return (
    <div>
      {logoUrl ? (
        <img src={logoUrl} alt={branding.organizationName || branding.appName} />
      ) : (
        <h1>{branding.appName}</h1>
      )}
      {/* ... rest of page */}
    </div>
  );
}
```

**Alternatives considered:**
- Require authLogo always set - Rejected: too rigid, most deployments use same logo
- Single logo property - Rejected: some brands need different logos for public vs auth
- Complex logo configuration object - Rejected: overengineering

## Risks / Trade-offs

### Risk: Breaking Changes for Existing Deployments

**Risk:** Existing deployments with hard-coded metadata will break if environment variables not set

**Mitigation:**
- Provide sensible defaults in code (e.g., "AI Chatbot" for title)
- Document required vs optional environment variables clearly in `.env.example`
- Add migration guide in PR description
- Mark as breaking change in release notes

### Risk: Client-Side Flash of Unstyled Content

**Risk:** Custom CSS and favicon update after initial render, causing visual flash

**Mitigation:**
- Apply custom CSS in a top-level provider before rendering children
- Use `useEffect` with layout effect timing where possible
- Accept minor flash as acceptable trade-off for client-side flexibility (per requirements)
- Consider server-side injection in future if needed (out of current scope)

### Risk: Environment Variable Complexity

**Risk:** Many environment variables to configure, risk of misconfiguration

**Mitigation:**
- All branding environment variables are optional with defaults
- Comprehensive documentation in `.env.example` with examples
- Validation in `getDemoConfig()` to warn about invalid URLs
- Demo config panel allows testing without environment changes

### Trade-off: Server/Client Split Complexity

**Trade-off:** Different branding mechanisms for server (env vars) vs client (useBranding hook)

**Rationale:**
- Necessary due to Next.js Server/Client Component boundary
- Keeps each layer using appropriate technology
- Server: static, environment-based, fast
- Client: dynamic, runtime-configurable, flexible
- Clear documentation reduces confusion

### Trade-off: No SSR for Client Branding

**Trade-off:** Client branding (logos, custom CSS) not in initial HTML

**Rationale:**
- Acceptable per requirements (SSR not a goal)
- Enables runtime configuration without rebuilds
- Reduces server complexity
- Could be added later if SEO becomes important

## Migration Plan

### Phase 1: Non-Breaking Additions (Safe to Deploy)

1. Add environment variable integration to `config/demo.ts`
2. Add utilities to `lib/utils.ts` (favicon, custom CSS)
3. Update `.env.example` with branding variables
4. Update components to use `useBranding` (maintain fallbacks)

### Phase 2: Breaking Changes (Requires Environment Variables)

1. Update `app/layout.tsx` metadata to use environment variables
2. Remove hard-coded fallbacks from components
3. Test all components with environment variables set and unset

### Rollback Plan

If issues arise:
1. Revert metadata changes in `app/layout.tsx` to hard-coded values
2. Keep environment variable integration and `useBranding` adoption (safe)
3. Document specific issue and fix in follow-up

### Deployment Checklist

- [ ] Set required environment variables: `NEXT_PUBLIC_METADATA_TITLE`, `NEXT_PUBLIC_APP_URL`
- [ ] Set optional branding variables based on customization needs
- [ ] Test demo config panel still works and overrides environment variables
- [ ] Verify favicon updates when changed in demo panel
- [ ] Check auth pages display logos correctly
- [ ] Confirm custom CSS injection works

## Open Questions

1. **Should we validate URL format for logo/favicon/avatar URLs?**
   - Recommendation: Add basic URL validation in `getDemoConfig()` with console warnings
   - Allows flexibility but helps catch typos

2. **Should we support dark/light mode-specific logos?**
   - Recommendation: Defer to future proposal - adds complexity
   - Current single logo approach is sufficient for MVP

3. **Should avatar service support additional parameters beyond email?**
   - Recommendation: No - keep simple for now
   - Can extend template system later if needed (e.g., `{email}`, `{name}`, `{id}`)

4. **Should we persist favicon/customCss changes from demo panel?**
   - Recommendation: Yes - demo config already persists to localStorage
   - Ensures consistency with other demo config behavior
