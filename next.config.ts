import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Playwright / LAN dev hits 127.0.0.1 while Next binds 0.0.0.0 — silence cross-origin dev warnings.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    cpus: 1
  },
  images: {
    // Dev image optimizer LRUCache can crash node under heavy homepage loads (Playwright E2E).
    unoptimized: process.env.NODE_ENV !== "production",
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" }
    ]
  }
};

export default withBundleAnalyzer(nextConfig);
