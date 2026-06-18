import "server-only";

import { cache } from "react";
import { getSampleChapter, getSampleChapters, getSampleManga, sampleManga } from "../sample-data";
import { logSourceFetch, readCache, readCacheWithStatus, writeCache, writeCacheWithStatus } from "../supabase/cache";
import { type Json } from "../supabase/types";
import { type Chapter, type HomePayload, type Manga, type MangaSearchParams, type MangaSearchResult, parseScopedId } from "../types";
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
import { applySearchFilters, dedupeManga, normalizeSearchParams, searchCacheKey, selectedSearchSources, sourceLimitations, uniqueSources } from "./search-utils";

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
      withFallback(getPopularMangaDex(24), sampleManga),
      withFallback(getRecentMangaDex(24), sampleManga.slice().reverse()),
      withFallback(getRecentOTruyen(18), []),
    ]);

    const trending = dedupeManga([...popular, ...sampleManga]).slice(0, 24);
    const recentMerged = dedupeManga([...recent, ...oRecent, ...sampleManga]).slice(0, 30);
    const recommended = dedupeManga([
      ...trending.filter((item) => item.genres.some((genre) => /fantasy|action|romance/i.test(genre))),
      ...sampleManga,
    ]).slice(0, 18);

    return {
      featured: trending[0] ?? sampleManga[0],
      trending,
      recent: recentMerged,
      recommended,
    };
  });
});

async function runSearchSource(source: "mangadex" | "otruyen" | "firecrawl", target: string, loader: () => Promise<Manga[]>) {
  const startedAt = Date.now();
  try {
    const results = await loader();
    await logSourceFetch(source, target, true, Date.now() - startedAt).catch(() => undefined);
    return { source, results, error: null as string | null };
  } catch (error) {
    await logSourceFetch(source, target, false, Date.now() - startedAt).catch(() => undefined);
    return { source, results: [], error: error instanceof Error ? error.message : `Không gọi được nguồn ${source}` };
  }
}

export const searchMangaWithMeta = cache(async (params: MangaSearchParams = {}): Promise<MangaSearchResult> => {
  const normalized = normalizeSearchParams(params);
  const cacheKey = searchCacheKey(normalized);
  const cached = await readCacheWithStatus<MangaSearchResult>("manga_cache", cacheKey);
  const cacheErrors: string[] = [];
  if (cached.error) cacheErrors.push(`Cache: ${cached.error}`);
  if (cached.value) return cached.value;

  if (!normalized.q) {
    const selectedSources = selectedSearchSources(normalized.source);
    const sourceResults = await Promise.all(
      selectedSources.map((source) => {
        if (source === "mangadex") {
          return runSearchSource("mangadex", "catalog", () => searchMangaDex("", { ...normalized, limit: 36 }));
        }

        return runSearchSource("otruyen", "catalog", () => getRecentOTruyen(36));
      }),
    );
    const errors = [
      ...cacheErrors,
      ...sourceResults.flatMap((result) => result.error ? [`${result.source}: ${result.error}`] : []),
    ];
    const results = applySearchFilters(dedupeManga(sourceResults.flatMap((result) => result.results)), normalized);
    const payload: MangaSearchResult = {
      results,
      meta: {
        query: normalized.q,
        source: normalized.source,
        filters: normalized,
        sourceUsed: uniqueSources(results),
        fallbackUsed: false,
        page: normalized.page,
        hasMore: sourceResults.some((result) => result.results.length >= 36),
        errors,
        sourceLimitations: sourceLimitations(normalized, selectedSources),
      },
    };

    const cacheError = await writeCacheWithStatus("manga_cache", cacheKey, normalized.source, payload as unknown as Json, 60 * 10);
    if (cacheError) payload.meta.errors.push(`Cache: ${cacheError}`);

    return payload;
  }

  const errors: string[] = [...cacheErrors];

  const target = `search:${normalized.q}`;
  const selectedSources = selectedSearchSources(normalized.source);
  const sourceResults = await Promise.all(
    selectedSources.map((source) => {
      if (source === "mangadex") {
        return runSearchSource("mangadex", target, () => searchMangaDex(normalized.q, normalized));
      }

      return runSearchSource("otruyen", target, () => searchOTruyen(normalized.q, normalized));
    }),
  );

  sourceResults.forEach((result) => {
    if (result.error) errors.push(`${result.source}: ${result.error}`);
  });

  let fallbackUsed = false;
  let results = applySearchFilters(dedupeManga(sourceResults.flatMap((result) => result.results)), normalized);
  const sourceUsed = sourceResults.filter((result) => !result.error).map((result) => result.source);

  if (!results.length && normalized.source !== "otruyen") {
    const fallback = await runSearchSource("firecrawl", target, () => searchFirecrawlManga(normalized.q));
    if (fallback.error) errors.push(`firecrawl: ${fallback.error}`);
    if (fallback.results.length) {
      fallbackUsed = true;
      sourceUsed.push("firecrawl");
      results = applySearchFilters(dedupeManga(fallback.results), normalized);
    }
  }

  const payload: MangaSearchResult = {
    results,
    meta: {
      query: normalized.q,
      source: normalized.source,
      filters: normalized,
      sourceUsed,
      fallbackUsed,
      page: normalized.page,
      hasMore: sourceResults.some((result) => result.results.length >= 24) || results.length >= 24,
      errors,
      sourceLimitations: sourceLimitations(normalized, selectedSources),
    },
  };

  const cacheError = await writeCacheWithStatus("manga_cache", cacheKey, normalized.source, payload as unknown as Json, 60 * 10);
  if (cacheError) payload.meta.errors.push(`Cache: ${cacheError}`);

  return payload;
});

export const searchManga = cache(async (params: MangaSearchParams = {}) => {
  const payload = await searchMangaWithMeta(params);
  return payload.results;
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
