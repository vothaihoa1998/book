import { describe, expect, it } from "vitest";
import { defaultReaderPrefs, resolveReaderLayout } from "./reader-presets";
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
  it("uses screen-fit images and vertical scrolling for automatic mobile layouts", () => {
    const prefs = defaultReaderPrefs(true);

    expect(prefs.direction).toBe("horizontal-ltr");
    expect(prefs.fit).toBe("smart");
    expect(resolveReaderLayout(prefs, manga, chapter, true)).toBe("strip");
  });

  it("keeps explicit layouts and desktop manga spreads", () => {
    const prefs = defaultReaderPrefs(true);

    expect(resolveReaderLayout(prefs, manga, chapter, false)).toBe("double");
    expect(resolveReaderLayout({ ...prefs, layout: "double" }, manga, chapter, true)).toBe("double");
  });

  it("keeps legacy automatic layouts vertical on mobile", () => {
    const prefs = { ...defaultReaderPrefs(true), layout: undefined };

    expect(resolveReaderLayout(prefs, manga, chapter, true)).toBe("strip");
  });
});
