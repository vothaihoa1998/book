import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { z } from "zod";
import { DiscoverForm } from "@/components/discover-form";
import { MangaCard } from "@/components/manga-card";
import { MangaCover } from "@/components/manga-cover";
import { MangaRail } from "@/components/manga-rail";
import { getHome, searchMangaWithMeta } from "@/lib/sources";
import { normalizeGenres, normalizeSearchParams, type NormalizedSearchParams } from "@/lib/sources/search-utils";
import { type MangaSearchParams } from "@/lib/types";
import { absoluteUrl, formatDate, truncate } from "@/lib/utils";

const ViewSchema = z.enum(["grid", "list"]).catch("grid");

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type DiscoverState = NormalizedSearchParams & { view: "grid" | "list" };

const sourceLabel = {
  all: "Mọi nguồn",
  mangadex: "MangaDex",
  otruyen: "OTruyen",
  firecrawl: "Firecrawl",
  sample: "Sample",
};

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
  const search = normalizeSearchParams({
    q: one(raw.q),
    source: one(raw.source) as MangaSearchParams["source"],
    status: one(raw.status) as MangaSearchParams["status"],
    sort: one(raw.sort) as MangaSearchParams["sort"],
    year: one(raw.year),
    page: Number(one(raw.page) ?? "1"),
    genres: normalizeGenres(raw.genres),
  });

  return {
    ...search,
    view: ViewSchema.parse(one(raw.view)),
  };
}

function discoverHref(state: DiscoverState, overrides: Partial<DiscoverState> = {}) {
  const next = { ...state, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  params.set("source", next.source);
  params.set("status", next.status);
  params.set("sort", next.sort);
  params.set("year", next.year);
  params.set("view", next.view);
  if (next.page > 1) params.set("page", String(next.page));
  next.genres.forEach((genre) => params.append("genres", genre));
  const query = params.toString();
  return query ? `/discover?${query}` : "/discover";
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const state = parseDiscoverState(await searchParams);
  const title = state.q ? `Tìm ${state.q}` : "Khám phá truyện";
  const description = state.q
    ? `Kết quả tìm kiếm ${state.q} từ ${sourceLabel[state.source]}, sắp xếp theo ${sortLabel[state.sort].toLowerCase()}.`
    : "Khám phá truyện tranh theo thể loại, năm, trạng thái, nguồn và độ phổ biến.";

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
  const [{ results, meta }, home] = await Promise.all([searchMangaWithMeta(state), getHome()]);
  const hasQuery = Boolean(state.q);
  const hasActiveFilter = hasQuery || state.genres.length > 0 || state.status !== "all" || state.source !== "all" || state.year !== "all";
  const showDiscoveryRails = !hasActiveFilter && state.page === 1;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <p className="font-code text-[11px] uppercase text-muted">Khám phá</p>
        <h1 className="mt-3 font-display text-5xl font-semibold leading-none md:text-7xl">
          {hasQuery ? `Kết quả cho ${state.q}` : "Lọc truyện theo gu đọc"}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
          Chọn thể loại bằng nút, lọc theo năm và độ phổ biến. URL giữ nguyên filter để bạn chia sẻ hoặc quay lại đúng danh sách.
        </p>
      </div>

      <DiscoverForm
        q={state.q}
        source={state.source}
        status={state.status}
        sort={state.sort}
        year={state.year}
        genres={state.genres}
        view={state.view}
      />

      <section className="mt-5 flex flex-wrap items-center gap-2 font-code text-[11px] uppercase text-muted">
        <span className="rounded-[8px] border border-border bg-surface px-2.5 py-1">{sourceLabel[state.source]}</span>
        <span className="rounded-[8px] border border-border bg-surface px-2.5 py-1">{statusLabel[state.status]}</span>
        <span className="rounded-[8px] border border-border bg-surface px-2.5 py-1">{sortLabel[state.sort]}</span>
        {state.year !== "all" && <span className="rounded-[8px] border border-border bg-surface px-2.5 py-1">Năm: {state.year === "older" ? "Cũ hơn" : state.year}</span>}
        {state.genres.map((genre) => (
          <span key={genre} className="rounded-[8px] border border-border bg-surface px-2.5 py-1">{genre}</span>
        ))}
        {meta.fallbackUsed && <span className="rounded-[8px] border border-border bg-surface px-2.5 py-1">Fallback search</span>}
        {meta.sourceUsed.length > 0 && (
          <span className="rounded-[8px] border border-border bg-surface px-2.5 py-1">
            Nguồn: {meta.sourceUsed.map((source) => sourceLabel[source]).join(", ")}
          </span>
        )}
      </section>

      {meta.errors.length > 0 && (
        <div className="mt-5 flex gap-3 rounded-[8px] border border-border bg-surface p-4 text-sm leading-6 text-muted">
          <AlertCircle className="mt-0.5 shrink-0" size={17} />
          <p>Một vài nguồn/cache phản hồi chưa ổn: {meta.errors.slice(0, 3).join("; ")}</p>
        </div>
      )}

      {meta.sourceLimitations.length > 0 && (
        <div className="mt-5 rounded-[8px] border border-border bg-surface p-4 text-sm leading-6 text-muted">
          {meta.sourceLimitations.slice(0, 2).join(" ")}
        </div>
      )}

      {showDiscoveryRails ? (
        <div className="mt-6">
          <MangaRail label="Hot tuần" title="Đang được chú ý" items={home.trending.slice(0, 12)} />
          <MangaRail label="Mới ra mắt" title="Truyện vừa lên kệ" items={home.recent.slice(0, 12)} />
          <MangaRail label="Đã hoàn thành" title="Đọc liền mạch từ đầu đến cuối" items={results.filter((item) => item.status === "completed").slice(0, 12)} />
          <MangaRail label="Fantasy / Isekai" title="Một thế giới khác để rơi vào" items={results.filter((item) => item.genres.some((genre) => /fantasy|isekai/i.test(genre))).slice(0, 12)} />
        </div>
      ) : results.length === 0 ? (
        <div className="mt-10 border-y border-border py-14 text-center">
          <p className="font-display text-3xl font-semibold">Không tìm thấy truyện phù hợp</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">
            Thử bỏ bớt thể loại, đổi nguồn, hoặc dùng tên tiếng Anh/tiếng Việt khác. Kết quả rỗng không còn bị che bằng dữ liệu mẫu.
          </p>
        </div>
      ) : state.view === "list" ? (
        <div className="mt-8 divide-y divide-border border-y border-border">
          {results.map((manga) => (
            <Link
              key={manga.id}
              href={`/manga/${encodeURIComponent(manga.id)}`}
              className="grid gap-4 py-5 transition hover:bg-foreground/[0.025] sm:grid-cols-[96px_1fr_auto] sm:items-center"
            >
              <MangaCover manga={manga} className="w-24" />
              <div>
                <div className="flex flex-wrap gap-2 font-code text-[10px] uppercase text-muted">
                  <span className="rounded-[8px] border border-border bg-surface px-2 py-1">{sourceLabel[manga.source]}</span>
                  <span className="rounded-[8px] border border-border bg-surface px-2 py-1">{statusLabel[manga.status]}</span>
                  <span className="rounded-[8px] border border-border bg-surface px-2 py-1">{formatDate(manga.updatedAt)}</span>
                </div>
                <h2 className="mt-3 font-display text-2xl font-semibold">{manga.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{truncate(manga.description, 180)}</p>
              </div>
              <span className="font-code text-[11px] uppercase text-muted">Ch. {manga.lastChapter ?? "?"}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((manga) => (
            <MangaCard key={manga.id} manga={manga} />
          ))}
        </div>
      )}

      {(state.page > 1 || meta.hasMore) && (
        <nav className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-5">
          {state.page > 1 ? (
            <Link href={discoverHref(state, { page: state.page - 1 })} className="inline-flex h-11 items-center gap-2 rounded-[8px] border border-border bg-surface px-4 text-sm font-semibold">
              <ChevronLeft size={16} /> Trước
            </Link>
          ) : <span />}
          <span className="font-code text-[11px] uppercase text-muted">Trang {state.page}</span>
          {meta.hasMore ? (
            <Link href={discoverHref(state, { page: state.page + 1 })} className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-foreground px-4 text-sm font-semibold ink-on-dark">
              Sau <ChevronRight size={16} />
            </Link>
          ) : <span />}
        </nav>
      )}
    </main>
  );
}
