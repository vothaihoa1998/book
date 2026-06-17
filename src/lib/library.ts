export type ReadingHistoryLike = {
  manga_id: string;
  chapter_id: string;
  page_index: number;
  scroll_percent: number;
  updated_at: string;
};

export function latestHistoryByManga<T extends ReadingHistoryLike>(items: T[]) {
  const byManga = new Map<string, T>();

  items.forEach((item) => {
    const current = byManga.get(item.manga_id);
    if (!current || Date.parse(item.updated_at) > Date.parse(current.updated_at)) {
      byManga.set(item.manga_id, item);
    }
  });

  return Array.from(byManga.values()).sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
}
