import type { Metadata } from "next";
import { ArrowRight, Info, ListOrdered, Play, Radio } from "lucide-react";
import Link from "next/link";
import { CommentsPanel, type CommentItem } from "@/components/comments-panel";
import { FollowButton } from "@/components/follow-button";
import { MangaCover } from "@/components/manga-cover";
import { AppLinkButton, Badge } from "@/components/ui/primitives";
import { getChapters, getManga } from "@/lib/sources";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { absoluteUrl, formatDate, truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
  const supabase = await createServerSupabaseClient();
  const [commentsResult, userResult] = supabase ? await Promise.all([
    supabase
      .from("comments")
      .select("id, user_id, author_name, manga_id, chapter_id, parent_id, body, created_at, updated_at")
      .eq("manga_id", manga.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase.auth.getUser(),
  ]) : [{ data: [], error: null }, { data: { user: null }, error: null }];
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
          <p className="eyebrow">{manga.source} / {manga.status}</p>
          <h1 className="mt-4 editorial-title text-5xl md:text-7xl">{manga.title}</h1>
          {manga.altTitles.length > 0 && (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{manga.altTitles.slice(0, 3).join(" / ")}</p>
          )}
          <p className="mt-6 max-w-3xl font-display text-xl leading-8 text-muted-foreground md:text-2xl md:leading-9">{manga.description}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {manga.genres.slice(0, 8).map((genre) => (
              <Badge key={genre}>{genre}</Badge>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {firstChapter && (
              <AppLinkButton
                href={`/read/${encodeURIComponent(firstChapter.id)}`}
                size="lg"
              >
                <Play size={16} fill="currentColor" />
                Đọc từ đầu
              </AppLinkButton>
            )}
            {latestChapter && (
              <AppLinkButton
                href={`/read/${encodeURIComponent(latestChapter.id)}`}
                variant="secondary"
                size="lg"
              >
                Chương mới nhất <ArrowRight size={16} />
              </AppLinkButton>
            )}
            <FollowButton manga={manga} />
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
                <p className="eyebrow">Chapters</p>
                <h2 className="mt-2 section-title">Danh sách chương</h2>
              </div>
            </div>
            <div className="divide-y divide-border border-y border-border bg-card/55">
              {chapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  href={`/read/${encodeURIComponent(chapter.id)}`}
                  className="grid gap-3 px-4 py-4 transition hover:bg-foreground/[0.03] sm:grid-cols-[120px_1fr_auto] sm:items-center"
                >
                  <span className="meta-mono">Ch. {chapter.number}</span>
                  <span className="text-sm font-medium md:text-base">{chapter.title || `Chương ${chapter.number}`}</span>
                  <span className="meta-mono">{formatDate(chapter.updatedAt)}</span>
                </Link>
              ))}
            </div>
          </div>
          <aside className="h-fit rounded-[var(--radius-card)] border border-border bg-card p-5">
            <p className="eyebrow">Thông tin</p>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">Nguồn</dt>
                <dd className="font-medium">{manga.source}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">Trạng thái</dt>
                <dd className="font-medium">{manga.status}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">Chương cuối</dt>
                <dd className="font-medium">{manga.lastChapter ?? "?"}</dd>
              </div>
            </dl>
          </aside>
        </div>
        <CommentsPanel
          mangaId={manga.id}
          initialComments={(commentsResult.data ?? []) as CommentItem[]}
          initialUserId={userResult.data.user?.id ?? null}
          initialError={commentsResult.error?.message ?? null}
        />
      </section>
    </main>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="meta-mono flex items-center gap-2">
        {icon} {label}
      </p>
      <p className="mt-2 text-base font-medium">{value}</p>
    </div>
  );
}
