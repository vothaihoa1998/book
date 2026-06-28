import type { Metadata } from "next";
import { AlertCircle } from "lucide-react";
import { DiscoverResults, type DiscoverState } from "@/components/discover-results";
import { AlertState } from "@/components/ui/primitives";
import { searchMangaWithMeta } from "@/lib/sources";
import { siteConfig } from "@/lib/seo";
import { normalizeGenres, normalizeSearchParams } from "@/lib/sources/search-utils";
import { type MangaSearchParams } from "@/lib/types";
import { absoluteUrl } from "@/lib/utils";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

const sortLabel = {
  relevance: "Liên quan",
  latest: "Mới cập nhật",
  hot: "Hot",
  popular: "Phổ biến",
  rating: "Đánh giá",
};

function getSortLabel(sort: string) {
  return sort in sortLabel ? sortLabel[sort as keyof typeof sortLabel] : sortLabel.latest;
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDiscoverState(raw: Record<string, string | string[] | undefined>): DiscoverState {
  const rawSort = one(raw.sort);
  return {
    q: one(raw.q) ?? "",
    source: (one(raw.source) as "all" | "mangadex" | "otruyen") ?? "all",
    status: (one(raw.status) as DiscoverState["status"]) ?? "all",
    sort: (rawSort === "hot" || rawSort === "popular" || rawSort === "rating" || rawSort === "relevance" ? rawSort : "latest") as DiscoverState["sort"],
    year: one(raw.year) ?? "all",
    page: Number(one(raw.page) ?? "1"),
    genres: normalizeGenres(raw.genres),
    view: (one(raw.view) as "grid" | "list") ?? "grid",
  };
}

function discoverHref(state: DiscoverState): string {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.status !== "all") params.set("status", state.status);
  if (state.sort !== "latest") params.set("sort", state.sort);
  if (state.year !== "all") params.set("year", state.year);
  if (state.source !== "all") params.set("source", state.source);
  if (state.page > 1) params.set("page", String(state.page));
  if (state.view !== "grid") params.set("view", state.view);
  state.genres.forEach((g) => params.append("genres", g));
  const q = params.toString();
  return q ? `/discover?${q}` : "/discover";
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const state = parseDiscoverState(await searchParams);
  const title = state.q ? `Tìm ${state.q}` : "Khám phá truyện";
  const description = state.q
    ? `Kết quả tìm kiếm ${state.q}, sắp xếp theo ${getSortLabel(state.sort).toLowerCase()}.`
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
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteConfig.twitterImage],
    },
  };
}

export default async function DiscoverPage({ searchParams }: Props) {
  const state = parseDiscoverState(await searchParams);
  // searchMangaWithMeta expects NormalizedSearchParams (no `view`/`source: "all"`)
  const searchState = normalizeSearchParams({
    q: state.q,
    source: state.source as MangaSearchParams["source"],
    status: state.status as MangaSearchParams["status"],
    sort: state.sort as MangaSearchParams["sort"],
    year: state.year,
    page: state.page,
    genres: state.genres,
  });
  const { results, meta } = await searchMangaWithMeta(searchState);
  const hasQuery = Boolean(state.q);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 md:pb-16 md:pt-12 lg:px-8">
      <header className="max-w-4xl">
        <p className="eyebrow text-primary">Khám phá</p>
        <h1 className="mt-1 break-words editorial-title leading-[0.92] text-foreground sm:text-[5rem] md:text-[6rem] lg:text-7xl">
          {hasQuery ? `Tìm ${state.q}` : "Toàn bộ truyện"}
        </h1>
        {results.length > 0 && (
          <p className="mt-2 text-sm font-medium leading-7 text-muted-foreground md:text-[16px]">
            {results.length.toLocaleString("vi-VN")} truyện hiển thị · Trang {state.page}
          </p>
        )}
      </header>

      {meta.errors.length > 0 && (
        <AlertState className="mt-5 flex gap-3">
          <AlertCircle className="mt-0.5 shrink-0" size={17} />
          <p>Một vài nguồn/cache phản hồi chưa ổn: {meta.errors.slice(0, 3).join("; ")}</p>
        </AlertState>
      )}

      <DiscoverResults
        state={state}
        results={results as never}
        hasMore={meta.hasMore}
        resultCount={results.length}
        total={meta.total}
      />
    </main>
  );
}
