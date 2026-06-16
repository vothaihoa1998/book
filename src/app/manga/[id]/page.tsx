import type { Metadata } from "next";
import { ArrowRight, Bookmark, Info, ListOrdered, Play, Radio } from "lucide-react";
import Link from "next/link";
import { MangaCover } from "@/components/manga-cover";
import { getChapters, getManga } from "@/lib/sources";
import { absoluteUrl, formatDate, truncate } from "@/lib/utils";

export const revalidate = 1800;

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const manga = await getManga(id);
  const url = `/manga/${encodeURIComponent(manga.id)}`;

  return {
    title: manga.title,
    description: truncate(manga.description, 155),
    alternates: { canonical: url },
    openGraph: {
      title: manga.title,
      description: truncate(manga.description, 180),
      url,
      images: manga.cover ? [{ url: manga.cover, alt: manga.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: manga.title,
      description: truncate(manga.description, 180),
      images: manga.cover ? [manga.cover] : undefined,
    },
  };
}

export default async function MangaDetailPage({ params }: Props) {
  const { id } = await params;
  const manga = await getManga(id);
  const chapters = await getChapters(manga.id);
  const firstChapter = chapters.at(-1) ?? chapters[0];
  const latestChapter = chapters[0];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Trang chủ", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: manga.title, item: absoluteUrl(`/manga/${encodeURIComponent(manga.id)}`) },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ComicSeries",
      name: manga.title,
      description: manga.description,
      image: manga.cover ?? undefined,
      author: manga.author ? { "@type": "Person", name: manga.author } : undefined,
      genre: manga.genres,
    },
  ];

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[minmax(260px,360px)_1fr] md:py-16 lg:px-8">
        <div className="mx-auto w-full max-w-[320px] md:max-w-none">
          <MangaCover manga={manga} priority className="hairline" />
        </div>
        <div className="min-w-0">
          <p className="font-code text-[11px] uppercase text-muted">{manga.source} / {manga.status}</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-none md:text-7xl">{manga.title}</h1>
          {manga.altTitles.length > 0 && (
            <p className="mt-3 text-sm leading-6 text-muted">{manga.altTitles.slice(0, 3).join(" / ")}</p>
          )}
          <p className="mt-6 max-w-3xl font-display text-xl leading-8 text-muted md:text-2xl md:leading-9">{manga.description}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {manga.genres.slice(0, 8).map((genre) => (
              <span key={genre} className="border border-border bg-surface px-3 py-1 font-code text-[11px] uppercase text-muted">
                {genre}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {firstChapter && (
              <Link
                href={`/read/${encodeURIComponent(firstChapter.id)}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-foreground px-5 text-sm font-semibold ink-on-dark transition hover:opacity-90"
              >
                <Play size={16} fill="currentColor" />
                Đọc từ đầu
              </Link>
            )}
            {latestChapter && (
              <Link
                href={`/read/${encodeURIComponent(latestChapter.id)}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-border bg-surface px-5 text-sm font-semibold transition hover:border-foreground/25"
              >
                Chương mới nhất <ArrowRight size={16} />
              </Link>
            )}
            <Link
              href="/library"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-border bg-surface px-5 text-sm font-semibold transition hover:border-foreground/25"
            >
              <Bookmark size={16} />
              Lưu thư viện
            </Link>
          </div>
          <div className="mt-10 grid gap-4 border-y border-border py-5 sm:grid-cols-3">
            <Meta icon={<Radio size={16} />} label="Tác giả" value={manga.author ?? "Đang cập nhật"} />
            <Meta icon={<Info size={16} />} label="Cập nhật" value={formatDate(manga.updatedAt)} />
            <Meta icon={<ListOrdered size={16} />} label="Số chương" value={String(chapters.length)} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="font-code text-[11px] uppercase text-muted">Chapters</p>
                <h2 className="mt-2 font-display text-4xl font-semibold">Danh sách chương</h2>
              </div>
            </div>
            <div className="divide-y divide-border border-y border-border bg-surface/55">
              {chapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  href={`/read/${encodeURIComponent(chapter.id)}`}
                  className="grid gap-3 px-4 py-4 transition hover:bg-foreground/[0.03] sm:grid-cols-[120px_1fr_auto] sm:items-center"
                >
                  <span className="font-code text-[11px] uppercase text-muted">Ch. {chapter.number}</span>
                  <span className="font-display text-xl font-semibold">{chapter.title || `Chương ${chapter.number}`}</span>
                  <span className="font-code text-[11px] uppercase text-muted">{formatDate(chapter.updatedAt)}</span>
                </Link>
              ))}
            </div>
          </div>
          <aside className="h-fit border border-border bg-surface p-5">
            <p className="font-code text-[11px] uppercase text-muted">Thông tin</p>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted">Nguồn</dt>
                <dd className="font-semibold">{manga.source}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted">Trạng thái</dt>
                <dd className="font-semibold">{manga.status}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted">Chương cuối</dt>
                <dd className="font-semibold">{manga.lastChapter ?? "?"}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-2 font-code text-[11px] uppercase text-muted">
        {icon} {label}
      </p>
      <p className="mt-2 text-base font-semibold">{value}</p>
    </div>
  );
}
