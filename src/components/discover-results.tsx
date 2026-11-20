"use client";

import { ArrowLeft, ArrowRight, Grid3x3, LayoutList, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { InstantSearch } from "@/components/instant-search";
import { MangaCard } from "@/components/manga-card";
import { MangaCover } from "@/components/manga-cover";
import { Sheet } from "@/components/ui/sheet";
import { relativeTime } from "@/lib/format-time";
import { discoverSearchHref } from "@/lib/search-links";
import { DISCOVER_GENRES } from "@/lib/sources/search-utils";
import { mangaFormatLabels, type Manga, type MangaSearchFilters } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUSES = [
  ["all", "Mọi trạng thái"], ["ongoing", "Đang ra"], ["completed", "Hoàn thành"],
  ["hiatus", "Tạm nghỉ"], ["cancelled", "Đã hủy"], ["unknown", "Chưa rõ"],
];
const SORTS = [
  ["latest", "Mới cập nhật"], ["hot", "Nổi bật gần đây"], ["popular", "Phổ biến"],
  ["rating", "Đánh giá"], ["relevance", "Liên quan"],
];
const SOURCES = [["all", "Mọi nguồn"], ["mangadex", "MangaDex"], ["otruyen", "OTruyen"]];
const LANGUAGES = [["all", "Mọi ngôn ngữ"], ["vi", "Tiếng Việt"], ["en", "Tiếng Anh"], ["ja", "Tiếng Nhật"], ["ko", "Tiếng Hàn"], ["zh", "Tiếng Trung"]];

export type DiscoverState = MangaSearchFilters & { view: "grid" | "list" };

export function DiscoverResults({ state, results, hasMore, total, limitations }: {
  state: DiscoverState;
  results: Manga[];
  hasMore: boolean;
  total?: number;
  limitations: string[];
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { q, source, status, year, releaseYear, sort, language, format, genres, view, page } = state;
  const filters = useMemo(() => ({
    source, status, year, releaseYear, sort, language, format, genres, view,
  }), [source, status, year, releaseYear, sort, language, format, genres, view]);

  const activeCount = genres.length + [source, status, year, releaseYear, language, format].filter((value) => value !== "all").length +
    Number(sort !== "latest");

  function hrefFor(overrides: Partial<DiscoverState>) {
    const next = { ...state, ...overrides };
    return discoverSearchHref(next.q, next);
  }

  return (
    <>
      <div id="search" className="mt-5 flex scroll-mt-20 items-center gap-2">
        <InstantSearch key={q} className="min-w-0 flex-1" defaultQuery={q} filters={filters} placeholder="Tìm tên truyện" />
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-secondary"
        >
          <SlidersHorizontal size={15} /> Bộ lọc {activeCount > 0 && <span className="text-primary">({activeCount})</span>}
        </button>
      </div>

      {activeCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {format !== "all" && <FilterLink href={hrefFor({ format: "all", page: 1 })}>{mangaFormatLabels[format]}</FilterLink>}
          {language !== "all" && <FilterLink href={hrefFor({ language: "all", page: 1 })}>{LANGUAGES.find(([value]) => value === language)?.[1] ?? language}</FilterLink>}
          {source !== "all" && <FilterLink href={hrefFor({ source: "all", page: 1 })}>{SOURCES.find(([value]) => value === source)?.[1]}</FilterLink>}
          {status !== "all" && <FilterLink href={hrefFor({ status: "all", page: 1 })}>{STATUSES.find(([value]) => value === status)?.[1] ?? status}</FilterLink>}
          {sort !== "latest" && <FilterLink href={hrefFor({ sort: "latest", page: 1 })}>{SORTS.find(([value]) => value === sort)?.[1]}</FilterLink>}
          {releaseYear !== "all" && <FilterLink href={hrefFor({ releaseYear: "all", page: 1 })}>Phát hành {releaseYear}</FilterLink>}
          {year !== "all" && <FilterLink href={hrefFor({ year: "all", page: 1 })}>Cập nhật {year === "older" ? "trước đây" : year}</FilterLink>}
          {genres.map((genre) => (
            <FilterLink key={genre} href={hrefFor({ genres: genres.filter((value) => value !== genre), page: 1 })}>
              {DISCOVER_GENRES.find((option) => option.value === genre)?.label ?? genre}
            </FilterLink>
          ))}
          <Link href={discoverSearchHref(q, { view })} className="p-1 text-muted-foreground hover:text-foreground hover:underline">Đặt lại bộ lọc</Link>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between border-b border-border pb-3">
        <p className="text-sm text-muted-foreground">
          {results.length.toLocaleString("vi-VN")} truyện trên trang {page}
          {total !== undefined && total > results.length && <> · {total.toLocaleString("vi-VN")} kết quả</>}
        </p>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-0.5">
          <Link href={hrefFor({ view: "grid" })} scroll={false} aria-label="Xem dạng lưới" aria-current={view === "grid" ? "true" : undefined}
            className={cn("rounded-md p-2 text-muted-foreground hover:text-foreground", view === "grid" && "bg-secondary text-primary")}><Grid3x3 size={16} /></Link>
          <Link href={hrefFor({ view: "list" })} scroll={false} aria-label="Xem dạng danh sách" aria-current={view === "list" ? "true" : undefined}
            className={cn("rounded-md p-2 text-muted-foreground hover:text-foreground", view === "list" && "bg-secondary text-primary")}><LayoutList size={16} /></Link>
        </div>
      </div>

      {limitations.length > 0 && <p className="mt-3 text-xs text-muted-foreground">{limitations.join(" ")}</p>}

      {results.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="font-semibold">Chưa có truyện phù hợp trên trang này.</p>
          <Link href={discoverSearchHref(q, { view })} className="mt-2 inline-block text-sm text-primary hover:underline">Bỏ bộ lọc</Link>
        </div>
      ) : view === "grid" ? (
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((manga, index) => <MangaCard key={manga.id} manga={manga} compact eager={index < 6} />)}
        </div>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((manga) => (
            <li key={manga.id}>
              <Link href={`/manga/${encodeURIComponent(manga.id)}`} className="group grid h-full grid-cols-[56px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border bg-card p-2.5 hover:border-primary/40">
                <MangaCover decorative manga={manga} className="rounded-md" />
                <div className="min-w-0 space-y-1">
                  <p className="meta-mono">{manga.format ? mangaFormatLabels[manga.format] : manga.source}</p>
                  <h2 className="line-clamp-2 text-sm font-semibold">{manga.title}</h2>
                  <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                    {manga.lastChapter && <span className="text-primary">Ch. {manga.lastChapter}</span>}{relativeTime(manga.updatedAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {(page > 1 || hasMore) && (
        <nav aria-label="Phân trang kết quả" className="mt-7 flex items-center justify-between gap-2 text-sm">
          {page > 1 ? <Link href={hrefFor({ page: page - 1 })} className="flex items-center gap-2 rounded-lg border border-border p-2"><ArrowLeft size={15} /> Trang trước</Link> : <span />}
          <span className="meta-mono">Trang {page}</span>
          {hasMore ? <Link href={hrefFor({ page: page + 1 })} className="flex items-center gap-2 rounded-lg border border-border p-2">Trang sau <ArrowRight size={15} /></Link> : <span />}
        </nav>
      )}

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} ariaLabel="Bộ lọc truyện"
        footer={<button form="discover-filters" className="ink-cta w-full rounded-lg p-2.5 text-sm font-semibold">Áp dụng bộ lọc</button>}>
        <form id="discover-filters" action="/discover" method="get" className="space-y-4">
          {q && <input type="hidden" name="q" value={q} />}
          {view !== "grid" && <input type="hidden" name="view" value={view} />}
          <h2 className="text-lg font-semibold">Bộ lọc truyện</h2>
          <div className="grid grid-cols-2 gap-3">
            <FilterSelect label="Loại truyện" name="format" value={format} options={[["all", "Mọi loại"], ...Object.entries(mangaFormatLabels)]} />
            <FilterSelect label="Ngôn ngữ bản dịch" name="language" value={language}
              options={LANGUAGES.some(([code]) => code === language) ? LANGUAGES : [...LANGUAGES, [language, language]]} />
            <FilterSelect label="Nguồn" name="source" value={source} options={SOURCES} />
            <FilterSelect label="Trạng thái" name="status" value={status} options={STATUSES} />
            <FilterSelect label="Năm cập nhật" name="year" value={year} options={[
              ["all", "Mọi năm"],
              ...Array.from({ length: 6 }, (_, index) => String(new Date().getFullYear() - index)).map((value) => [value, value]),
              ...(year !== "all" && year !== "older" && Number(year) < new Date().getFullYear() - 5 ? [[year, year]] : []),
              ["older", "Cũ hơn"],
            ]} />
            <FilterSelect label="Sắp xếp" name="sort" value={sort} options={SORTS} />
            <label className="min-w-0 text-xs font-medium text-muted-foreground">
              Năm phát hành
              <input type="number" min="1900" max={new Date().getFullYear()} placeholder="Mọi năm" name="releaseYear" defaultValue={releaseYear === "all" ? "" : releaseYear}
                className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground" />
            </label>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Thể loại</legend>
            <div className="flex flex-wrap gap-2">
              {[...DISCOVER_GENRES, ...genres.filter((value) => !DISCOVER_GENRES.some((genre) => genre.value === value)).map((value) => ({ value, label: value }))].map((genre) => (
                <label key={genre.value} className="cursor-pointer">
                  <input name="genres" type="checkbox" value={genre.value} defaultChecked={genres.includes(genre.value)} className="peer sr-only" />
                  <span className="inline-block rounded-lg border border-border px-2.5 py-1.5 text-xs peer-checked:border-primary/60 peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:outline">{genre.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </form>
      </Sheet>
    </>
  );
}

function FilterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="rounded-md bg-primary/10 px-2 py-1.5 text-primary hover:bg-primary/20">{children} <span aria-hidden="true">×</span></Link>;
}

function FilterSelect({ label, name, value, options }: { label: string; name: string; value: string; options: string[][] }) {
  return (
    <label className="min-w-0 text-xs font-medium text-muted-foreground">
      {label}
      <select name={name} defaultValue={value} className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground">
        {options.map(([option, title]) => <option key={option} value={option}>{title}</option>)}
      </select>
    </label>
  );
}
