import { orderChapters } from "./reader-presets";
import type { Chapter } from "./types";

export type ChapterGroup = { key: string; number: string; versions: Chapter[] };
export function groupReaderChapters(chapters: Chapter[], current: Chapter): ChapterGroup[] {
  const groups = new Map<string, ChapterGroup>();
  const seen = new Set<string>();
  for (const item of orderChapters([...chapters.filter(c => c.id !== current.id), current])) {
    if (item.language !== current.language || seen.has(item.id)) continue;
    seen.add(item.id);
    const number = item.number.trim();
    const key = number !== "" && Number.isFinite(Number(number)) ? String(Number(number)) : number;
    const group = groups.get(key) ?? { key, number, versions: [] };
    group.versions.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}
export function preferredChapter(group: ChapterGroup | undefined, current: Chapter) {
  return group?.versions.find(c => c.id === current.id)
    ?? group?.versions.find(c => c.group === current.group)
    ?? group?.versions[0];
}
export function pageStepForKey(key: string, rtl: boolean, shift: boolean) {
  if (key === " ") return shift ? -1 : 1;
  return (key === "ArrowRight") !== rtl ? 1 : -1;
}

export function readerSpread(page: number, total: number, double: boolean, coverSingle: boolean) {
  const current = Math.max(0, Math.min(total - 1, page));
  const step = double && !(coverSingle && current === 0) ? 2 : 1;
  const start = double && coverSingle && current > 0
    ? 1 + Math.floor((current - 1) / 2) * 2 : Math.floor(current / step) * step;
  return { start, end: Math.min(total, start + step), step };
}
