import "server-only";

import { cache } from "react";
import { getSampleChapter, getSampleChapters, getSampleManga, sampleManga } from "../sample-data";
import { readCache, writeCache } from "../supabase/cache";
import { type Json } from "../supabase/types";
import { type Chapter, type HomePayload, type Manga, type MangaSearchParams, parseScopedId } from "../types";
import { searchFirecrawlManga } from "./firecrawl";
import {
  getMangaDex,
  getMangaDexChapter,
  getMangaDexChapters,
  getPopularMangaDex,
  getRecentMangaDex,
  searchMangaDex,
} from "./mangadex";
import { getOTruyenChapter, getOTruyenChapters, getOTruyenManga, getRecentOTruyen, searchOTruyen } from "./otruyen";

function dedupeManga(items: Manga[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.title.toLowerCase()}-${item.sourceId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function withFallback<T>(promise: Promise<T>, fallback: T) {
  return promise.catch(() => fallback);
}

async function cachedValue<T>(
  table: "manga_cache" | "chapter_cache",
  cacheKey: string,
  source: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
) {
  const cached = await readCache<T>(table, cacheKey);
  if (cached) return cached;

  const value = await loader();
  await writeCache(table, cacheKey, source, value as Json, ttlSeconds);
  return value;
}

async function cachedMaybe<T>(
  table: "manga_cache" | "chapter_cache",
  cacheKey: string,
  source: string,
  ttlSeconds: number,
  loader: () => Promise<T | null>,
) {
  const cached = await readCache<T>(table, cacheKey);
  if (cached) return cached;

  const value = await loader();
  if (value) await writeCache(table, cacheKey, source, value as Json, ttlSeconds);
  return value;
}

async function cachedList<T>(
  table: "manga_cache" | "chapter_cache",
  cacheKey: string,
  source: string,
  ttlSeconds: number,
  loader: () => Promise<T[]>,
) {
  const cached = await readCache<T[]>(table, cacheKey);
  if (cached) return cached;

  const value = await loader();
  if (value.length) await writeCache(table, cacheKey, source, value as Json, ttlSeconds);
  return value;
}

export const getHome = cache(async (): Promise<HomePayload> => {
  return cachedValue("manga_cache", "home:v1", "mixed", 60 * 30, async () => {
  const [popular, recent, oRecent] = await Promise.all([
    withFallback(getPopularMangaDex(12), sampleManga),
    withFallback(getRecentMangaDex(12), sampleManga.slice().reverse()),
    withFallback(getRecentOTruyen(8), []),
  ]);

  const trending = dedupeManga([...popular, ...sampleManga]).slice(0, 12);
  const recentMerged = dedupeManga([...recent, ...oRecent, ...sampleManga]).slice(0, 12);
  const recommended = dedupeManga([
    ...trending.filter((item) => item.genres.some((genre) => /fantasy|action|romance/i.test(genre))),
    ...sampleManga,
  ]).slice(0, 10);

  return {
    featured: trending[0] ?? sampleManga[0],
    trending,
    recent: recentMerged,
    recommended,
  };
  });
});

export const searchManga = cache(async (params: MangaSearchParams = {}) => {
  const query = params.q?.trim();
  const page = params.page ?? 1;

  if (!query) {
    const home = await getHome();
    return home.trending;
  }

  return cachedValue(
    "manga_cache",
    `search:${query.toLowerCase()}:${params.status ?? "all"}:${page}`,
    "mixed",
    60 * 10,
    async () => {
  const [mangadex, otruyen] = await Promise.all([
    withFallback(searchMangaDex(query, page), []),
    withFallback(searchOTruyen(query), []),
  ]);

  let result = dedupeManga([...mangadex, ...otruyen]);
  if (!result.length) {
    result = await withFallback(searchFirecrawlManga(query), []);
  }
  if (params.status && params.status !== "all") {
    result = result.filter((item) => item.status === params.status);
  }
  if (!result.length) {
    result = sampleManga.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
  }
  return result.length ? result : sampleManga;
    },
  );
});

export const getManga = cache(async (id: string) => {
  const parsed = parseScopedId(id);
  let manga: Manga | null = null;

  if (parsed.source === "mangadex") {
    manga = await cachedMaybe("manga_cache", `manga:mangadex:${parsed.sourceId}`, "mangadex", 60 * 60 * 24, () =>
      withFallback(getMangaDex(parsed.sourceId), null),
    );
  }
  if (parsed.source === "otruyen") {
    manga = await cachedMaybe("manga_cache", `manga:otruyen:${parsed.sourceId}`, "otruyen", 60 * 60 * 24, () =>
      withFallback(getOTruyenManga(parsed.sourceId), null),
    );
  }

  return manga ?? getSampleManga(id);
});

export const getChapters = cache(async (mangaId: string) => {
  const parsed = parseScopedId(mangaId);
  let chapters: Chapter[] = [];

  if (parsed.source === "mangadex") {
    chapters = await cachedList("chapter_cache", `chapters:mangadex:${parsed.sourceId}`, "mangadex", 60 * 60, () =>
      withFallback(getMangaDexChapters(parsed.sourceId), []),
    );
  }
  if (parsed.source === "otruyen") {
    chapters = await cachedList("chapter_cache", `chapters:otruyen:${parsed.sourceId}`, "otruyen", 60 * 60, () =>
      withFallback(getOTruyenChapters(parsed.sourceId), []),
    );
  }

  return chapters.length ? chapters : getSampleChapters(mangaId);
});

export const getChapter = cache(async (chapterId: string) => {
  const parsed = parseScopedId(chapterId);
  let chapter: Chapter | null = null;

  if (parsed.source === "mangadex") {
    chapter = await cachedMaybe("chapter_cache", `chapter:mangadex:${parsed.sourceId}`, "mangadex", 60 * 60 * 24 * 30, () =>
      withFallback(getMangaDexChapter(parsed.sourceId), null),
    );
  }
  if (parsed.source === "otruyen") {
    chapter = await cachedMaybe("chapter_cache", `chapter:otruyen:${parsed.sourceId}`, "otruyen", 60 * 60 * 24 * 30, () =>
      withFallback(getOTruyenChapter(parsed.sourceId), null),
    );
  }

  return chapter ?? getSampleChapter(chapterId);
});
