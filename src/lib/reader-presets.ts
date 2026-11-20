import type { Chapter, Manga, ReaderLayout, ReaderPrefs } from "./types";

export function defaultReaderPrefs(dark: boolean): ReaderPrefs {
  return {
    theme: dark ? "graphite-dark" : "warm-light",
    layout: "auto",
    direction: "vertical",
    fit: "width",
    brightness: 0,
    fontSize: 18,
    gap: 8,
  };
}

export function resolveReaderLayout(
  prefs: ReaderPrefs,
  manga: Manga,
  chapter: Chapter,
  narrow: boolean,
): Exclude<ReaderLayout, "auto"> {
  if (!prefs.layout) return prefs.direction === "vertical" ? "strip" : "double";
  if (prefs.layout !== "auto") return prefs.layout;
  const vertical = manga.format === "manhwa" || manga.format === "manhua" ||
    manga.genres.some((genre) => /webtoon|manhwa|manhua/i.test(genre)) || chapter.direction === "horizontal-ltr";
  if (vertical) return "strip";
  if (manga.format === "manga" || manga.source === "sample") return narrow ? "single" : "double";
  return "strip";
}

export function orderChapters(chapters: Chapter[]) {
  return [...chapters].sort((a, b) => {
    const left = Number(a.number);
    const right = Number(b.number);
    if (Number.isFinite(left) && Number.isFinite(right)) return left - right;
    if (Number.isFinite(left) !== Number.isFinite(right)) return Number.isFinite(left) ? -1 : 1;
    return a.number.localeCompare(b.number, "vi", { numeric: true });
  });
}
