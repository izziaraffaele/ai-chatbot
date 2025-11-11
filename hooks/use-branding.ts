"use client";

import { THEME_PRESETS } from "@/lib/branding/theme-presets";
import { useDemoConfig } from "./use-demo-config";

/**
 * Branding hook that provides flattened access to branding configuration
 * Integrates appearance, context, and assistant settings for easy component consumption
 */
export function useBranding() {
  const { value } = useDemoConfig();

  // Combine preset CSS with custom CSS
  const presetCss =
    value.appearance.preset !== "default"
      ? Object.values(THEME_PRESETS).find(
          (v) => v.id === value.appearance.preset
        )?.css || ""
      : "";

  const combinedCss = [presetCss, value.appearance.customCss]
    .filter(Boolean)
    .join("\n\n");

  return {
    // Appearance properties (theme, logos, assets)
    preset: value.appearance.preset,
    customCss: combinedCss || undefined,
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
