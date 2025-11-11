'use client';

import { useDemoConfig } from './use-demo-config';

/**
 * Branding hook that provides flattened access to branding configuration
 * Integrates appearance, context, and assistant settings for easy component consumption
 */
export function useBranding() {
  const { value } = useDemoConfig();

  return {
    // Appearance properties (theme, logos, assets)
    preset: value.appearance.preset,
    customCss: value.appearance.customCss,
    defaultMode: value.appearance.defaultMode,
    favicon: value.appearance.favicon,
    logo: value.appearance.logo,
    ogImage: value.appearance.ogImage,
    authLogo: value.appearance.authLogo,

    // Organization properties
    organizationName: value.context.organization?.name,
    organizationDescription: value.context.organization?.description,
    organizationWebsiteUrl: value.context.organization?.websiteUrl,

    // App properties
    appName: value.context.app?.name,
    appDescription: value.context.app?.description,

    // Assistant properties
    assistantName: value.assistant.name,
    assistantAvatar: value.assistant.avatar,
    assistantDescription: value.assistant.description,
  };
}

/**
 * Return type for useBranding hook
 * Exported for type inference in components
 */
export type BrandingConfig = ReturnType<typeof useBranding>;
