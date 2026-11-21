import "server-only";

import { cache } from "react";
import { sampleChapters, sampleManga } from "../sample-data";
import { logSourceFetch, readCache, readCacheWithStatus, writeCache, writeCacheWithStatus } from "../supabase/cache";
import { type Json } from "../supabase/types";
import { type Chapter, type HomePayload, makeScopedId, type Manga, type MangaSearchParams, type MangaSearchResult, parseScopedId } from "../types";
import { withChapterImageTokens, withMangaImageToken } from "../image-proxy-token";
import { filterRemovedChapters, filterRemovedManga, isChapterRemoved, isMangaRemoved } from "../content-removals";
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
import { allowsSearchFallback, applySearchFilters, dedupeManga, normalizeSearchParams, searchCacheKey, selectedSearchSources, sourceLimitations, uniqueSources } from "./search-utils";

function withFallback<T>(promise: Promise<T>, fallback: T) {
  return promise.catch(() => fallback);
}

async function cachedMaybe<T>(
  table: "manga_cache" | "chapter_cache",
  cacheKey: string,
  source: string,
  ttlSeconds: number,
  loader: () => Promise<T | null>,
  isCacheable: (value: T) => boolean = () => true,
) {
  const cached = await readCache<T>(table, cacheKey);
  if (cached) return cached;

  const value = await loader();
  if (value && isCacheable(value)) await writeCache(table, cacheKey, source, value as Json, ttlSeconds);
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
  // Lưu ý: [] là truthy trong JS → phải check length để không cache poisoned value rỗng.
  if (cached && cached.length) return cached;

  const value = await loader();
  if (value.length) await writeCache(table, cacheKey, source, value as Json, ttlSeconds);
  return value;
}

export const getHome = cache(async (): Promise<HomePayload> => {
  const key = "home:v2";
  const cached = await readCache<HomePayload>("manga_cache", key);
  if (cached) return withHomeImageTokens(cached);

  const [popular, recent, oRecent] = await Promise.allSettled([
    getPopularMangaDex(24),
    getRecentMangaDex(30),
    getRecentOTruyen(24),
  ]);
  const errors = [
    ...(popular.status === "rejected" || recent.status === "rejected" ? ["MangaDex"] : []),
    ...(oRecent.status === "rejected" ? ["OTruyen"] : []),
  ];
  const recentItems = dedupeManga([
    ...(oRecent.status === "fulfilled" ? oRecent.value.results : []),
    ...(recent.status === "fulfilled" ? recent.value : []),
  ]).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const trending = popular.status === "fulfilled" ? dedupeManga(popular.value) : [];
  const payload = {
    trending,
    recent: recentItems,
    errors,
  };
  if (!errors.length) await writeCache("manga_cache", key, "mixed", payload as unknown as Json, 60 * 30);
  return withHomeImageTokens(payload);
});

async function withHomeImageTokens(payload: HomePayload): Promise<HomePayload> {
  const [trending, recent] = await Promise.all([
    filterRemovedManga(payload.trending),
    filterRemovedManga(payload.recent),
  ]);
  return {
    ...payload,
    trending: trending.map(withMangaImageToken),
    recent: recent.map(withMangaImageToken),
  };
}

type SearchSource = "mangadex" | "otruyen" | "firecrawl";

export const getHomeCollections = cache(async () => {
  const collections = [
    { id: "completed", title: "Đã hoàn thành", href: "/discover?source=mangadex&language=vi&status=completed&sort=popular", status: "completed" as const, genres: [] as string[] },
    { id: "romance", title: "Tình cảm", href: "/discover?source=mangadex&language=vi&genres=romance&sort=popular", status: "all" as const, genres: ["romance"] },
  ];
  return Promise.all(collections.map(async (collection) => {
    const items = await cachedList("manga_cache", `home:collection:v1:${collection.id}`, "mangadex", 1800, async () => {
      const result = await searchMangaDex("", {
        status: collection.status,
        genres: collection.genres,
        language: "vi",
        sort: "popular",
        limit: 12,
      });
      return dedupeManga(result.results);
    }).catch(() => []);
    const visibleItems = await filterRemovedManga(items);
    return { id: collection.id, title: collection.title, href: collection.href, items: visibleItems.map(withMangaImageToken) };
  }));
});

async function runSearchSource(
  source: SearchSource,
  target: string,
  loader: () => Promise<{ results: Manga[]; total?: number; hasMore?: boolean }>,
) {
  const startedAt = Date.now();
  try {
    const payload = await loader();
    await logSourceFetch(source, target, true, Date.now() - startedAt).catch(() => undefined);
    return { source, ...payload, error: false };
  } catch {
    await logSourceFetch(source, target, false, Date.now() - startedAt).catch(() => undefined);
    return { source, results: [], total: 0, hasMore: false, error: true };
  }
}

export const searchMangaWithMeta = cache(async (params: MangaSearchParams = {}): Promise<MangaSearchResult> => {
  const normalized = normalizeSearchParams(params);
  const cacheKey = searchCacheKey(normalized);
  const { value: cached, error: cacheError } = await readCacheWithStatus<MangaSearchResult>("manga_cache", cacheKey);
  if (cached) {
    const results = await filterRemovedManga(cached.results);
    return { ...cached, results: results.map(withMangaImageToken) };
  }

  const sources = selectedSearchSources(normalized.source);
  const target = normalized.q ? `search:${normalized.q}` : "catalog";
  const sourceResults = await Promise.all(sources.map((source) =>
    runSearchSource(source, target, () => source === "mangadex"
      ? searchMangaDex(normalized.q, normalized, 24, params.requestIdentity)
      : searchOTruyen(normalized.q, normalized)),
  ));
  const errors = sourceResults.filter((source) => source.error).map((source) => source.source as string);

  let results = dedupeManga(applySearchFilters(sourceResults.flatMap((source) => source.results), normalized));
  let fallbackUsed = false;
  if (!results.length && normalized.q && normalized.page === 1 && allowsSearchFallback(normalized.source)) {
    const fallback = await runSearchSource("firecrawl", target, async () => ({ results: await searchFirecrawlManga(normalized.q) }));
    if (fallback.error) errors.push(fallback.source);
    results = dedupeManga(applySearchFilters(fallback.results, normalized));
    fallbackUsed = results.length > 0;
  }

  const payload: MangaSearchResult = {
    results,
    meta: {
      query: normalized.q,
      source: normalized.source,
      filters: normalized,
      sourceUsed: uniqueSources(results),
      fallbackUsed,
      page: normalized.page,
      hasMore: normalized.page < 400 && sourceResults.some((source) => source.hasMore),
      total: sources.length === 1 && normalized.year === "all" && normalized.format === "all" &&
        (sources[0] === "mangadex" || (normalized.releaseYear === "all" && normalized.status === "all" && !normalized.genres.length))
        ? sourceResults[0].total : undefined,
      errors,
      sourceLimitations: sourceLimitations(normalized, sources),
    },
  };

  if (!errors.length && !cacheError) {
    await writeCacheWithStatus("manga_cache", cacheKey, normalized.source, payload as unknown as Json, 60 * 10);
  }
  const visibleResults = await filterRemovedManga(payload.results);
  return { ...payload, results: visibleResults.map(withMangaImageToken) };
});

export const searchManga = cache(async (params: MangaSearchParams = {}) => {
  const payload = await searchMangaWithMeta(params);
  return payload.results;
});

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

/**
 * Cross-source fallback: khi MangaDex trả manga nhưng chapters rỗng,
 * tìm OTruyen theo title để route user sang bản vietsub native.
 * Trả về null nếu không tìm thấy.
 */
async function tryOtruyenFallbackByTitle(title: string): Promise<Manga | null> {
  if (!title) return null;
  const norm = normalizeTitle(title);
  if (!norm) return null;
  try {
    const response = await searchOTruyen(title, { page: 1 });
    const list = response.results ?? [];
    const match = list.find((item) => [item.title, ...item.altTitles].some((value) => normalizeTitle(value) === norm));
    if (!match) return null;
    return match;
  } catch {
    return null;
  }
}

export const getManga = cache(async (id: string, requestIdentity?: string) => {
  const parsed = parseScopedId(id);
  let manga: Manga | null = null;

  if (parsed.source === "mangadex") {
    manga = await cachedMaybe("manga_cache", `manga:v2:mangadex:${parsed.sourceId}`, "mangadex", 60 * 60 * 24, () =>
      withFallback(getMangaDex(parsed.sourceId, requestIdentity), null),
    );
  }
  if (parsed.source === "otruyen") {
    manga = await cachedMaybe("manga_cache", `manga:v2:otruyen:${parsed.sourceId}`, "otruyen", 60 * 60 * 24, () =>
      withFallback(getOTruyenManga(parsed.sourceId), null),
    );
  }

  const scopedId = makeScopedId(parsed.source, parsed.sourceId);
  const resolved = manga ?? sampleManga.find((item) => item.id === scopedId || item.sourceId === id) ?? null;
  if (!resolved || await isMangaRemoved(resolved)) return null;
  return withMangaImageToken(resolved);
});

export const getChapters = cache(async (mangaId: string, language?: string, requestIdentity?: string) => {
  const parsed = parseScopedId(mangaId);
  let chapters: Chapter[] = [];

  if (parsed.source === "mangadex") {
    chapters = await cachedList("chapter_cache", `chapters:v3:mangadex:${parsed.sourceId}:${language ?? "default"}`, "mangadex", 10 * 60, () =>
      withFallback(getMangaDexChapters(parsed.sourceId, language, requestIdentity), []),
    );
  }
  if (parsed.source === "otruyen" && (!language || language === "vi")) {
    chapters = await cachedList("chapter_cache", `chapters:v3:otruyen:${parsed.sourceId}`, "otruyen", 10 * 60, () =>
      withFallback(getOTruyenChapters(parsed.sourceId), []),
    );
  }

  // Cross-source fallback: nếu MangaDex không có chapter, tìm OTruyen theo title.
  if (chapters.length === 0 && parsed.source === "mangadex" && !language) {
    const manga = await getManga(mangaId);
    const fallback = manga ? await tryOtruyenFallbackByTitle(manga.title) : null;
    if (fallback && fallback.source === "otruyen") {
      const otChapters = await cachedList("chapter_cache", `chapters:v3:otruyen:${fallback.sourceId}`, "otruyen", 10 * 60, () =>
        withFallback(getOTruyenChapters(fallback.sourceId), []),
      );
      if (otChapters.length) chapters = otChapters;
    }
  }

  if (parsed.source === "sample" && (!language || language === "vi") && mangaId === sampleChapters[0].mangaId) {
    chapters = sampleChapters;
  }
  return filterRemovedChapters(chapters);
});

export const getChapter = cache(async (chapterId: string, requestIdentity?: string) => {
  const parsed = parseScopedId(chapterId);
  let chapter: Chapter | null = null;

  if (parsed.source === "mangadex") {
    chapter = await cachedMaybe("chapter_cache", `chapter:v3:mangadex:${parsed.sourceId}`, "mangadex", 5 * 60, () =>
      withFallback(getMangaDexChapter(parsed.sourceId, requestIdentity), null),
      (value) => Boolean(value.externalUrl || value.pages.length),
    );
  }
  if (parsed.source === "otruyen") {
    chapter = await cachedMaybe("chapter_cache", `chapter:v3:otruyen:${parsed.sourceId}`, "otruyen", 5 * 60, () =>
      withFallback(getOTruyenChapter(parsed.sourceId), null),
      (value) => value.pages.length > 0,
    );
  }

  const scopedId = makeScopedId(parsed.source, parsed.sourceId);
  const resolved = chapter ?? sampleChapters.find((item) => item.id === scopedId || item.sourceId === chapterId) ?? null;
  if (!resolved || await isChapterRemoved(resolved)) return null;
  return withChapterImageTokens(resolved);
});
