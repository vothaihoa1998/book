import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InkRail",
    short_name: "InkRail",
    description: "Web đọc truyện tranh editorial-minimal với Next.js và Supabase.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FAF8F4",
    theme_color: "#121212",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
