import "server-only";

import { type Manga } from "../types";
import { fetchJson, unique } from "./http";
import { getMangaDex } from "./mangadex";

const API = process.env.FIRECRAWL_API_URL || "https://api.firecrawl.dev/v2/search";

type FirecrawlSearchResponse = {
  success?: boolean;
  data?: {
    web?: Array<{
      title?: string;
      description?: string;
      url?: string;
    }>;
  };
};

function extractMangaDexId(url: string | undefined) {
  if (!url) return null;
  const match = url.match(/mangadex\.org\/title\/([0-9a-f-]{36})/i);
  return match?.[1] ?? null;
}

export async function searchFirecrawlManga(query: string, limit = 6): Promise<Manga[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return [];

  const response = await fetchJson<FirecrawlSearchResponse>(API, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: `${query} manga site:mangadex.org/title`,
      limit,
      sources: ["web"],
      timeout: 8000,
      ignoreInvalidURLs: true,
    }),
    timeoutMs: 8000,
    next: { revalidate: 60 * 60 },
  });

  const mangaDexIds = unique((response.data?.web ?? []).map((item) => extractMangaDexId(item.url))).slice(0, limit);
  const manga = await Promise.all(mangaDexIds.map((id) => getMangaDex(id).catch(() => null)));
  return manga.filter(Boolean) as Manga[];
}
