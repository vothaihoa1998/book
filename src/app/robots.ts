import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/bookmarks",
        "/api/follows",
        "/api/preferences",
        "/api/progress",
        "/auth/callback",
        "/library",
        "/login",
        "/profile",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
