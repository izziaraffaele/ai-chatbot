/**
 * Theme presets - must be kept in sync with components/demo-config/index.tsx
 * Duplicated here to avoid client-side imports in server component
 */
export const THEME_PRESETS = [
  {
    id: "playful",
    name: "Playful",
    description: "Vibrant, friendly theme",
    css: `:root {
  --radius: 1.25rem;
  --shadow-x: 0;
  --shadow-y: 2px;
  --shadow-blur: 8px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.12;
  --shadow-color: hsl(0 0% 0%);
  --shadow-2xs: 0 2px 8px 0px hsl(0 0% 0% / 0.06);
  --shadow-xs: 0 2px 8px 0px hsl(0 0% 0% / 0.06);
  --shadow-sm: 0 2px 8px 0px hsl(0 0% 0% / 0.12), 0 2px 4px -1px hsl(0 0% 0% / 0.12);
  --shadow: 0 2px 8px 0px hsl(0 0% 0% / 0.12), 0 2px 4px -1px hsl(0 0% 0% / 0.12);
  --shadow-md: 0 4px 12px 0px hsl(0 0% 0% / 0.12), 0 2px 6px -1px hsl(0 0% 0% / 0.12);
  --shadow-lg: 0 6px 16px 0px hsl(0 0% 0% / 0.12), 0 4px 8px -1px hsl(0 0% 0% / 0.12);
  --shadow-xl: 0 8px 20px 0px hsl(0 0% 0% / 0.12), 0 6px 12px -1px hsl(0 0% 0% / 0.12);
  --shadow-2xl: 0 10px 24px 0px hsl(0 0% 0% / 0.20);
}

.dark {
  --radius: 1.25rem;
  --shadow-x: 0;
  --shadow-y: 2px;
  --shadow-blur: 8px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.18;
  --shadow-color: hsl(0 0% 0%);
  --shadow-2xs: 0 2px 8px 0px hsl(0 0% 0% / 0.09);
  --shadow-xs: 0 2px 8px 0px hsl(0 0% 0% / 0.09);
  --shadow-sm: 0 2px 8px 0px hsl(0 0% 0% / 0.18), 0 2px 4px -1px hsl(0 0% 0% / 0.18);
  --shadow: 0 2px 8px 0px hsl(0 0% 0% / 0.18), 0 2px 4px -1px hsl(0 0% 0% / 0.18);
  --shadow-md: 0 4px 12px 0px hsl(0 0% 0% / 0.18), 0 2px 6px -1px hsl(0 0% 0% / 0.18);
  --shadow-lg: 0 6px 16px 0px hsl(0 0% 0% / 0.18), 0 4px 8px -1px hsl(0 0% 0% / 0.18);
  --shadow-xl: 0 8px 20px 0px hsl(0 0% 0% / 0.18), 0 6px 12px -1px hsl(0 0% 0% / 0.18);
  --shadow-2xl: 0 10px 24px 0px hsl(0 0% 0% / 0.30);
}`,
  },
  {
    id: "tech",
    name: "Tech",
    description: "Dark, professional theme",
    css: `:root {
  --radius: 0.25rem;
  --shadow-x: 0;
  --shadow-y: 0px;
  --shadow-blur: 1px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.08;
  --shadow-color: hsl(0 0% 0%);
  --shadow-2xs: 0 0px 1px 0px hsl(0 0% 0% / 0.04);
  --shadow-xs: 0 0px 1px 0px hsl(0 0% 0% / 0.04);
  --shadow-sm: 0 1px 2px 0px hsl(0 0% 0% / 0.08), 0 0px 1px 0px hsl(0 0% 0% / 0.08);
  --shadow: 0 1px 2px 0px hsl(0 0% 0% / 0.08), 0 0px 1px 0px hsl(0 0% 0% / 0.08);
  --shadow-md: 0 1px 3px 0px hsl(0 0% 0% / 0.08), 0 1px 2px -1px hsl(0 0% 0% / 0.08);
  --shadow-lg: 0 2px 4px 0px hsl(0 0% 0% / 0.08), 0 1px 3px -1px hsl(0 0% 0% / 0.08);
  --shadow-xl: 0 2px 6px 0px hsl(0 0% 0% / 0.08), 0 2px 4px -1px hsl(0 0% 0% / 0.08);
  --shadow-2xl: 0 3px 8px 0px hsl(0 0% 0% / 0.15);
  --tracking-normal: -0.01em;
}

.dark {
  --radius: 0.25rem;
  --shadow-x: 0;
  --shadow-y: 0px;
  --shadow-blur: 1px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.12;
  --shadow-color: hsl(0 0% 0%);
  --shadow-2xs: 0 0px 1px 0px hsl(0 0% 0% / 0.06);
  --shadow-xs: 0 0px 1px 0px hsl(0 0% 0% / 0.06);
  --shadow-sm: 0 1px 2px 0px hsl(0 0% 0% / 0.12), 0 0px 1px 0px hsl(0 0% 0% / 0.12);
  --shadow: 0 1px 2px 0px hsl(0 0% 0% / 0.12), 0 0px 1px 0px hsl(0 0% 0% / 0.12);
  --shadow-md: 0 1px 3px 0px hsl(0 0% 0% / 0.12), 0 1px 2px -1px hsl(0 0% 0% / 0.12);
  --shadow-lg: 0 2px 4px 0px hsl(0 0% 0% / 0.12), 0 1px 3px -1px hsl(0 0% 0% / 0.12);
  --shadow-xl: 0 2px 6px 0px hsl(0 0% 0% / 0.12), 0 2px 4px -1px hsl(0 0% 0% / 0.12);
  --shadow-2xl: 0 3px 8px 0px hsl(0 0% 0% / 0.20);
  --tracking-normal: -0.01em;
}`,
  },
];

export const THEME_COLOR_PRESETS = [
  {
    id: "yellow",
    name: "Playful",
    description: "Vibrant, friendly theme",
    previewColors: {
      primary: "oklch(0.8505 0.1655 87.8598)",
    },
    css: `:root {
  --background: oklch(1.0000 0 0);
  --foreground: oklch(0.2070 0.0380 265.0691);
  --card: oklch(1.0000 0 0);
  --card-foreground: oklch(0.2070 0.0380 265.0691);
  --popover: oklch(1.0000 0 0);
  --popover-foreground: oklch(0.2070 0.0380 265.0691);
  --primary: oklch(0.8505 0.1655 87.8598);
  --primary-foreground: oklch(0.2070 0.0380 265.0691);
  --secondary: oklch(0.9670 0.0029 264.5419);
  --secondary-foreground: oklch(0.2101 0.0318 264.6645);
  --muted: oklch(0.9276 0.0058 264.5313);
  --muted-foreground: oklch(0.7107 0.0351 256.7878);
  --accent: oklch(0.7704 0.1646 70.6613);
  --accent-foreground: oklch(0.2070 0.0380 265.0691);
  --destructive: oklch(0.6358 0.2088 25.4126);
  --destructive-foreground: oklch(0.9851 0 0);
  --border: oklch(0.9276 0.0058 264.5313);
  --input: oklch(0.9276 0.0058 264.5313);
  --ring: oklch(0.8664 0.1493 90.0423);
  --chart-1: oklch(0.8241 0.1251 84.4866);
  --chart-2: oklch(0.8006 0.1116 203.6044);
  --chart-3: oklch(0.4198 0.1693 266.7798);
  --chart-4: oklch(0.9214 0.0762 125.5777);
  --chart-5: oklch(0.9151 0.1032 116.1913);
  --sidebar: oklch(0.9886 0 0);
  --sidebar-foreground: oklch(0.2644 0 0);
  --sidebar-primary: oklch(0.3261 0 0);
  --sidebar-primary-foreground: oklch(0.9886 0 0);
  --sidebar-accent: oklch(0.9772 0 0);
  --sidebar-accent-foreground: oklch(0.3261 0 0);
  --sidebar-border: oklch(0.9404 0 0);
  --sidebar-ring: oklch(0.7716 0 0);
  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
  --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --shadow-x: 0;
  --shadow-y: 1px;
  --shadow-blur: 3px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.1;
  --shadow-color: hsl(0 0% 0%);
  --shadow-2xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-sm: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow-md: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10);
  --shadow-lg: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10);
  --shadow-xl: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10);
  --shadow-2xl: 0 1px 3px 0px hsl(0 0% 0% / 0.25);
  --tracking-normal: 0em;
  --spacing: 0.25rem;
}

.dark {
  --background: oklch(0.2070 0.0380 265.0691);
  --foreground: oklch(0.9851 0 0);
  --card: oklch(0.2070 0.0380 265.0691);
  --card-foreground: oklch(0.9851 0 0);
  --popover: oklch(0.2070 0.0380 265.0691);
  --popover-foreground: oklch(0.9851 0 0);
  --primary: oklch(0.8505 0.1655 87.8598);
  --primary-foreground: oklch(0.2070 0.0380 265.0691);
  --secondary: oklch(0.2755 0.0370 260.0225);
  --secondary-foreground: oklch(0.9851 0 0);
  --muted: oklch(0.2755 0.0370 260.0225);
  --muted-foreground: oklch(0.7107 0.0351 256.7878);
  --accent: oklch(0.7704 0.1646 70.6613);
  --accent-foreground: oklch(0.9851 0 0);
  --destructive: oklch(0.3997 0.1352 25.8101);
  --destructive-foreground: oklch(0.9851 0 0);
  --border: oklch(0.2755 0.0370 260.0225);
  --input: oklch(0.2755 0.0370 260.0225);
  --ring: oklch(0.8664 0.1493 90.0423);
  --chart-1: oklch(0.5292 0.1931 262.1292);
  --chart-2: oklch(0.6983 0.1337 165.4626);
  --chart-3: oklch(0.7232 0.1500 60.6307);
  --chart-4: oklch(0.6192 0.2037 312.7283);
  --chart-5: oklch(0.6123 0.2093 6.3856);
  --sidebar: oklch(0.2103 0.0059 285.8835);
  --sidebar-foreground: oklch(0.9676 0.0013 286.3752);
  --sidebar-primary: oklch(0.4878 0.2170 264.3876);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.2741 0.0055 286.0329);
  --sidebar-accent-foreground: oklch(0.9676 0.0013 286.3752);
  --sidebar-border: oklch(0.2741 0.0055 286.0329);
  --sidebar-ring: oklch(0.8709 0.0055 286.2853);
  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
  --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --shadow-x: 0;
  --shadow-y: 1px;
  --shadow-blur: 3px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.1;
  --shadow-color: hsl(0 0% 0%);
  --shadow-2xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-sm: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow-md: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10);
  --shadow-lg: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10);
  --shadow-xl: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10);
  --shadow-2xl: 0 1px 3px 0px hsl(0 0% 0% / 0.25);
}`,
  },
  {
    id: "violet-bloom",
    name: "Violet Bloom",
    description: "Dark, professional theme",
    previewColors: {
      primary: "oklch(0.5393 0.2713 286.7462)",
    },
    css: `:root {
  --background: oklch(0.9940 0 0);
  --foreground: oklch(0 0 0);
  --card: oklch(0.9940 0 0);
  --card-foreground: oklch(0 0 0);
  --popover: oklch(0.9911 0 0);
  --popover-foreground: oklch(0 0 0);
  --primary: oklch(0.5393 0.2713 286.7462);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.9540 0.0063 255.4755);
  --secondary-foreground: oklch(0.1344 0 0);
  --muted: oklch(0.9702 0 0);
  --muted-foreground: oklch(0.4386 0 0);
  --accent: oklch(0.9393 0.0288 266.3680);
  --accent-foreground: oklch(0.5445 0.1903 259.4848);
  --destructive: oklch(0.6290 0.1902 23.0704);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.9300 0.0094 286.2156);
  --input: oklch(0.9401 0 0);
  --ring: oklch(0 0 0);
  --chart-1: oklch(0.7459 0.1483 156.4499);
  --chart-2: oklch(0.5393 0.2713 286.7462);
  --chart-3: oklch(0.7336 0.1758 50.5517);
  --chart-4: oklch(0.5828 0.1809 259.7276);
  --chart-5: oklch(0.5590 0 0);
  --sidebar: oklch(0.9777 0.0051 247.8763);
  --sidebar-foreground: oklch(0 0 0);
  --sidebar-primary: oklch(0 0 0);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.9401 0 0);
  --sidebar-accent-foreground: oklch(0 0 0);
  --sidebar-border: oklch(0.9401 0 0);
  --sidebar-ring: oklch(0 0 0);
  --shadow-x: 0px;
  --shadow-y: 2px;
  --shadow-blur: 3px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.16;
  --shadow-color: hsl(0 0% 0%);
  --shadow-2xs: 0px 2px 3px 0px hsl(0 0% 0% / 0.08);
  --shadow-xs: 0px 2px 3px 0px hsl(0 0% 0% / 0.08);
  --shadow-sm: 0px 2px 3px 0px hsl(0 0% 0% / 0.16), 0px 1px 2px -1px hsl(0 0% 0% / 0.16);
  --shadow: 0px 2px 3px 0px hsl(0 0% 0% / 0.16), 0px 1px 2px -1px hsl(0 0% 0% / 0.16);
  --shadow-md: 0px 2px 3px 0px hsl(0 0% 0% / 0.16), 0px 2px 4px -1px hsl(0 0% 0% / 0.16);
  --shadow-lg: 0px 2px 3px 0px hsl(0 0% 0% / 0.16), 0px 4px 6px -1px hsl(0 0% 0% / 0.16);
  --shadow-xl: 0px 2px 3px 0px hsl(0 0% 0% / 0.16), 0px 8px 10px -1px hsl(0 0% 0% / 0.16);
  --shadow-2xl: 0px 2px 3px 0px hsl(0 0% 0% / 0.40);
  --tracking-normal: -0.025em;
  --spacing: 0.27rem;
}

.dark {
  --background: oklch(0.2223 0.0060 271.1393);
  --foreground: oklch(0.9551 0 0);
  --card: oklch(0.2568 0.0076 274.6528);
  --card-foreground: oklch(0.9551 0 0);
  --popover: oklch(0.2568 0.0076 274.6528);
  --popover-foreground: oklch(0.9551 0 0);
  --primary: oklch(0.6132 0.2294 291.7437);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.2940 0.0130 272.9312);
  --secondary-foreground: oklch(0.9551 0 0);
  --muted: oklch(0.2940 0.0130 272.9312);
  --muted-foreground: oklch(0.7058 0 0);
  --accent: oklch(0.2795 0.0368 260.0310);
  --accent-foreground: oklch(0.7857 0.1153 246.6596);
  --destructive: oklch(0.7106 0.1661 22.2162);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.3289 0.0092 268.3843);
  --input: oklch(0.3289 0.0092 268.3843);
  --ring: oklch(0.6132 0.2294 291.7437);
  --chart-1: oklch(0.8003 0.1821 151.7110);
  --chart-2: oklch(0.6132 0.2294 291.7437);
  --chart-3: oklch(0.8077 0.1035 19.5706);
  --chart-4: oklch(0.6691 0.1569 260.1063);
  --chart-5: oklch(0.7058 0 0);
  --sidebar: oklch(0.2011 0.0039 286.0396);
  --sidebar-foreground: oklch(0.9551 0 0);
  --sidebar-primary: oklch(0.6132 0.2294 291.7437);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.2940 0.0130 272.9312);
  --sidebar-accent-foreground: oklch(0.6132 0.2294 291.7437);
  --sidebar-border: oklch(0.3289 0.0092 268.3843);
  --sidebar-ring: oklch(0.6132 0.2294 291.7437);
  --shadow-x: 0px;
  --shadow-y: 2px;
  --shadow-blur: 3px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.16;
  --shadow-color: hsl(0 0% 0%);
  --shadow-2xs: 0px 2px 3px 0px hsl(0 0% 0% / 0.08);
  --shadow-xs: 0px 2px 3px 0px hsl(0 0% 0% / 0.08);
  --shadow-sm: 0px 2px 3px 0px hsl(0 0% 0% / 0.16), 0px 1px 2px -1px hsl(0 0% 0% / 0.16);
  --shadow: 0px 2px 3px 0px hsl(0 0% 0% / 0.16), 0px 1px 2px -1px hsl(0 0% 0% / 0.16);
  --shadow-md: 0px 2px 3px 0px hsl(0 0% 0% / 0.16), 0px 2px 4px -1px hsl(0 0% 0% / 0.16);
  --shadow-lg: 0px 2px 3px 0px hsl(0 0% 0% / 0.16), 0px 4px 6px -1px hsl(0 0% 0% / 0.16);
  --shadow-xl: 0px 2px 3px 0px hsl(0 0% 0% / 0.16), 0px 8px 10px -1px hsl(0 0% 0% / 0.16);
  --shadow-2xl: 0px 2px 3px 0px hsl(0 0% 0% / 0.40);
}`,
  },
  {
    id: "claude",
    name: "Claude",
    description: "Inspired bly Claude",
    previewColors: {
      primary: "oklch(0.6171 0.1375 39.0427)",
    },
    css: `:root {
  --background: oklch(0.9818 0.0054 95.0986);
  --foreground: oklch(0.3438 0.0269 95.7226);
  --card: oklch(0.9818 0.0054 95.0986);
  --card-foreground: oklch(0.1908 0.0020 106.5859);
  --popover: oklch(1.0000 0 0);
  --popover-foreground: oklch(0.2671 0.0196 98.9390);
  --primary: oklch(0.6171 0.1375 39.0427);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.9245 0.0138 92.9892);
  --secondary-foreground: oklch(0.4334 0.0177 98.6048);
  --muted: oklch(0.9341 0.0153 90.2390);
  --muted-foreground: oklch(0.6059 0.0075 97.4233);
  --accent: oklch(0.9245 0.0138 92.9892);
  --accent-foreground: oklch(0.2671 0.0196 98.9390);
  --destructive: oklch(0.1908 0.0020 106.5859);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.8847 0.0069 97.3627);
  --input: oklch(0.7621 0.0156 98.3528);
  --ring: oklch(0.6171 0.1375 39.0427);
  --chart-1: oklch(0.5583 0.1276 42.9956);
  --chart-2: oklch(0.6898 0.1581 290.4107);
  --chart-3: oklch(0.8816 0.0276 93.1280);
  --chart-4: oklch(0.8822 0.0403 298.1792);
  --chart-5: oklch(0.5608 0.1348 42.0584);
  --sidebar: oklch(0.9663 0.0080 98.8792);
  --sidebar-foreground: oklch(0.3590 0.0051 106.6524);
  --sidebar-primary: oklch(0.6171 0.1375 39.0427);
  --sidebar-primary-foreground: oklch(0.9881 0 0);
  --sidebar-accent: oklch(0.9245 0.0138 92.9892);
  --sidebar-accent-foreground: oklch(0.3250 0 0);
  --sidebar-border: oklch(0.9401 0 0);
  --sidebar-ring: oklch(0.7731 0 0);
  --shadow-x: 0;
  --shadow-y: 1px;
  --shadow-blur: 3px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.1;
  --shadow-color: oklch(0 0 0);
  --shadow-2xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-sm: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow-md: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10);
  --shadow-lg: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10);
  --shadow-xl: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10);
  --shadow-2xl: 0 1px 3px 0px hsl(0 0% 0% / 0.25);
  --tracking-normal: 0em;
  --spacing: 0.25rem;
}

.dark {
  --background: oklch(0.2679 0.0036 106.6427);
  --foreground: oklch(0.8074 0.0142 93.0137);
  --card: oklch(0.2679 0.0036 106.6427);
  --card-foreground: oklch(0.9818 0.0054 95.0986);
  --popover: oklch(0.3085 0.0035 106.6039);
  --popover-foreground: oklch(0.9211 0.0040 106.4781);
  --primary: oklch(0.6724 0.1308 38.7559);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.9818 0.0054 95.0986);
  --secondary-foreground: oklch(0.3085 0.0035 106.6039);
  --muted: oklch(0.2213 0.0038 106.7070);
  --muted-foreground: oklch(0.7713 0.0169 99.0657);
  --accent: oklch(0.2130 0.0078 95.4245);
  --accent-foreground: oklch(0.9663 0.0080 98.8792);
  --destructive: oklch(0.6368 0.2078 25.3313);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.3618 0.0101 106.8928);
  --input: oklch(0.4336 0.0113 100.2195);
  --ring: oklch(0.6724 0.1308 38.7559);
  --chart-1: oklch(0.5583 0.1276 42.9956);
  --chart-2: oklch(0.6898 0.1581 290.4107);
  --chart-3: oklch(0.2130 0.0078 95.4245);
  --chart-4: oklch(0.3074 0.0516 289.3230);
  --chart-5: oklch(0.5608 0.1348 42.0584);
  --sidebar: oklch(0.2357 0.0024 67.7077);
  --sidebar-foreground: oklch(0.8074 0.0142 93.0137);
  --sidebar-primary: oklch(0.3250 0 0);
  --sidebar-primary-foreground: oklch(0.9881 0 0);
  --sidebar-accent: oklch(0.1680 0.0020 106.6177);
  --sidebar-accent-foreground: oklch(0.8074 0.0142 93.0137);
  --sidebar-border: oklch(0.9401 0 0);
  --sidebar-ring: oklch(0.7731 0 0);
  --shadow-x: 0;
  --shadow-y: 1px;
  --shadow-blur: 3px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.1;
  --shadow-color: oklch(0 0 0);
  --shadow-2xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-sm: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow-md: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10);
  --shadow-lg: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10);
  --shadow-xl: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10);
  --shadow-2xl: 0 1px 3px 0px hsl(0 0% 0% / 0.25);
}`,
  },
];
