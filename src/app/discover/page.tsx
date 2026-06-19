import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ChevronLeft, ChevronRight, X } from "lucide-react";
import { DiscoverForm } from "@/components/discover-form";
import { MangaCard } from "@/components/manga-card";
import { AlertState, EmptyState, FilterChip } from "@/components/ui/primitives";
import { searchMangaWithMeta } from "@/lib/sources";
import { DISCOVER_GENRES } from "@/lib/sources/search-utils";
import { normalizeGenres, normalizeSearchParams, type NormalizedSearchParams } from "@/lib/sources/search-utils";
import { type MangaSearchParams } from "@/lib/types";
import { absoluteUrl } from "@/lib/utils";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

type DiscoverState = NormalizedSearchParams;

const statusLabel = {
  all: "Mọi trạng thái",
  ongoing: "Đang ra",
  completed: "Hoàn thành",
  hiatus: "Tạm nghỉ",
  cancelled: "Đã huỷ",
  unknown: "Chưa rõ",
};

const sortLabel = {
  relevance: "Liên quan",
  latest: "Mới cập nhật",
  hot: "Hot",
  popular: "Phổ biến",
  rating: "Đánh giá",
};

const quickSorts: Array<{ value: MangaSearchParams["sort"]; label: string }> = [
  { value: "latest", label: "Mới nhất" },
  { value: "hot", label: "Xu hướng" },
  { value: "rating", label: "Đánh giá" },
];

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDiscoverState(raw: Record<string, string | string[] | undefined>): DiscoverState {
  const rawSort = one(raw.sort);
  return normalizeSearchParams({
    q: one(raw.q),
    source: "all",
    status: one(raw.status) as MangaSearchParams["status"],
    sort: (rawSort === "hot" || rawSort === "popular" || rawSort === "rating" || rawSort === "relevance" ? rawSort : "latest") as MangaSearchParams["sort"],
    year: one(raw.year),
    page: Number(one(raw.page) ?? "1"),
    genres: normalizeGenres(raw.genres),
  });
}

function ActivePill({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href} className="focus-visible:outline-focus-ring rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
      <FilterChip className="min-h-8 px-3 text-xs hover:text-foreground">
        {label} <X size={14} />
      </FilterChip>
    </Link>
  );
}

function discoverHref(state: DiscoverState, overrides: Partial<DiscoverState> = {}) {
  const next = { ...state, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.status !== "all") params.set("status", next.status);
  if (next.sort !== "latest") params.set("sort", next.sort);
  if (next.year !== "all") params.set("year", next.year);
  if (next.page > 1) params.set("page", String(next.page));
  next.genres.forEach((genre) => params.append("genres", genre));
  const query = params.toString();
  return query ? `/discover?${query}` : "/discover";
}

function genreLabel(value: string) {
  return DISCOVER_GENRES.find((item) => item.value === value)?.label ?? value;
}

function resultSummary(count: number, state: DiscoverState) {
  const label = new Intl.NumberFormat("vi-VN").format(count);
  return state.q ? `${label} kết quả · Trang ${state.page}` : `${label} truyện hiển thị · Trang ${state.page}`;
}

function SortTabs({ state }: { state: DiscoverState }) {
  return (
    <nav className="mt-8 flex flex-wrap gap-2" aria-label="Sắp xếp catalog">
      {quickSorts.map((item) => {
        const active = state.sort === item.value;
        return (
          <Link
            key={item.value}
            href={discoverHref(state, { sort: item.value, page: 1 })}
            className={active
              ? "inline-flex h-8 min-w-24 items-center justify-center rounded-(--radius-control) bg-foreground px-4 font-code text-[12px] font-normal uppercase leading-none tracking-[1px] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              : "inline-flex h-8 min-w-24 items-center justify-center rounded-(--radius-control) bg-secondary px-4 font-code text-[12px] font-normal uppercase leading-none tracking-[1px] text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            }
            style={active ? { color: "var(--background)" } : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Pagination({ state, hasMore }: { state: DiscoverState; hasMore: boolean }) {
  if (state.page <= 1 && !hasMore) return null;

  return (
    <nav className="mt-14 border-t border-border py-7" aria-label="Phân trang">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {state.page > 1 ? (
          <Link
            href={discoverHref(state, { page: state.page - 1 })}
            className="inline-flex h-11 w-fit items-center gap-2 rounded-(--radius-control) border border-border px-4 text-sm font-medium text-foreground transition hover:border-input hover:bg-secondary focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            <ChevronLeft size={16} /> Trang trước
          </Link>
        ) : (
          <span className="inline-flex h-11 w-fit items-center gap-2 rounded-(--radius-control) border border-border px-4 text-sm font-medium text-muted-foreground opacity-40">
            <ChevronLeft size={16} /> Trang trước
          </span>
        )}
        <span className="eyebrow text-center">Trang {state.page}</span>
        {hasMore ? (
          <Link
            href={discoverHref(state, { page: state.page + 1 })}
            className="ml-auto inline-flex h-11 w-fit items-center gap-2 rounded-(--radius-control) border border-border px-4 text-sm font-medium text-foreground transition hover:border-input hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            Trang sau <ChevronRight size={16} />
          </Link>
        ) : (
          <span className="ml-auto inline-flex h-11 w-fit items-center gap-2 rounded-(--radius-control) border border-border px-4 text-sm font-medium text-muted-foreground opacity-40">
            Trang sau <ChevronRight size={16} />
          </span>
        )}
      </div>
    </nav>
  );
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const state = parseDiscoverState(await searchParams);
  const title = state.q ? `Tìm ${state.q}` : "Khám phá truyện";
  const description = state.q
    ? `Kết quả tìm kiếm ${state.q}, sắp xếp theo ${sortLabel[state.sort].toLowerCase()}.`
    : "Catalog truyện tranh có phân trang, lọc theo thể loại, năm, trạng thái và độ phổ biến.";

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(discoverHref(state)),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(discoverHref(state)),
    },
  };
}

export default async function DiscoverPage({ searchParams }: Props) {
  const state = parseDiscoverState(await searchParams);
  const { results, meta } = await searchMangaWithMeta(state);
  const hasQuery = Boolean(state.q);
  const hasActiveFilter = hasQuery || state.genres.length > 0 || state.status !== "all" || state.year !== "all" || state.sort !== "latest";

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-16 lg:px-8">
      <header className="max-w-4xl">
        <p className="eyebrow text-primary">Khám phá</p>
        <h1 className="mt-1 editorial-title leading-[0.92] text-foreground sm:text-[6rem] md:text-[7.5rem] lg:text-6xl">
          {hasQuery ? `Tìm ${state.q}` : "Toàn bộ truyện"}
        </h1>
        <p className="mt-2 text-sm font-medium leading-7 text-muted-foreground md:text-[16px]">
          {resultSummary(results.length, state)}
        </p>
        <SortTabs state={state} />
      </header>

      {/* <DiscoverForm
        q={state.q}
        status={state.status}
        sort={state.sort}
        year={state.year}
        genres={state.genres}
      /> */}

      {/* {hasActiveFilter && (
        <section className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          {state.q && <ActivePill label={`Tìm: ${state.q}`} href={discoverHref(state, { q: "", page: 1 })} />}
          {state.status !== "all" && <ActivePill label={statusLabel[state.status]} href={discoverHref(state, { status: "all", page: 1 })} />}
          {state.sort !== "latest" && <ActivePill label={sortLabel[state.sort]} href={discoverHref(state, { sort: "latest", page: 1 })} />}
          {state.year !== "all" && <ActivePill label={state.year === "older" ? "Cũ hơn" : `Năm ${state.year}`} href={discoverHref(state, { year: "all", page: 1 })} />}
          {state.genres.map((genre) => (
            <ActivePill key={genre} label={genreLabel(genre)} href={discoverHref(state, { genres: state.genres.filter((item) => item !== genre), page: 1 })} />
          ))}
          <Link href="/discover" className="inline-flex h-9 items-center rounded-[var(--radius-control)] px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground">
            Xoá tất cả
          </Link>
        </section>
      )} */}

      {meta.errors.length > 0 && (
        <AlertState className="mt-5 flex gap-3">
          <AlertCircle className="mt-0.5 shrink-0" size={17} />
          <p>Một vài nguồn/cache phản hồi chưa ổn: {meta.errors.slice(0, 3).join("; ")}</p>
        </AlertState>
      )}

      {results.length === 0 ? (
        <EmptyState title="Không tìm thấy truyện phù hợp" className="mt-10">
          Thử bỏ bớt thể loại, đổi năm, hoặc dùng tên tiếng Anh/tiếng Việt khác. Kết quả rỗng không còn bị che bằng dữ liệu mẫu.
        </EmptyState>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((manga, index) => (
            <MangaCard key={manga.id} manga={manga} eager={index < 6} />
          ))}
        </div>
      )}

      <Pagination state={state} hasMore={meta.hasMore} />
    </main>
  );
}
