import type { Chapter, Manga, ReaderDirection } from "./types";

/**
 * Phase F2: auto-detect reading direction cho từng chapter dựa trên:
 * - Chapter.direction (override nếu có)
 * - Manga.genres chứa "manhwa" / "manhua" / "webtoon"
 * - MangaDex group name (nếu có trong title/chapter): "manhwa" / "manhua"
 *
 * Mobile-first override: trên viewport < 768px ưu tiên `vertical` (webtoon,
 * dễ vuốt dọc). User có thể override bằng settings sheet (lưu per-chapter).
 */
export function pickReaderDirection(
  manga: Pick<Manga, "genres" | "title">,
  chapter: Pick<Chapter, "direction" | "title"> | null,
  viewport: { width: number } = { width: 1024 },
): ReaderDirection {
  // 1. Chapter-level override (ưu tiên cao nhất)
  if (chapter?.direction) {
    if (viewport.width < 768) return "vertical";
    return chapter.direction;
  }

  const genres = (manga.genres ?? []).map((t) => t.toLowerCase());
  const title = (manga.title ?? "").toLowerCase();
  const chapterTitle = (chapter?.title ?? "").toLowerCase();

  // 2. Manhwa (KR) — đọc trái sang phải
  const isManhwa =
    genres.some((t) => t.includes("manhwa") || t.includes("manhua") || t.includes("webtoon")) ||
    title.includes("manhwa") ||
    title.includes("manhua") ||
    title.includes("webtoon") ||
    chapterTitle.includes("manhwa") ||
    chapterTitle.includes("manhua") ||
    chapterTitle.includes("webtoon");

  if (isManhwa) {
    return viewport.width < 768 ? "vertical" : "horizontal-ltr";
  }

  // 3. Mobile default = vertical (webtoon-style, dễ vuốt dọc)
  if (viewport.width < 768) return "vertical";

  // 4. Desktop default cho VN/EN scanlation = horizontal-rtl (giống manga JP)
  return "horizontal-rtl";
}
