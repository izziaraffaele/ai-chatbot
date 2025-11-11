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
    // Inject custom CSS variables if configured
    if (branding.customCss) {
      injectCustomCss(branding.customCss);
    }
  }, [branding.customCss]);

  return <>{children}</>;
}
