import type {
  Chapter,
  Manga,
  ReaderDeviceClass,
  ReaderFormatProfile,
  ReaderLayout,
  ReaderPrefs,
} from "./types";

export function defaultReaderPrefs(dark: boolean): ReaderPrefs {
  return {
    theme: dark ? "graphite-dark" : "warm-light",
    layout: "auto",
    direction: "horizontal-ltr",
    fit: "smart",
    brightness: 0,
    fontSize: 18,
    gap: 8,
    tapEdges: true,
    swipe: true,
    autoHide: true,
    hideDelay: 3,
    reduceMotion: false,
    dataSaver: false,
    prefetch: "auto",
  };
}

export function resolveReaderFormat(manga: Manga, chapter: Chapter): ReaderFormatProfile {
  const isWebtoon = manga.format === "manhwa" || manga.format === "manhua" ||
    manga.genres.some((genre) => /webtoon|manhwa|manhua/i.test(genre)) ||
    chapter.direction === "horizontal-ltr";
  return isWebtoon ? "webtoon" : "manga";
}

export function resolveReaderLayout(
  prefs: ReaderPrefs,
  manga: Manga,
  chapter: Chapter,
  narrow: boolean,
  format = resolveReaderFormat(manga, chapter),
): Exclude<ReaderLayout, "auto"> {
  if (prefs.layout && prefs.layout !== "auto") return prefs.layout;
  if (format === "webtoon") return "strip";
  return narrow ? "single" : "double";
}

export function resolvePrefetchCount(
  prefs: ReaderPrefs,
  device: ReaderDeviceClass,
  network: { saveData?: boolean; effectiveType?: string; deviceMemory?: number } = {},
) {
  if (prefs.dataSaver || network.saveData) return 0;
  const requested = prefs.prefetch === "auto"
    ? device === "mobile" ? 1 : 3
    : Number(prefs.prefetch);
  if (network.effectiveType === "slow-2g" || network.effectiveType === "2g") return 0;
  if (network.effectiveType === "3g" || (network.deviceMemory !== undefined && network.deviceMemory <= 2)) {
    return Math.min(requested, 1);
  }
  return requested;
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
