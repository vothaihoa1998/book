import { describe, expect, it } from "vitest";
import { defaultReaderPrefs, resolvePrefetchCount, resolveReaderFormat, resolveReaderLayout } from "./reader-presets";
import type { Chapter, Manga } from "./types";

const manga: Manga = {
  id: "mangadex:sample",
  source: "mangadex",
  sourceId: "sample",
  slug: "sample",
  title: "Sample",
  altTitles: [],
  cover: null,
  author: null,
  status: "ongoing",
  genres: [],
  description: "",
  lastChapter: null,
  updatedAt: "2026-01-01T00:00:00.000Z",
  rating: null,
  format: "manga",
};

const chapter: Chapter = {
  id: "mangadex:chapter",
  mangaId: manga.id,
  source: "mangadex",
  sourceId: "chapter",
  number: "1",
  title: null,
  pages: [],
  language: "en",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("reader defaults", () => {
  it("uses screen-fit images and vertical scrolling for automatic mobile manga", () => {
    const prefs = defaultReaderPrefs(true);

    expect(prefs.direction).toBe("horizontal-ltr");
    expect(prefs.fit).toBe("smart");
    expect(resolveReaderLayout(prefs, manga, chapter, true)).toBe("strip");
  });

  it("uses one page for desktop manga and keeps explicit layouts across resize", () => {
    const prefs = defaultReaderPrefs(true);

    expect(resolveReaderLayout(prefs, manga, chapter, false)).toBe("single");
    expect(resolveReaderLayout({ ...prefs, layout: "double" }, manga, chapter, true)).toBe("double");
    expect(resolveReaderLayout({ ...prefs, layout: "single" }, manga, chapter, false)).toBe("single");
  });

  it("uses vertical scrolling for webtoon profiles and retains legacy format detection", () => {
    const prefs = defaultReaderPrefs(true);
    const webtoon = { ...manga, format: "manhwa" as const };

    expect(resolveReaderFormat(webtoon, chapter)).toBe("webtoon");
    expect(resolveReaderLayout(prefs, manga, chapter, true, "webtoon")).toBe("strip");
    expect(resolveReaderLayout(prefs, webtoon, chapter, false)).toBe("strip");
  });
});

describe("reader prefetch policy", () => {
  it("bounds automatic prefetch for mobile, slow networks, and data saver", () => {
    const prefs = defaultReaderPrefs(true);

    expect(resolvePrefetchCount(prefs, "mobile")).toBe(1);
    expect(resolvePrefetchCount(prefs, "desktop")).toBe(3);
    expect(resolvePrefetchCount(prefs, "desktop", { effectiveType: "3g" })).toBe(1);
    expect(resolvePrefetchCount(prefs, "desktop", { effectiveType: "2g" })).toBe(0);
    expect(resolvePrefetchCount({ ...prefs, dataSaver: true }, "desktop")).toBe(0);
    expect(resolvePrefetchCount(prefs, "desktop", { saveData: true })).toBe(0);
  });

  it("honors an explicit prefetch target while respecting low memory", () => {
    const prefs = { ...defaultReaderPrefs(true), prefetch: "3" as const };

    expect(resolvePrefetchCount(prefs, "mobile")).toBe(3);
    expect(resolvePrefetchCount(prefs, "desktop", { deviceMemory: 2 })).toBe(1);
  });
});
