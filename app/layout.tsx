import type { Metadata, Viewport } from "next";
import { Literata, Sora } from "next/font/google";
import { Suspense } from "react";
import { GlobalScrollTop } from "@/components/GlobalScrollTop";
import { SiteFooter } from "@/components/SiteFooter";
import { AppBootSplash } from "@/components/AppBootSplash";
import { GlobalThemeProvider } from "@/components/GlobalThemeProvider";
import { PwaRuntime } from "@/components/PwaRuntime";
import { ReaderRealtimeProvider } from "@/components/ReaderRealtimeProvider";
import { ReaderRealtimeFxBootstrap } from "@/components/ReaderRealtimeFxBootstrap";
import { RealtimeShimmerLegend } from "@/components/RealtimeShimmerLegend";
import { RealtimeToastHost } from "@/components/RealtimeToastHost";
import { QueryProvider } from "@/components/QueryProvider";
import { StoreProvider } from "@/components/StoreProvider";
import { XianxiaWorldBackgroundClient } from "@/components/XianxiaWorldBackgroundClient";
import { AppAuraLayer } from "@/components/AppAuraLayer";
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_OG_DESCRIPTION,
} from "@/lib/brand";
import "./globals.css";

export const dynamic = "force-dynamic";

const literata = Literata({
  axes: ["opsz"],
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-literata",
  display: "swap"
});

const sora = Sora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sora",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [...SITE_KEYWORDS],
  authors: [{ name: SITE_NAME, url: "/" }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "entertainment",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", sizes: "64x64", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_OG_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_OG_DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e2419" },
    { media: "(prefers-color-scheme: light)", color: "#1e3e30" }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${literata.variable} ${sora.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var raw=localStorage.getItem("persist:story-reader");var theme="light";if(raw){var p=JSON.parse(raw);var g=p&&p.globalTheme;if(typeof g==="string"){try{g=JSON.parse(g);}catch(e){}}if(g==="dark"||g==="light")theme=g;}if(theme!=="dark"&&theme!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches)theme="dark";var h=document.documentElement;h.setAttribute("data-xi-theme",theme);h.style.colorScheme=theme;var hour=(new Date()).getHours();var tod=hour>=5&&hour<9?"dawn":hour>=9&&hour<16?"day":hour>=16&&hour<19?"dusk":"night";h.setAttribute("data-xi-time",tod);var perf=localStorage.getItem("reader:performance-mode");h.setAttribute("data-xi-perf",perf==="battery_saver"?"saver":perf==="full_effects"?"full":"balanced");h.setAttribute("data-xi-compact",window.matchMedia("(max-width:839px)").matches?"1":"0");}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <StoreProvider>
          <GlobalThemeProvider />
          <AppBootSplash />
          <QueryProvider>
            <ReaderRealtimeProvider>
              <ReaderRealtimeFxBootstrap />
              <RealtimeToastHost />
              <RealtimeShimmerLegend />
              <Suspense fallback={null}>
                <XianxiaWorldBackgroundClient />
              </Suspense>
              <Suspense fallback={null}>
                <AppAuraLayer />
              </Suspense>
              <PwaRuntime />
              {children}
              <SiteFooter />
              <GlobalScrollTop />
            </ReaderRealtimeProvider>
          </QueryProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
