import { describe, expect, it } from "vitest";
import { latestHistoryByManga } from "./library";
import { apiSearchHref, discoverSearchHref } from "./search-links";
import { allowsSearchFallback, applySearchFilters, dedupeManga, normalizeSearchParams, searchCacheKey, selectedSearchSources } from "./sources/search-utils";
import { imageProxyUrl, makeScopedId, parseScopedId, slugify, type Manga } from "./types";

describe("source identity helpers", () => {
  it("round-trips scoped MangaDex ids", () => {
    const id = makeScopedId("mangadex", "abc-123");
    expect(id).toBe("mangadex:abc-123");
    expect(parseScopedId(encodeURIComponent(id))).toEqual({ source: "mangadex", sourceId: "abc-123" });
  });

  it("falls back to sample source for unscoped ids", () => {
    expect(parseScopedId("blue-period")).toEqual({ source: "sample", sourceId: "blue-period" });
  });

  it("normalizes Vietnamese-ish titles for stable slugs", () => {
    expect(slugify("Đọc truyện: Chương 01!")).toBe("doc-truyen-chuong-01");
  });

  it("builds proxy URLs with source metadata", () => {
    expect(imageProxyUrl("https://example.com/a b.jpg", "mangadex")).toBe(
      "/api/public/image?src=https%3A%2F%2Fexample.com%2Fa+b.jpg&source=mangadex",
    );
  });
});

describe("library helpers", () => {
  it("keeps only the latest history row per manga", () => {
    const latest = latestHistoryByManga([
      { manga_id: "m1", chapter_id: "c1", page_index: 1, scroll_percent: 10, updated_at: "2026-01-01T00:00:00.000Z" },
      { manga_id: "m1", chapter_id: "c2", page_index: 2, scroll_percent: 40, updated_at: "2026-01-03T00:00:00.000Z" },
      { manga_id: "m2", chapter_id: "c7", page_index: 0, scroll_percent: 5, updated_at: "2026-01-02T00:00:00.000Z" },
    ]);

    expect(latest.map((item) => `${item.manga_id}:${item.chapter_id}`)).toEqual(["m1:c2", "m2:c7"]);
  });
});

describe("search link helpers", () => {
  it("builds API search URLs with active discover filters", () => {
    expect(apiSearchHref(" doraemon ", {
      source: "mangadex",
      status: "completed",
      sort: "relevance",
      year: "2026",
      genres: ["action", "fantasy"],
    }, 5)).toBe("/api/search?q=doraemon&limit=5&source=mangadex&status=completed&sort=relevance&year=2026&genres=action&genres=fantasy");
  });

  it("builds discover search URLs and omits default filters", () => {
    expect(discoverSearchHref(" doraemon ", {
      source: "mangadex",
      status: "all",
      sort: "latest",
      year: "all",
      view: "list",
      genres: ["action"],
    })).toBe("/discover?q=doraemon&source=mangadex&view=list&genres=action");
  });
});

const manga: Manga[] = [
  {
    id: "mangadex:1",
    source: "mangadex",
    sourceId: "1",
    slug: "alpha",
    title: "Alpha",
    altTitles: [],
    cover: null,
    author: null,
    status: "ongoing",
    genres: ["Action", "Fantasy"],
    description: "A",
    lastChapter: "12",
    updatedAt: "2026-01-02T00:00:00.000Z",
    rating: 4,
  },
  {
    id: "otruyen:1",
    source: "otruyen",
    sourceId: "1",
    slug: "alpha-copy",
    title: "Alpha",
    altTitles: [],
    cover: null,
    author: null,
    status: "completed",
    genres: ["Romance"],
    description: "B",
    lastChapter: "20",
    updatedAt: "2026-01-03T00:00:00.000Z",
    rating: 2,
  },
  {
    id: "otruyen:2",
    source: "otruyen",
    sourceId: "2",
    slug: "beta",
    title: "Beta",
    altTitles: [],
    cover: null,
    author: null,
    status: "completed",
    genres: ["Romance", "Drama"],
    description: "C",
    lastChapter: "5",
    updatedAt: "2026-01-01T00:00:00.000Z",
    rating: 5,
  },
];

describe("search helpers", () => {
  it("normalizes source, sort, status, genres, and page", () => {
    expect(normalizeSearchParams({ q: " solo ", source: "otruyen", sort: "latest", status: "completed", genres: [" action ", "action"], page: 2 })).toEqual({
      q: "solo",
      source: "otruyen",
      status: "completed",
      sort: "latest",
      year: "all",
      releaseYear: "all",
      language: "all",
      format: "all",
      page: 2,
      genres: ["action"],
    });
  });

  it("includes every important filter in the cache key", () => {
    const first = searchCacheKey(normalizeSearchParams({ q: "solo", source: "all", status: "all", sort: "relevance", year: "2026", page: 1 }));
    const second = searchCacheKey(normalizeSearchParams({ q: "solo", source: "mangadex", status: "all", sort: "relevance", year: "older", page: 1 }));
    expect(first).not.toBe(second);
    expect(second).toContain("mangadex");
    expect(second).toContain("older");
  });

  it("keeps release year separate from update year and matches the selected translation and format", () => {
    const item: Manga = { ...manga[0], releaseYear: 2020, languages: ["vi", "en"], format: "manga" };
    const filters = { releaseYear: "2020", year: "2026", language: "en", format: "manga" };
    expect(applySearchFilters([item], normalizeSearchParams(filters))).toEqual([item]);
    expect(applySearchFilters([item], normalizeSearchParams({ ...filters, releaseYear: "2026" }))).toEqual([]);
    expect(discoverSearchHref("", { ...filters, page: 2 })).toContain("releaseYear=2020&language=en&format=manga&page=2");
  });

  it("selects all sources or one source explicitly", () => {
    expect(selectedSearchSources("all")).toEqual(["mangadex", "otruyen"]);
    expect(selectedSearchSources("mangadex")).toEqual(["mangadex"]);
  });

  it("only allows external fallback when every source is selected", () => {
    expect(allowsSearchFallback("all")).toBe(true);
    expect(allowsSearchFallback("mangadex")).toBe(false);
    expect(allowsSearchFallback("otruyen")).toBe(false);
  });

  it("dedupes, filters, and returns empty results without sample fallback", () => {
    expect(dedupeManga(manga)).toHaveLength(2);
    expect(applySearchFilters(manga, normalizeSearchParams({ status: "completed", genres: ["romance"], sort: "relevance" })).map((item) => item.id)).toEqual([
      "otruyen:1",
      "otruyen:2",
    ]);
    expect(applySearchFilters(manga, normalizeSearchParams({ status: "hiatus", genres: ["sports"] }))).toEqual([]);
  });
});
