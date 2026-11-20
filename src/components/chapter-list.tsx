"use client";

import { ChevronDown, Filter, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChapterFilterSheet } from "@/components/chapter-filter-sheet";
import { imageProxyUrl, type Chapter } from "@/lib/types";
import {
  chapterBadge,
  formatCount,
  isNewChapter,
  langShortLabel,
  relativeTime,
  sourceShortLabel,
} from "@/lib/format-time";

type ChapterProgress = { scrollPercent: number; updatedAt: string };

type Sort = "latest" | "oldest" | "number";

export type ChapterListFilter = {
  search: string;
  sort: Sort;
  langs: string[]; // empty = all
  hideRead: boolean;
  showVolumes: boolean;
};

export const DEFAULT_FILTER: ChapterListFilter = {
  search: "",
  sort: "latest",
  langs: [],
  hideRead: false,
  showVolumes: true,
};

export type ChapterListProps = {
  chapters: Chapter[];
  /** progressByChapter: chapterId → { scrollPercent, updatedAt } */
  progressByChapter: Map<string, ChapterProgress>;
  /** chapterId đang đọc dở (highlight accent) */
  currentChapterId?: string | null;
};

/**
 * Phase H1: Chapter list mật độ cao — compact row 3-col + search/sort/filter
 * + group volume + badges MỚI/ĐÃ ĐỌC/ĐANG ĐỌC + relative time + view count.
 */
export function ChapterList({ chapters, progressByChapter, currentChapterId }: ChapterListProps) {
  const [filter, setFilter] = useState<ChapterListFilter>(DEFAULT_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpValue, setJumpValue] = useState("");
  const [jumpError, setJumpError] = useState(false);
  const [jumpTarget, setJumpTarget] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(50);

  // 1. Collect distinct languages
  const languages = useMemo(() => {
    const set = new Set<string>();
    for (const ch of chapters) {
      if (ch.language) set.add(ch.language);
    }
    return Array.from(set).sort();
  }, [chapters]);

  // 2. Filter
  const filtered = useMemo(() => {
    let list = chapters;
    if (filter.search) {
      const q = filter.search.trim().toLowerCase();
      list = list.filter((ch) => {
        if (ch.number.toLowerCase().includes(q)) return true;
        if ((ch.title ?? "").toLowerCase().includes(q)) return true;
        // Range filter: "100-110"
        const rangeMatch = q.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
        if (rangeMatch) {
          const lo = parseFloat(rangeMatch[1]);
          const hi = parseFloat(rangeMatch[2]);
          const n = parseFloat(ch.number);
          return Number.isFinite(n) && n >= lo && n <= hi;
        }
        return false;
      });
    }
    if (filter.langs.length > 0) {
      list = list.filter((ch) => filter.langs.includes(ch.language));
    }
    if (filter.hideRead) {
      list = list.filter((ch) => {
        const p = progressByChapter.get(ch.id);
        return !p || p.scrollPercent < 95;
      });
    }
    // Sort
    list = list.slice().sort((a, b) => {
      if (filter.sort === "latest") {
        // Primary: updatedAt desc. Secondary: number desc — chương cùng ngày hiển thị theo số giảm dần.
        const dateDelta = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        if (dateDelta !== 0) return dateDelta;
        return parseFloat(b.number) - parseFloat(a.number);
      }
      if (filter.sort === "oldest") {
        const dateDelta = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        if (dateDelta !== 0) return dateDelta;
        return parseFloat(a.number) - parseFloat(b.number);
      }
      // sort by number
      const an = parseFloat(a.number);
      const bn = parseFloat(b.number);
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
      return a.number.localeCompare(b.number);
    });
    return list;
  }, [chapters, filter, progressByChapter]);

  // 3. Group by volume (every 50 ch, or regex)
  const grouped = useMemo(() => {
    if (!filter.showVolumes) return [{ volume: null, items: filtered }];
    const groups: Array<{ volume: string | null; items: Chapter[] }> = [];
    let currentGroup: { volume: string | null; items: Chapter[] } | null = null;
    for (const ch of filtered) {
      // Match "Vol.X" hoặc "Tập X" trong title
      const t = (ch.title ?? "").toLowerCase();
      const volMatch = t.match(/(?:vol|tập|tap|volume)\.?\s*(\d+)/);
      const volumeLabel = volMatch ? `Tập ${volMatch[1]}` : null;
      if (!currentGroup || currentGroup.volume !== volumeLabel) {
        currentGroup = { volume: volumeLabel, items: [ch] };
        groups.push(currentGroup);
      } else {
        currentGroup.items.push(ch);
      }
    }
    return groups;
  }, [filtered, filter.showVolumes]);

  // 4. Paginate groups — slice theo tổng chapter count, không phải group count.
  const visibleGroups = useMemo(() => {
    if (pageSize >= filtered.length) return grouped;
    const out: typeof grouped = [];
    let total = 0;
    for (const g of grouped) {
      if (total >= pageSize) break;
      const remaining = pageSize - total;
      if (g.items.length <= remaining) {
        out.push(g);
        total += g.items.length;
      } else {
        out.push({ volume: g.volume, items: g.items.slice(0, remaining) });
        total += remaining;
        break;
      }
    }
    return out;
  }, [grouped, pageSize, filtered.length]);

  const activeFilterCount = filter.langs.length + (filter.hideRead ? 1 : 0) + (filter.sort !== "latest" ? 1 : 0);

  useEffect(() => {
    if (!jumpTarget) return;
    const frame = requestAnimationFrame(() => {
      const row = document.getElementById(`chapter-row-${jumpTarget}`);
      row?.scrollIntoView({ block: "center" });
      row?.querySelector("a")?.focus({ preventScroll: true });
      setJumpTarget(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [jumpTarget]);

  function jumpToChapter(event: React.FormEvent) {
    event.preventDefault();
    const displayedOrder = grouped.flatMap((group) => group.items);
    const index = displayedOrder.findIndex((chapter) => chapter.number === jumpValue.trim());
    if (index < 0) {
      setJumpError(true);
      return;
    }

    setPageSize((size) => Math.max(size, index + 1));
    setJumpTarget(displayedOrder[index].id);
    setJumpOpen(false);
    setJumpValue("");
    setJumpError(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search bar sticky */}
      <div className="sticky top-0 z-10 -mx-3 flex items-center gap-2 bg-background/92 px-3 pb-2 pt-1 backdrop-blur-md sm:-mx-4 sm:px-4">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Tìm chương (vd: 100 hoặc 100-110)"
            value={filter.search}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
            className="w-full rounded-full border border-border bg-card py-1.5 pl-8 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
          {filter.search && (
            <button
              type="button"
              aria-label="Xoá tìm kiếm"
              onClick={() => setFilter((f) => ({ ...f, search: "" }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          aria-label="Mở bộ lọc"
          className="relative inline-flex h-8 items-center gap-1 rounded-full border border-border bg-card px-2.5 text-[12px] font-medium text-foreground transition hover:bg-secondary"
        >
          <Filter size={13} />
          <span className="hidden sm:inline">Lọc</span>
          {activeFilterCount > 0 && (
            <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setJumpOpen((v) => !v)}
          aria-label="Đi đến chương"
          className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-card px-2.5 text-[12px] font-medium text-foreground transition hover:bg-secondary"
        >
          <ChevronDown size={13} className="-rotate-90" />
          <span className="hidden sm:inline">Đi đến</span>
        </button>
      </div>

      {/* Jump-to-chapter inline form */}
      {jumpOpen && (
        <form onSubmit={jumpToChapter} className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Đi đến chương</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="123"
            value={jumpValue}
            onChange={(e) => { setJumpValue(e.target.value); setJumpError(false); }}
            autoFocus
            className="flex-1 rounded-full border border-border bg-background px-3 py-1 text-[13px] text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
          <button
            type="submit"
            disabled={!jumpValue.trim()}
            className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            Đi
          </button>
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setJumpOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        </form>
      )}

      {jumpOpen && jumpError && <p role="status" className="text-xs text-muted-foreground">Không có số chương này trong bộ lọc hiện tại.</p>}

      {/* Active filter chips */}
      {(filter.langs.length > 0 || filter.hideRead || filter.sort !== "latest") && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Đang lọc:</span>
          {filter.sort !== "latest" && (
            <button
              type="button"
              onClick={() => setFilter((f) => ({ ...f, sort: "latest" }))}
              className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/25"
            >
              {filter.sort === "oldest" ? "Cũ nhất" : "Số chương"}
              <X size={10} />
            </button>
          )}
          {filter.hideRead && (
            <button
              type="button"
              onClick={() => setFilter((f) => ({ ...f, hideRead: false }))}
              className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/25"
            >
              Ẩn đã đọc
              <X size={10} />
            </button>
          )}
          {filter.langs.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setFilter((f) => ({ ...f, langs: f.langs.filter((l) => l !== lang) }))}
              className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/25"
            >
              {langShortLabel(lang)}
              <X size={10} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilter(DEFAULT_FILTER)}
            className="text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Đặt lại
          </button>
        </div>
      )}

      {/* Result count */}
      <p className="text-[11px] tabular-nums text-muted-foreground">
        {filtered.length} / {chapters.length} chương
      </p>

      {/* Groups */}
      <ul className="flex flex-col gap-2">
        {visibleGroups.map((group, gi) => (
          <li key={`g-${gi}-${group.volume ?? "all"}`}>
            {group.volume && (
              <div className="mb-1.5 mt-2 flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.volume}
                </span>
                <span className="h-px flex-1 bg-border" />
                <span className="text-[10px] tabular-nums text-muted-foreground">{group.items.length}</span>
              </div>
            )}
            <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-card">
              {group.items.map((chapter) => {
                const progress = progressByChapter.get(chapter.id);
                const isCurrent = currentChapterId === chapter.id;
                const badge = chapterBadge(progress?.scrollPercent);
                const thumb = chapter.pages[0]?.url;
                const views = formatCount(chapter.views);
                const isNew = isNewChapter(chapter.updatedAt);
                const source = sourceShortLabel(chapter.source);
                return (
                  <li key={chapter.id} id={`chapter-row-${chapter.id}`}>
                    <Link
                      href={`/read/${encodeURIComponent(chapter.id)}`}
                      prefetch={false}
                      className={`group grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 px-2.5 py-2 transition hover:bg-secondary/50 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:gap-3 sm:px-3 ${isCurrent ? "bg-primary/8" : ""}`}
                    >
                      <span
                        aria-hidden
                        className="relative block aspect-[2/3] w-full overflow-hidden rounded-[var(--radius-control)] bg-surface-strong ring-1 ring-border"
                      >
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageProxyUrl(thumb, chapter.source)}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-[10px] text-muted-foreground">
                            {chapter.number}
                          </span>
                        )}
                        {/* Source badge overlay */}
                        {source && (
                          <span className="absolute bottom-0.5 right-0.5 rounded bg-background/85 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-foreground">
                            {source}
                          </span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className={`meta-mono shrink-0 ${badge === "read" ? "text-muted-foreground/70" : ""}`}>
                            Ch. {chapter.number}
                          </span>
                          <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {langShortLabel(chapter.language)}
                          </span>
                          {isNew && (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              Mới
                            </span>
                          )}
                          {badge === "reading" && (
                            <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                              Đang đọc · {Math.round(progress?.scrollPercent ?? 0)}%
                            </span>
                          )}
                          {badge === "read" && (
                            <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Đã đọc
                            </span>
                          )}
                          {isCurrent && (
                            <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                              Đang đọc
                            </span>
                          )}
                        </div>
                        <p className={`mt-0.5 line-clamp-1 break-words text-[13px] font-medium ${badge === "read" ? "text-muted-foreground" : "text-foreground"}`}>
                          {chapter.title || `Chương ${chapter.number}`}{chapter.externalUrl && " ↗"}
                        </p>
                        {(chapter.group || chapter.externalUrl) && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{[chapter.group, chapter.externalUrl && "Trang phát hành"].filter(Boolean).join(" · ")}</p>
                        )}
                        {progress && progress.scrollPercent > 5 && progress.scrollPercent < 95 && (
                          <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(100, Math.max(0, progress.scrollPercent))}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="meta-mono shrink-0 text-right">
                        <p className="text-[10px]">{relativeTime(chapter.updatedAt)}</p>
                        {views && <p className="mt-0.5 text-[9px] text-muted-foreground">👁 {views}</p>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>

      {/* Show more — chỉ hiện khi list dài > 50 chương và user chưa mở rộng hết */}
      {filtered.length > pageSize && (
        <button
          type="button"
          onClick={() => setPageSize((s) => s + 50)}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-border bg-card py-2.5 text-[12px] font-medium text-foreground transition hover:bg-secondary"
        >
          <Plus size={13} /> Hiện thêm {Math.min(50, filtered.length - pageSize)} chương
          <span className="text-muted-foreground">({filtered.length - pageSize} còn lại)</span>
        </button>
      )}
      {filtered.length > 50 && pageSize > 50 && (
        <button
          type="button"
          onClick={() => {
            setPageSize(50);
            window.scrollTo({ top: document.getElementById("chapter-list-anchor")?.getBoundingClientRect().top ?? 0, behavior: "smooth" });
          }}
          className="text-[10px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Thu gọn
        </button>
      )}

      <ChapterFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filter={filter}
        onChange={setFilter}
        languages={languages}
        resultCount={filtered.length}
      />
    </div>
  );
}