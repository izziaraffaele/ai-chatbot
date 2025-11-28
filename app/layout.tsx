import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/lib/i18n/context";

import "./globals.css";
import { cookies } from "next/headers";
import { SessionProvider } from "next-auth/react";
import { BrandingProvider } from "@/components/branding-provider";
import { CanvasInit } from "@/components/canvas-init";
import { DemoConfig } from "@/components/demo-config";
import { getBrandingInjectScript } from "@/lib/branding/inject-script";
import type { Locale } from "@/lib/i18n/types";
import { isSupportedLocale, loadTranslations } from "@/lib/i18n/utils";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://chat.vercel.ai"
  ),
  title:
    process.env.NEXT_PUBLIC_METADATA_TITLE ||
    process.env.NEXT_PUBLIC_APP_NAME ||
    "Comune Faenza",
  description:
    process.env.NEXT_PUBLIC_METADATA_DESCRIPTION ||
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
    "Assistente virtuale del Comune di Faenza",
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

const LIGHT_THEME_COLOR = "hsl(0 0% 100%)";
const DARK_THEME_COLOR = "hsl(240deg 10% 3.92%)";
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await cookies().then((v) => v.get("locale")?.value || "en");

  const translations = isSupportedLocale(locale)
    ? await loadTranslations(locale)
    : undefined;

  return (
    <html
      className={`${geist.variable} ${geistMono.variable}`}
      // `next-themes` injects an extra classname to the body element to avoid
      // visual flicker before hydration. Hence the `suppressHydrationWarning`
      // prop is necessary to avoid the React hydration mismatch warning.
      // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
      lang={locale}
      suppressHydrationWarning
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required for flicker prevention"
          dangerouslySetInnerHTML={{
            __html: getBrandingInjectScript(),
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <LanguageProvider
            initialLocale={locale as Locale}
            initialTranslations={translations}
          >
            <BrandingProvider>
              <Toaster position="top-center" />
              <SessionProvider>
                <CanvasInit />
                {children}
                {/* <BrandConfig /> */}
                <DemoConfig />
              </SessionProvider>
            </BrandingProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
