import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ChevronLeft, ChevronRight, X } from "lucide-react";
import { DiscoverForm } from "@/components/discover-form";
import { MangaCard } from "@/components/manga-card";
import { AlertState, AppLinkButton, EmptyState, FilterChip } from "@/components/ui/primitives";
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

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDiscoverState(raw: Record<string, string | string[] | undefined>): DiscoverState {
  const rawSort = one(raw.sort);
  return normalizeSearchParams({
    q: one(raw.q),
    source: "all",
    status: one(raw.status) as MangaSearchParams["status"],
    sort: (rawSort === "latest" || rawSort === "popular" ? rawSort : "hot") as MangaSearchParams["sort"],
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
  if (next.sort !== "hot") params.set("sort", next.sort);
  if (next.year !== "all") params.set("year", next.year);
  if (next.page > 1) params.set("page", String(next.page));
  next.genres.forEach((genre) => params.append("genres", genre));
  const query = params.toString();
  return query ? `/discover?${query}` : "/discover";
}

function genreLabel(value: string) {
  return DISCOVER_GENRES.find((item) => item.value === value)?.label ?? value;
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
  const hasActiveFilter = hasQuery || state.genres.length > 0 || state.status !== "all" || state.year !== "all" || state.sort !== "hot";

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="eyebrow">Khám phá</p>
          <h1 className="mt-2 font-ui text-3xl font-semibold leading-tight md:text-5xl">
            {hasQuery ? `Kết quả cho ${state.q}` : "Tất cả truyện"}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
            Duyệt catalog theo một dòng chảy rõ ràng. Bộ lọc được ẩn để màn hình tập trung vào truyện trước, thao tác sau.
          </p>
        </div>
        <FilterChip className="min-h-8 px-3 text-xs">
          Trang {state.page}
        </FilterChip>
      </div>

      <DiscoverForm
        q={state.q}
        status={state.status}
        sort={state.sort}
        year={state.year}
        genres={state.genres}
      />

      {hasActiveFilter && (
        <section className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          {state.q && <ActivePill label={`Tìm: ${state.q}`} href={discoverHref(state, { q: "", page: 1 })} />}
          {state.status !== "all" && <ActivePill label={statusLabel[state.status]} href={discoverHref(state, { status: "all", page: 1 })} />}
          {state.sort !== "hot" && <ActivePill label={sortLabel[state.sort]} href={discoverHref(state, { sort: "hot", page: 1 })} />}
          {state.year !== "all" && <ActivePill label={state.year === "older" ? "Cũ hơn" : `Năm ${state.year}`} href={discoverHref(state, { year: "all", page: 1 })} />}
          {state.genres.map((genre) => (
            <ActivePill key={genre} label={genreLabel(genre)} href={discoverHref(state, { genres: state.genres.filter((item) => item !== genre), page: 1 })} />
          ))}
          <Link href="/discover" className="inline-flex h-9 items-center rounded-[var(--radius-control)] px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground">
            Xoá tất cả
          </Link>
        </section>
      )}

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
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((manga, index) => (
            <MangaCard key={manga.id} manga={manga} eager={index < 6} />
          ))}
        </div>
      )}

      {(state.page > 1 || meta.hasMore) && (
        <nav className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-5">
          {state.page > 1 ? (
            <AppLinkButton href={discoverHref(state, { page: state.page - 1 })} variant="secondary">
              <ChevronLeft size={16} /> Trước
            </AppLinkButton>
          ) : <span />}
          <span className="meta-mono">Trang {state.page}</span>
          {meta.hasMore ? (
            <AppLinkButton href={discoverHref(state, { page: state.page + 1 })}>
              Sau <ChevronRight size={16} />
            </AppLinkButton>
          ) : <span />}
        </nav>
      )}
    </main>
  );
}
