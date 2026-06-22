import type { Metadata, Viewport } from "next";
import { Literata, Merriweather, Noto_Serif, Sora } from "next/font/google";
import { Suspense } from "react";
import { GlobalScrollTop } from "@/components/GlobalScrollTop";
import { AppBootSplash } from "@/components/AppBootSplash";
import { GlobalThemeProvider } from "@/components/GlobalThemeProvider";
import { PwaRuntime } from "@/components/PwaRuntime";
import { QueryProvider } from "@/components/QueryProvider";
import { StoreProvider } from "@/components/StoreProvider";
import { XianxiaWorldBackgroundClient } from "@/components/XianxiaWorldBackgroundClient";
import "./globals.css";

export const dynamic = "force-dynamic";

const literata = Literata({
  axes: ["opsz"],
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-literata",
  display: "swap"
});

const merriweather = Merriweather({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-merriweather",
  display: "swap"
});

const notoSerif = Noto_Serif({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-noto-serif",
  display: "swap"
});

const sora = Sora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sora",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Linh Quyển Các",
  description: "Đọc truyện chữ, tích lũy tu vi và theo dõi hành trình tàng thư.",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Linh Quyển Các",
    title: "Linh Quyển Các",
    description: "Tu tiên từng chương — đọc truyện tiên hiệp, theo dõi chương mới và tích lũy tu vi.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Linh Quyển Các",
    description: "Tu tiên từng chương — đọc truyện tiên hiệp, theo dõi chương mới và tích lũy tu vi.",
  },
  appleWebApp: {
    capable: true,
    title: "Linh Quyển Các",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e2419" },
    { media: "(prefers-color-scheme: light)", color: "#1e3e30" }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${literata.variable} ${merriweather.variable} ${notoSerif.variable} ${sora.variable}`}>
      <body>
        <StoreProvider>
          <GlobalThemeProvider />
          <AppBootSplash />
          <QueryProvider>
            <Suspense fallback={null}>
              <XianxiaWorldBackgroundClient />
            </Suspense>
            <PwaRuntime />
            {children}
            <GlobalScrollTop />
          </QueryProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
