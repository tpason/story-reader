import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Playwright / LAN dev hits 127.0.0.1 or 192.168.x.x while Next binds 0.0.0.0.
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.1.9"],
  experimental: {
    cpus: 1
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      }
    ];
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

// ponytail: analyzer is a devDependency — only require when ANALYZE=true so
// production images can use `npm ci --omit=dev`.
function withOptionalAnalyzer(config: NextConfig): NextConfig {
  if (process.env.ANALYZE !== "true") return config;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const withBundleAnalyzer = require("@next/bundle-analyzer")({ enabled: true });
  return withBundleAnalyzer(config);
}

export default withOptionalAnalyzer(nextConfig);
