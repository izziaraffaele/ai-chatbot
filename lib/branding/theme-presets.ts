/**
 * Theme presets - must be kept in sync with components/demo-config/index.tsx
 * Duplicated here to avoid client-side imports in server component
 */
export const THEME_PRESETS = [
  {
    id: 'playful',
    name: 'Playful',
    description: 'Vibrant, friendly theme',
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
    id: 'tech',
    name: 'Tech',
    description: 'Dark, professional theme',
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
    id: 'yellow',
    name: 'Yellow',
    description: 'Vibrant, friendly theme',
    previewColors: {
      primary: 'oklch(0.852 0.199 91.936)',
    },
    css: `:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.852 0.199 91.936);
  --primary-foreground: oklch(0.421 0.095 57.708);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(1 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.852 0.199 91.936);
  --chart-1: oklch(0.905 0.182 98.111);
  --chart-2: oklch(0.795 0.184 86.047);
  --chart-3: oklch(0.681 0.162 75.834);
  --chart-4: oklch(0.554 0.135 66.442);
  --chart-5: oklch(0.476 0.114 61.907);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.681 0.162 75.834);
  --sidebar-primary-foreground: oklch(0.987 0.026 102.212);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.852 0.199 91.936);
  --header: oklch(1 0 0);
  --header-foreground: oklch(0.145 0 0);
  --footer: oklch(1 0 0);
  --footer-foreground: oklch(0.145 0 0);
  --code: oklch(1 0 0);
  --code-foreground: oklch(0.708 0 0);
  --code-highlight: oklch(0.27 0 0);
  --code-number: oklch(0.72 0 0);
  --code-selection: oklch(0.922 0 0);
  --code-border: oklch(0.922 0 0);
  --radius: 0.5rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.269 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.795 0.184 86.047);
  --primary-foreground: oklch(0.421 0.095 57.708);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.371 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.421 0.095 57.708);
  --chart-1: oklch(0.905 0.182 98.111);
  --chart-2: oklch(0.795 0.184 86.047);
  --chart-3: oklch(0.681 0.162 75.834);
  --chart-4: oklch(0.554 0.135 66.442);
  --chart-5: oklch(0.476 0.114 61.907);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.795 0.184 86.047);
  --sidebar-primary-foreground: oklch(0.987 0.026 102.212);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.421 0.095 57.708);
  --header: oklch(0.145 0 0);
  --header-foreground: oklch(0.985 0 0);
  --footer: oklch(0.145 0 0);
  --footer-foreground: oklch(0.985 0 0);
  --code: oklch(0.2 0 0);
  --code-foreground: oklch(0.708 0 0);
  --code-highlight: oklch(0.27 0 0);
  --code-number: oklch(0.72 0 0);
  --code-selection: oklch(0.922 0 0);
  --code-border: oklch(1 0 0 / 10%);
  --radius: 0.5rem;
}`,
  },
  {
    id: 'violet-bloom',
    name: 'Violet Bloom',
    description: 'Dark, professional theme',
    previewColors: {
      primary: 'oklch(0.5393 0.2713 286.7462)',
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
  --sidebar: oklch(0.97 0.0100 286.7462);
  --sidebar-foreground: oklch(0 0 0);
  --sidebar-primary: oklch(0.5393 0.2713 286.7462);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.8500 0.1000 286.7462);
  --sidebar-accent-foreground: oklch(0.5393 0.2713 286.7462);
  --sidebar-border: oklch(0.9200 0.0500 286.7462);
  --sidebar-ring: oklch(0.5393 0.2713 286.7462);
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
  --sidebar: oklch(0.2200 0.0150 286.7462);
  --sidebar-foreground: oklch(0.9551 0 0);
  --sidebar-primary: oklch(0.6132 0.2294 291.7437);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.3500 0.1200 286.7462);
  --sidebar-accent-foreground: oklch(0.8500 0.1000 286.7462);
  --sidebar-border: oklch(0.3200 0.0600 286.7462);
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
    id: 'nature',
    name: 'Nature',
    description: 'Harmony and connection',
    previewColors: {
      primary: 'oklch(0.5234 0.1347 144.1672)',
    },
    css: `:root {
  --background: oklch(0.9711 0.0074 80.7211);
  --foreground: oklch(0.3000 0.0358 30.2042);
  --card: oklch(0.9711 0.0074 80.7211);
  --card-foreground: oklch(0.3000 0.0358 30.2042);
  --popover: oklch(0.9711 0.0074 80.7211);
  --popover-foreground: oklch(0.3000 0.0358 30.2042);
  --primary: oklch(0.5234 0.1347 144.1672);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.9571 0.0210 147.6360);
  --secondary-foreground: oklch(0.4254 0.1159 144.3078);
  --muted: oklch(0.9370 0.0142 74.4218);
  --muted-foreground: oklch(0.4495 0.0486 39.2110);
  --accent: oklch(0.8952 0.0504 146.0366);
  --accent-foreground: oklch(0.4254 0.1159 144.3078);
  --destructive: oklch(0.5386 0.1937 26.7249);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.8805 0.0208 74.6428);
  --input: oklch(0.8805 0.0208 74.6428);
  --ring: oklch(0.5234 0.1347 144.1672);
  --chart-1: oklch(0.6731 0.1624 144.2083);
  --chart-2: oklch(0.5752 0.1446 144.1813);
  --chart-3: oklch(0.5234 0.1347 144.1672);
  --chart-4: oklch(0.4254 0.1159 144.3078);
  --chart-5: oklch(0.2157 0.0453 145.7256);
  --sidebar: oklch(0.9370 0.0142 74.4218);
  --sidebar-foreground: oklch(0.3000 0.0358 30.2042);
  --sidebar-primary: oklch(0.5234 0.1347 144.1672);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.8952 0.0504 146.0366);
  --sidebar-accent-foreground: oklch(0.4254 0.1159 144.3078);
  --sidebar-border: oklch(0.8805 0.0208 74.6428);
  --sidebar-ring: oklch(0.5234 0.1347 144.1672);
  --radius: 0.5rem;
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
}

.dark {
  --background: oklch(0.2683 0.0279 150.7681);
  --foreground: oklch(0.9423 0.0097 72.6595);
  --card: oklch(0.3327 0.0271 146.9867);
  --card-foreground: oklch(0.9423 0.0097 72.6595);
  --popover: oklch(0.3327 0.0271 146.9867);
  --popover-foreground: oklch(0.9423 0.0097 72.6595);
  --primary: oklch(0.6731 0.1624 144.2083);
  --primary-foreground: oklch(0.2157 0.0453 145.7256);
  --secondary: oklch(0.3942 0.0265 142.9926);
  --secondary-foreground: oklch(0.8970 0.0166 142.5518);
  --muted: oklch(0.2926 0.0212 147.7496);
  --muted-foreground: oklch(0.8579 0.0174 76.0955);
  --accent: oklch(0.5752 0.1446 144.1813);
  --accent-foreground: oklch(0.9423 0.0097 72.6595);
  --destructive: oklch(0.5386 0.1937 26.7249);
  --destructive-foreground: oklch(0.9423 0.0097 72.6595);
  --border: oklch(0.3942 0.0265 142.9926);
  --input: oklch(0.3942 0.0265 142.9926);
  --ring: oklch(0.6731 0.1624 144.2083);
  --chart-1: oklch(0.7660 0.1179 145.2950);
  --chart-2: oklch(0.7185 0.1417 144.8887);
  --chart-3: oklch(0.6731 0.1624 144.2083);
  --chart-4: oklch(0.6291 0.1543 144.2031);
  --chart-5: oklch(0.5752 0.1446 144.1813);
  --sidebar: oklch(0.2683 0.0279 150.7681);
  --sidebar-foreground: oklch(0.9423 0.0097 72.6595);
  --sidebar-primary: oklch(0.6731 0.1624 144.2083);
  --sidebar-primary-foreground: oklch(0.2157 0.0453 145.7256);
  --sidebar-accent: oklch(0.5752 0.1446 144.1813);
  --sidebar-accent-foreground: oklch(0.9423 0.0097 72.6595);
  --sidebar-border: oklch(0.3942 0.0265 142.9926);
  --sidebar-ring: oklch(0.6731 0.1624 144.2083);
  --radius: 0.5rem;
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
  {
    id: 'claude',
    name: 'Claude',
    description: 'Inspired bly Claude',
    previewColors: {
      primary: 'oklch(0.6171 0.1375 39.0427)',
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
  --sidebar: oklch(0.97 0.0080 39.0427);
  --sidebar-foreground: oklch(0.3590 0.0051 106.6524);
  --sidebar-primary: oklch(0.6171 0.1375 39.0427);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.8500 0.0800 39.0427);
  --sidebar-accent-foreground: oklch(0.6171 0.1375 39.0427);
  --sidebar-border: oklch(0.9200 0.0400 39.0427);
  --sidebar-ring: oklch(0.6171 0.1375 39.0427);
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
  --sidebar: oklch(0.2357 0.0100 39.0427);
  --sidebar-foreground: oklch(0.8074 0.0142 93.0137);
  --sidebar-primary: oklch(0.6724 0.1308 38.7559);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.3500 0.0800 39.0427);
  --sidebar-accent-foreground: oklch(0.8500 0.0800 39.0427);
  --sidebar-border: oklch(0.3200 0.0400 39.0427);
  --sidebar-ring: oklch(0.6724 0.1308 38.7559);
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
