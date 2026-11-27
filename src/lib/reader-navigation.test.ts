import { describe, expect, it } from "vitest";
import { groupReaderChapters, preferredChapter, pageStepForKey, readerSpread } from "./reader-navigation";
import type { Chapter } from "./types";
const chapter = (id: string, number: string, group = "A", language = "vi"): Chapter => ({ id, number, group, language, mangaId: "manga", source: "mangadex", sourceId: id, title: null, pages: [], updatedAt: "2026-11-23" });
describe("reader chapter navigation", () => {
  it("groups duplicate numbers, removes duplicate IDs and keeps the current language", () => {
    const current = chapter("current", "684");
    const groups = groupReaderChapters([current, current, chapter("other", "684", "B"), chapter("en", "684", "A", "en"), chapter("next", "685")], current);
    expect(groups.map(g => g.number)).toEqual(["684", "685"]);
    expect(groups[0].versions.map(c => c.id)).toEqual(["other", "current"]);
    expect(preferredChapter(groups[0], current)?.id).toBe("current");
  });
  it("prefers the same translation group for the next chapter", () => {
    const current = chapter("current", "2");
    const groups = groupReaderChapters([chapter("b", "3", "B"), chapter("a", "3", "A")], current);
    expect(preferredChapter(groups[1], current)?.id).toBe("a");
    expect(preferredChapter(undefined, current)).toBeUndefined();
  });
  it("keeps decimal and special chapters and merges equivalent numeric labels", () => {
    const groups = groupReaderChapters([chapter("1", "1.0"), chapter("2", "1.5"), chapter("special", "Extra")], chapter("current", "1"));
    expect(groups.map(g => g.key)).toEqual(["1", "1.5", "Extra"]);
    expect(groups[0].versions).toHaveLength(2);
  });
  it("maps arrow keys to the reading direction and Space to forward", () => {
    expect(pageStepForKey("ArrowLeft", true, false)).toBe(1);
    expect(pageStepForKey("ArrowRight", true, false)).toBe(-1);
    expect(pageStepForKey("ArrowRight", false, false)).toBe(1);
    expect(pageStepForKey(" ", true, false)).toBe(1);
    expect(pageStepForKey(" ", false, true)).toBe(-1);
  });
});

describe("two-page navigation with a separate cover", () => {
  it("uses one cover page, pairs the next pages, and handles an odd last spread", () => {
    expect(readerSpread(0, 20, true, true)).toEqual({ start: 0, end: 1, step: 1 });
    expect(readerSpread(1, 20, true, true)).toEqual({ start: 1, end: 3, step: 2 });
    expect(readerSpread(2, 20, true, true)).toEqual({ start: 1, end: 3, step: 2 });
    expect(readerSpread(19, 20, true, true)).toEqual({ start: 19, end: 20, step: 2 });
  });
  it("can start with a pair and keeps single-page boundaries", () => {
    expect(readerSpread(0, 20, true, false)).toEqual({ start: 0, end: 2, step: 2 });
    expect(readerSpread(6, 20, false, true)).toEqual({ start: 6, end: 7, step: 1 });
  });
});
