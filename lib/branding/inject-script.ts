import { THEME_PRESETS } from "./theme-presets";

/**
 * Generates a blocking script that applies branding configuration before page render
 * This prevents visual flicker when loading custom CSS, favicon, and text content from localStorage
 * Similar pattern to THEME_COLOR_SCRIPT in app/layout.tsx
 *
 * Note: This script runs synchronously in <head> before any content renders,
 * allowing us to inject CSS and set data attributes that React components can read immediately
 */
export function getBrandingInjectScript() {
  // Serialize theme presets as JSON for the client-side script
  const presetsJson = JSON.stringify(
    THEME_PRESETS.reduce(
      (carry, v) => {
        carry[v.id] = v.css;
        return carry;
      },
      {} as Record<string, string>
    )
  );

  return `\
(function() {
  try {
    var THEME_PRESETS = ${presetsJson};
    var config = localStorage.getItem('mm-demo-config');
    if (!config) return;

    var parsed = JSON.parse(config);
    var preset = parsed?.appearance?.preset;
    var customCss = parsed?.appearance?.customCss;
    var favicon = parsed?.appearance?.favicon;

    // Set theme preset data attribute on document element
    if (preset && preset !== 'default') {
      document.documentElement.setAttribute('data-theme-preset', preset);
    }

    // Combine preset CSS with custom CSS
    var presetCss = preset !== 'default' ? (THEME_PRESETS[preset] || '') : '';
    var combinedCss = [presetCss, customCss].filter(Boolean).join('\\n\\n');

    // Inject combined CSS immediately (before first paint)
    if (combinedCss) {
      var style = document.createElement('style');
      style.id = 'branding-css-init';
      style.textContent = combinedCss;
      document.head.appendChild(style);
    }

    // Update favicon immediately
    if (favicon) {
      var link = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        document.head.appendChild(link);
      }
      link.href = favicon;
    }
  } catch (e) {
    // Silently fail - branding will be applied by React on hydration
    console.error('Branding initialization error:', e);
  }
})();`;
}
