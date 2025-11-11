"use client";

import { useEffect } from "react";
import { useBranding } from "@/hooks/use-branding";
import { injectCustomCss, updateFavicon } from "@/lib/utils";

/**
 * BrandingProvider component
 * Applies dynamic branding updates (favicon, custom CSS) based on demo config
 * Should be rendered high in the component tree to ensure branding is applied early
 */
export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const branding = useBranding();

  useEffect(() => {
    // Update favicon if configured
    if (branding.favicon) {
      updateFavicon(branding.favicon);
    }
  }, [branding.favicon]);

  useEffect(() => {
    // Inject custom CSS variables if configured (or remove if empty)
    injectCustomCss(branding.customCss);

    // Also remove the initial branding CSS injected in <head> on first hydration
    // This ensures we don't have duplicate style tags
    const initStyle = document.getElementById("branding-css-init");
    if (initStyle) {
      initStyle.remove();
    }
  }, [branding.customCss]);

  useEffect(() => {
    // Set theme preset data attribute for custom Tailwind variants
    if (branding.preset && branding.preset !== "default") {
      document.documentElement.setAttribute(
        "data-theme-preset",
        branding.preset
      );
    } else {
      document.documentElement.removeAttribute("data-theme-preset");
    }
  }, [branding.preset]);

  return <>{children}</>;
}
