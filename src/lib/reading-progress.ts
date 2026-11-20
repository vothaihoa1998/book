import type { ReadingHistoryLike } from "./library";

export type SavedReading = ReadingHistoryLike & {
  title: string;
  page_offset?: number;
};

export type ReaderPosition = { pageIndex: number; scrollPercent: number; pageOffset?: number; updatedAt?: string };

function readStorage<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}

function positionKey(chapterId: string, userId: string | null) {
  return userId ? `inkrail-progress:${userId}:${chapterId}` : `inkrail-progress:${chapterId}`;
}

function historyKey(userId: string | null) {
  return `inkrail-history:${userId ?? "guest"}`;
}

export function readPosition(chapterId: string, userId: string | null) {
  const position = readStorage<ReaderPosition>(positionKey(chapterId, userId));
  return position && Number.isFinite(position.pageIndex) && Number.isFinite(position.scrollPercent) ? position : null;
}

export function readRecentReading(userId: string | null) {
  const data = readStorage<SavedReading[]>(historyKey(userId));
  return Array.isArray(data) ? data : [];
}

export function savePosition(userId: string | null, reading: SavedReading) {
  try {
    localStorage.setItem(positionKey(reading.chapter_id, userId), JSON.stringify({
      pageIndex: reading.page_index, scrollPercent: reading.scroll_percent, pageOffset: reading.page_offset, updatedAt: reading.updated_at,
    }));
    const previous = readRecentReading(userId).filter((item) => item.manga_id !== reading.manga_id);
    localStorage.setItem(historyKey(userId), JSON.stringify([reading, ...previous].slice(0, 24)));
  } catch {
    // The reader still works when browser storage is disabled.
  }
}
