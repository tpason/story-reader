import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { GlobalScrollTop } from "@/components/GlobalScrollTop";
import { PwaRuntime } from "@/components/PwaRuntime";
import { QueryProvider } from "@/components/QueryProvider";
import { StoreProvider } from "@/components/StoreProvider";
import { XianxiaWorldBackgroundClient } from "@/components/XianxiaWorldBackgroundClient";
import "./globals.css";

export const metadata: Metadata = {
  title: "Linh Quyển Các",
  description: "Đọc truyện chữ, tích lũy tu vi và theo dõi hành trình tàng thư.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Linh Quyển Các",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,500;7..72,600;7..72,700&family=Merriweather:wght@400;700&family=Noto+Serif:wght@400;500;600;700&family=Sora:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <StoreProvider>
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
