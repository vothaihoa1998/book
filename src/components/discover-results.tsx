"use client";

import { Grid3x3, LayoutList, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MangaCard } from "@/components/manga-card";
import { Sheet } from "@/components/ui/sheet";
import { FilterChip, RadioChip, Button, Input } from "@/components/ui/primitives";
import { DISCOVER_GENRES } from "@/lib/sources/search-utils";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "all", label: "Tất cả" },
  { value: "ongoing", label: "Đang ra" },
  { value: "completed", label: "Hoàn thành" },
  { value: "hiatus", label: "Tạm nghỉ" },
  { value: "cancelled", label: "Đã huỷ" },
];

const SORTS = [
  { value: "latest", label: "Mới cập nhật" },
  { value: "hot", label: "Hot" },
  { value: "popular", label: "Phổ biến" },
  { value: "rating", label: "Đánh giá" },
  { value: "relevance", label: "Liên quan" },
];

const SOURCES = [
  { value: "all", label: "Tất cả" },
  { value: "mangadex", label: "MangaDex" },
  { value: "otruyen", label: "OTruyen" },
];

function years() {
  const current = new Date().getFullYear();
  return [
    { value: "all", label: "Tất cả" },
    { value: String(current), label: String(current) },
    { value: String(current - 1), label: String(current - 1) },
    { value: String(current - 2), label: String(current - 2) },
    { value: String(current - 3), label: String(current - 3) },
    { value: String(current - 4), label: String(current - 4) },
    { value: String(current - 5), label: String(current - 5) },
    { value: "older", label: `Trước ${current - 5}` },
  ];
}

export type DiscoverState = {
  q: string;
  status: string;
  sort: string;
  year: string;
  source: string;
  genres: string[];
  view: "grid" | "list";
  page: number;
};

type MangaList = Array<Parameters<typeof MangaCard>[0]["manga"]>;

export type DiscoverResultsProps = {
  state: DiscoverState;
  results: MangaList;
  hasMore: boolean;
  resultCount: number;
  total?: number;
};

/**
 * Phase H3: Discover results client — render grid/list với view toggle,
 * filter sheet (Sheet primitive), search bar sticky, active filter chips.
 */
export function DiscoverResults({ state, results, hasMore, resultCount, total }: DiscoverResultsProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<DiscoverState["view"]>(state.view ?? "grid");

  const activeFilterCount =
    state.genres.length +
    (state.status !== "all" ? 1 : 0) +
    (state.year !== "all" ? 1 : 0) +
    (state.source !== "all" ? 1 : 0) +
    (state.sort !== "latest" ? 1 : 0) +
    (state.q ? 1 : 0);

  function hrefFor(overrides: Partial<DiscoverState>) {
    const next = { ...state, ...overrides };
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.status !== "all") params.set("status", next.status);
    if (next.sort !== "latest") params.set("sort", next.sort);
    if (next.year !== "all") params.set("year", next.year);
    if (next.source !== "all") params.set("source", next.source);
    if (next.page > 1) params.set("page", String(next.page));
    if (next.view !== "grid") params.set("view", next.view);
    next.genres.forEach((g) => params.append("genres", g));
    const q = params.toString();
    return q ? `/discover?${q}` : "/discover";
  }

  return (
    <>
      {/* Sticky filter bar */}
      <div className="sticky top-0 z-20 -mx-4 flex items-center gap-2 bg-background/92 px-4 py-2.5 backdrop-blur-md sm:-mx-6 sm:px-6">
        <form action="/discover" method="get" className="relative flex-1">
          <input
            type="search"
            name="q"
            defaultValue={state.q}
            placeholder="Tìm truyện, tác giả, thể loại..."
            className="w-full rounded-full border border-border bg-card py-1.5 pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          </span>
          {state.q && (
            <Link
              href={hrefFor({ q: "" })}
              aria-label="Xoá tìm kiếm"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <span className="text-lg leading-none">×</span>
            </Link>
          )}
          {/* Preserve current filter state in hidden inputs */}
          {state.status !== "all" && <input type="hidden" name="status" value={state.status} />}
          {state.sort !== "latest" && <input type="hidden" name="sort" value={state.sort} />}
          {state.year !== "all" && <input type="hidden" name="year" value={state.year} />}
          {state.source !== "all" && <input type="hidden" name="source" value={state.source} />}
          {state.view !== "grid" && <input type="hidden" name="view" value={state.view} />}
          {state.genres.map((g) => <input key={g} type="hidden" name="genres" value={g} />)}
        </form>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilterOpen(true)}
          aria-label="Mở bộ lọc"
          className="relative h-8 rounded-full px-2.5 text-[12px]"
        >
          <SlidersHorizontal size={13} />
          <span className="hidden sm:inline">Lọc</span>
          {activeFilterCount > 0 && (
            <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <div className="hidden items-center gap-0.5 rounded-full border border-border bg-card p-0.5 sm:flex">
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
            aria-label="Xem dạng lưới"
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full transition",
              view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Grid3x3 size={13} />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            aria-label="Xem dạng danh sách"
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full transition",
              view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutList size={13} />
          </button>
        </div>
      </div>

      {/* Active filter chips (clickable to remove) */}
      {activeFilterCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Đang lọc:</span>
          {state.q && (
            <FilterChip active className="gap-1 pl-2 pr-1 text-[10px]">
              <Link href={hrefFor({ q: "", page: 1 })} className="flex items-center gap-1">
                Tìm: {state.q}
                <span className="text-base leading-none">×</span>
              </Link>
            </FilterChip>
          )}
          {state.status !== "all" && (
            <FilterChip active className="gap-1 pl-2.5 pr-1 text-[11px] font-semibold normal-case">
              <Link href={hrefFor({ status: "all", page: 1 })} className="flex items-center gap-1">
                {STATUSES.find((s) => s.value === state.status)?.label}
                <span className="text-base leading-none">×</span>
              </Link>
            </FilterChip>
          )}
          {state.sort !== "latest" && (
            <FilterChip active className="gap-1 pl-2.5 pr-1 text-[11px] font-semibold normal-case">
              <Link href={hrefFor({ sort: "latest", page: 1 })} className="flex items-center gap-1">
                {SORTS.find((s) => s.value === state.sort)?.label}
                <span className="text-base leading-none">×</span>
              </Link>
            </FilterChip>
          )}
          {state.year !== "all" && (
            <FilterChip active className="gap-1 pl-2.5 pr-1 text-[11px] font-semibold normal-case">
              <Link href={hrefFor({ year: "all", page: 1 })} className="flex items-center gap-1">
                {state.year === "older" ? "Cũ hơn" : state.year}
                <span className="text-base leading-none">×</span>
              </Link>
            </FilterChip>
          )}
          {state.source !== "all" && (
            <FilterChip active className="gap-1 pl-2.5 pr-1 text-[11px] font-semibold normal-case">
              <Link href={hrefFor({ source: "all", page: 1 })} className="flex items-center gap-1">
                {SOURCES.find((s) => s.value === state.source)?.label}
                <span className="text-base leading-none">×</span>
              </Link>
            </FilterChip>
          )}
          {state.genres.map((g) => (
            <FilterChip key={g} active className="h-8 min-h-0 gap-1 pl-2.5 pr-1 text-[11px] font-semibold normal-case">
              <Link href={hrefFor({ genres: state.genres.filter((x) => x !== g), page: 1 })} className="flex items-center gap-1">
                {DISCOVER_GENRES.find((d) => d.value === g)?.label ?? g}
                <span className="text-base leading-none">×</span>
              </Link>
            </FilterChip>
          ))}
          <Link
            href="/discover"
            className="text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Đặt lại
          </Link>
        </div>
      )}

      {/* Result count */}
      <p className="mt-3 text-[11px] tabular-nums text-muted-foreground">
        {resultCount.toLocaleString("vi-VN")} truyện
        {hasMore && " · còn trang sau"}
      </p>

      {/* Results: grid hoặc list */}
      {results.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="text-sm font-medium text-foreground">Không có truyện nào phù hợp</p>
          <p className="text-[12px] text-muted-foreground">Thử bỏ bớt thể loại, đổi năm, hoặc đổi từ khoá.</p>
          <Link href="/discover" className="mt-1 rounded-full bg-primary px-4 py-1.5 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90">
            Bỏ filter
          </Link>
        </div>
      ) : view === "grid" ? (
        <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {results.map((manga, index) => (
            <MangaCard key={manga.id} manga={manga} compact eager={index < 6} />
          ))}
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-card">
          {results.map((manga) => (
            <li key={manga.id}>
              <Link
                href={`/manga/${encodeURIComponent(manga.id)}`}
                className="group grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition hover:bg-secondary/50 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:px-4"
              >
                <span className="relative block aspect-[2/3] w-full overflow-hidden rounded-[var(--radius-control)] bg-surface-strong ring-1 ring-border">
                  {manga.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={manga.cover} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                  )}
                </span>
                <div className="min-w-0">
                  <h3 className="line-clamp-1 break-words text-[14px] font-semibold text-foreground sm:text-[15px]">{manga.title}</h3>
                  <p className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">
                    {[manga.author, manga.lastChapter ? `Ch. ${manga.lastChapter}` : null].filter(Boolean).join(" · ")}
                  </p>
                  {manga.genres.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {manga.genres.slice(0, 3).map((g) => (
                        <span key={g} className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="meta-mono block">{manga.status}</span>
                  {manga.rating && (
                    <span className="mt-0.5 inline-block text-[10px] font-semibold text-primary">★ {manga.rating.toFixed(1)}</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Filter sheet — dùng Sheet primitive (G2) */}
      <Sheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        ariaLabel="Bộ lọc khám phá"
        footer={
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/discover"
              className="rounded-full px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Đặt lại
            </Link>
            <Button
              type="submit"
              form="discover-filter-form"
              className="flex-1 rounded-full text-[13px]"
            >
              Lọc kết quả ({resultCount})
            </Button>
          </div>
        }
      >
        <form id="discover-filter-form" action="/discover" method="get" className="flex flex-col gap-5 pb-2">
          <h2 className="text-[15px] font-semibold text-foreground">Bộ lọc</h2>

          {/* Sort */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sắp xếp</p>
            <div className="flex flex-wrap gap-1.5">
              {SORTS.map((opt) => (
                <label key={opt.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="sort"
                    value={opt.value}
                    defaultChecked={state.sort === opt.value}
                    className="peer sr-only"
                  />
                  <RadioChip className="text-[11px]">
                    {opt.label}
                  </RadioChip>
                </label>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trạng thái</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((opt) => (
                <label key={opt.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    defaultChecked={state.status === opt.value}
                    className="peer sr-only"
                  />
                  <RadioChip className="text-[11px]">
                    {opt.label}
                  </RadioChip>
                </label>
              ))}
            </div>
          </div>

          {/* Source */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nguồn</p>
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map((opt) => (
                <label key={opt.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="source"
                    value={opt.value}
                    defaultChecked={state.source === opt.value}
                    className="peer sr-only"
                  />
                  <RadioChip className="text-[11px]">
                    {opt.label}
                  </RadioChip>
                </label>
              ))}
            </div>
          </div>

          {/* Year */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Năm cập nhật</p>
            <div className="flex flex-wrap gap-1.5">
              {years().map((opt) => (
                <label key={opt.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="year"
                    value={opt.value}
                    defaultChecked={state.year === opt.value}
                    className="peer sr-only"
                  />
                  <RadioChip className="text-[11px]">
                    {opt.label}
                  </RadioChip>
                </label>
              ))}
            </div>
          </div>

          {/* Genres */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Thể loại</p>
            <div className="flex flex-wrap gap-1.5">
              {DISCOVER_GENRES.map((opt) => (
                <label key={opt.value} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="genres"
                    value={opt.value}
                    defaultChecked={state.genres.includes(opt.value)}
                    className="peer sr-only"
                  />
                  <RadioChip className="text-[11px]">
                    {opt.label}
                  </RadioChip>
                </label>
              ))}
            </div>
          </div>

          {/* Preserve other state */}
          {state.q && <input type="hidden" name="q" value={state.q} />}
          {state.view !== "grid" && <input type="hidden" name="view" value={state.view} />}
        </form>
      </Sheet>

      {/* Pagination (footer) */}
      {(state.page > 1 || hasMore) && (
        <nav className="mt-8 flex items-center justify-between gap-2 border-t border-border pt-5" aria-label="Phân trang">
          {state.page > 1 ? (
            <Link
              href={hrefFor({ page: state.page - 1 })}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12px] font-medium text-foreground transition hover:bg-secondary"
            >
              ← Trang {state.page - 1}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-[11px] tabular-nums text-muted-foreground">
            Trang {state.page}
            {total && total > 0 ? (
              <>
                {" / "}
                <span className="text-foreground">{Math.max(state.page, Math.ceil(total / (results.length || 1)))}</span>
              </>
            ) : null}
          </span>
          {hasMore ? (
            <Link
              href={hrefFor({ page: state.page + 1 })}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12px] font-medium text-foreground transition hover:bg-secondary"
            >
              Trang {state.page + 1} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}