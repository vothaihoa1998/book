import type { Metadata } from "next";
import { AlertCircle } from "lucide-react";
import { DiscoverResults, type DiscoverState } from "@/components/discover-results";
import { AlertState } from "@/components/ui/primitives";
import { discoverSearchHref } from "@/lib/search-links";
import { searchMangaWithMeta } from "@/lib/sources";
import { normalizeGenres, normalizeSearchParams } from "@/lib/sources/search-utils";
import type { MangaSearchParams } from "@/lib/types";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = PageProps<"/discover">;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDiscoverState(raw: Awaited<Props["searchParams"]>): DiscoverState {
  return {
    ...normalizeSearchParams({
      q: one(raw.q),
      source: one(raw.source) as MangaSearchParams["source"],
      status: one(raw.status) as MangaSearchParams["status"],
      sort: (one(raw.sort) ?? "latest") as MangaSearchParams["sort"],
      year: one(raw.year),
      releaseYear: one(raw.releaseYear),
      language: one(raw.language),
      format: one(raw.format),
      page: Number(one(raw.page)),
      genres: normalizeGenres(raw.genres),
    }),
    view: one(raw.view) === "list" ? "list" : "grid",
  };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const state = parseDiscoverState(await searchParams);
  return {
    title: state.q ? `Tìm ${state.q}` : "Khám phá truyện",
    description: "Tìm truyện theo ngôn ngữ, thể loại, tình trạng và năm phát hành.",
    alternates: { canonical: absoluteUrl(discoverSearchHref(state.q, state)) },
  };
}

export default async function DiscoverPage({ searchParams }: Props) {
  const state = parseDiscoverState(await searchParams);
  const { results, meta } = await searchMangaWithMeta(state);
  const failed = meta.errors.map((source) => ({ mangadex: "MangaDex", otruyen: "OTruyen", firecrawl: "Firecrawl" })[source] ?? source);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 md:pb-16 md:pt-10">
      <h1 className="break-words font-display text-5xl leading-tight">{state.q ? `Tìm “${state.q}”` : "Khám phá truyện"}</h1>
      {failed.length > 0 && (
        <AlertState className="mt-4 flex gap-2">
          <AlertCircle className="mt-0.5 shrink-0" size={16} />
          <p>Tạm thời chưa tải được dữ liệu từ {failed.join(", ")}.</p>
        </AlertState>
      )}
      <DiscoverResults
        key={discoverSearchHref(state.q, state)}
        state={state}
        results={results}
        hasMore={meta.hasMore}
        total={meta.total}
        limitations={meta.sourceLimitations}
      />
    </main>
  );
}
