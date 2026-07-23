import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/account",
        "/following",
        "/reading-history",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
