import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { DiscoverForm } from "@/components/discover-form";
import { MangaCard } from "@/components/manga-card";
import { MangaCover } from "@/components/manga-cover";
import { searchManga } from "@/lib/sources";
import { formatDate, truncate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Khám phá truyện",
  description: "Tìm kiếm truyện tranh theo nguồn MangaDex/OTruyen, trạng thái và thể loại.",
};

const SearchParamsSchema = z.object({
  q: z.string().optional().default(""),
  status: z.string().optional().default("all"),
  view: z.enum(["grid", "list"]).optional().default("grid"),
  page: z.coerce.number().int().positive().optional().default(1),
});

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DiscoverPage({ searchParams }: Props) {
  const raw = await searchParams;
  const parsed = SearchParamsSchema.parse({
    q: typeof raw.q === "string" ? raw.q : "",
    status: typeof raw.status === "string" ? raw.status : "all",
    view: typeof raw.view === "string" ? raw.view : "grid",
    page: typeof raw.page === "string" ? raw.page : 1,
  });
  const results = await searchManga(parsed);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <p className="font-code text-[11px] uppercase text-muted">Khám phá</p>
        <h1 className="mt-3 font-display text-5xl font-semibold leading-none md:text-7xl">Tìm truyện để đọc ngay</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
          Kết quả được chuẩn hoá từ MangaDex và OTruyen. URL giữ nguyên filter để bạn có thể chia sẻ danh sách đang xem.
        </p>
      </div>

      <DiscoverForm q={parsed.q} status={parsed.status} view={parsed.view} />

      {parsed.view === "list" ? (
        <div className="mt-8 divide-y divide-border border-y border-border">
          {results.map((manga) => (
            <Link
              key={manga.id}
              href={`/manga/${encodeURIComponent(manga.id)}`}
              className="grid gap-4 py-5 transition hover:bg-foreground/[0.025] sm:grid-cols-[96px_1fr_auto] sm:items-center"
            >
              <MangaCover manga={manga} className="w-24" />
              <div>
                <h2 className="font-display text-2xl font-semibold">{manga.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{truncate(manga.description, 180)}</p>
                <p className="mt-3 font-code text-[11px] uppercase text-muted">
                  {manga.source} / {manga.status} / {formatDate(manga.updatedAt)}
                </p>
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
    </main>
  );
}
