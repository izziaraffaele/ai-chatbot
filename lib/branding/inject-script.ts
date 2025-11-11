/**
 * Generates a blocking script that applies branding configuration before page render
 * This prevents visual flicker when loading custom CSS, favicon, and text content from localStorage
 * Similar pattern to THEME_COLOR_SCRIPT in app/layout.tsx
 *
 * Note: This script runs synchronously in <head> before any content renders,
 * allowing us to inject CSS and set data attributes that React components can read immediately
 */
export function getBrandingInjectScript() {
  return `\
(function() {
  try {
    var config = localStorage.getItem('mm-demo-config');
    if (!config) return;

    var parsed = JSON.parse(config);
    var customCss = parsed?.appearance?.customCss;
    var favicon = parsed?.appearance?.favicon;

    // Inject custom CSS immediately (before first paint)
    if (customCss) {
      var style = document.createElement('style');
      style.id = 'branding-css-init';
      style.textContent = customCss;
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
