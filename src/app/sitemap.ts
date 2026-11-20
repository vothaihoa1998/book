import type { MetadataRoute } from "next";
import { getHome } from "@/lib/sources";
import { absoluteUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const home = await getHome();
  const manga = [...home.trending, ...home.recent]
    .filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index)
    .slice(0, 5000);

  return [
    { url: absoluteUrl("/"), lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
    { url: absoluteUrl("/discover"), lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
    { url: absoluteUrl("/about"), lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    ...manga.map((item) => ({
      url: absoluteUrl(`/manga/${encodeURIComponent(item.id)}`),
      lastModified: new Date(item.updatedAt),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
