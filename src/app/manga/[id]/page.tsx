import type { Metadata } from "next";
import { ArrowRight, Info, ListOrdered, Play, Radio } from "lucide-react";
import Link from "next/link";
import { CommentsPanel, type CommentItem } from "@/components/comments-panel";
import { ChapterList } from "@/components/chapter-list";
import { FollowButton } from "@/components/follow-button";
import { MangaCover } from "@/components/manga-cover";
import { MangaDescription } from "@/components/manga-description";
import { AppLinkButton, Badge } from "@/components/ui/primitives";
import { getChapters, getManga } from "@/lib/sources";
import { siteConfig } from "@/lib/seo";
import { createServerSupabaseClient, getVerifiedUser } from "@/lib/supabase/server";
import { imageProxyUrl } from "@/lib/types";
import { absoluteUrl, formatDate, truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const manga = await getManga(id);
  const url = absoluteUrl(`/manga/${encodeURIComponent(manga.id)}`);
  const description = manga.description?.trim()
    ? truncate(manga.description, 155)
    : `Đọc ${manga.title} trên InkRail với reader tối giản, giao diện tối dễ chịu và đồng bộ thư viện.`;
  const cover = manga.cover ? absoluteUrl(imageProxyUrl(manga.cover, manga.source)) : siteConfig.ogImage;

  return {
    title: manga.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: manga.title,
      description,
      url,
      type: "article",
      images: [{ url: cover, alt: `Bìa truyện ${manga.title}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: manga.title,
      description,
      images: [cover],
    },
  };
}

export default async function MangaDetailPage({ params }: Props) {
  const { id } = await params;
  const manga = await getManga(id);
  const [chapters, supabase, userResult] = await Promise.all([
    getChapters(manga.id),
    createServerSupabaseClient(),
    getVerifiedUser(),
  ]);

  // Pull reading history to mark which chapters the user has visited + sticky CTA
  const progressByChapter = new Map<string, { pageIndex: number; scrollPercent: number; updatedAt: string }>();
  const mangaHistory = supabase && userResult
    ? await supabase
        .from("reading_history")
        .select("chapter_id, page_index, scroll_percent, updated_at")
        .eq("manga_id", manga.id)
        .order("updated_at", { ascending: false })
    : null;
  mangaHistory?.data?.forEach((row) => {
    if (!progressByChapter.has(row.chapter_id)) {
      progressByChapter.set(row.chapter_id, {
        pageIndex: Number(row.page_index ?? 0),
        scrollPercent: Number(row.scroll_percent ?? 0),
        updatedAt: row.updated_at,
      });
    }
  });

  // For the comments panel (unchanged behaviour, fetched separately so it can fail silently).
  const commentsResult = supabase
    ? await supabase
        .from("comments")
        .select("id, user_id, author_name, manga_id, chapter_id, parent_id, body, created_at, updated_at")
        .eq("manga_id", manga.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(80)
    : { data: [], error: null };

  const firstChapter = chapters.at(-1) ?? chapters[0];
  const latestChapter = chapters[0];

  // "Continue reading" target: pick the chapter with the most recent
  // in-progress entry, not just the first one in the chapter list (chapters
  // may be returned in arbitrary order from the source).
  let continueTarget: { id: string; chapter: typeof latestChapter; progress: number } | null = null;
  for (const ch of chapters) {
    const p = progressByChapter.get(ch.id);
    if (!p) continue;
    if (p.scrollPercent <= 1 || p.scrollPercent >= 95) continue;
    if (!continueTarget || new Date(p.updatedAt) > new Date(progressByChapter.get(continueTarget.id)!.updatedAt)) {
      continueTarget = { id: ch.id, chapter: ch, progress: p.scrollPercent };
    }
  }

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

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl grid-cols-[112px_minmax(0,1fr)] items-start gap-4 px-4 py-6 sm:grid-cols-[160px_minmax(0,1fr)] sm:px-6 sm:py-8 md:grid-cols-[minmax(240px,340px)_1fr] md:items-start md:gap-10 md:py-14 lg:px-8">
        <div className="md:sticky md:top-24">
          <MangaCover manga={manga} priority className="hairline rounded-[var(--radius-card)]" />
        </div>
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground">{manga.source}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-foreground">{manga.status}</span>
            {manga.rating ? (<><span className="text-muted-foreground/40">·</span><span className="text-primary">{manga.rating.toFixed(1)} ★</span></>) : null}
          </p>
          <h1 className="mt-3 break-words editorial-title text-4xl leading-[1.05] text-foreground sm:mt-4 sm:text-5xl md:text-6xl md:leading-[0.98] lg:text-7xl">
            {manga.title}
          </h1>
          {manga.altTitles.length > 0 && (
            <p className="mt-3 break-words text-sm leading-6 text-muted-foreground">{manga.altTitles.slice(0, 3).join(" / ")}</p>
          )}
          <MangaDescription description={manga.description} />
          <div className="mt-5 flex flex-wrap gap-1.5">
            {manga.genres.slice(0, 8).map((genre) => (
              <Badge key={genre}>{genre}</Badge>
            ))}
          </div>

          {/* CTA row */}
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
            {continueTarget ? (
              <AppLinkButton
                href={`/read/${encodeURIComponent(continueTarget.id)}`}
                size="lg"
                className="rounded-full"
              >
                <Play size={15} fill="currentColor" />
                Đọc tiếp · {Math.round(continueTarget.progress)}%
              </AppLinkButton>
            ) : firstChapter ? (
              <AppLinkButton
                href={`/read/${encodeURIComponent(firstChapter.id)}`}
                size="lg"
                className="rounded-full"
              >
                <Play size={15} fill="currentColor" />
                Đọc từ đầu
              </AppLinkButton>
            ) : null}
            {latestChapter && latestChapter.id !== firstChapter?.id && (
              <AppLinkButton
                href={`/read/${encodeURIComponent(latestChapter.id)}`}
                variant="secondary"
                size="lg"
                className="rounded-full"
              >
                Chương mới nhất <ArrowRight size={15} />
              </AppLinkButton>
            )}
            <FollowButton manga={manga} />
          </div>

          <div className="mt-7 grid gap-4 border-y border-border py-4 sm:grid-cols-3">
            <Meta icon={<Radio size={14} />} label="Tác giả" value={manga.author ?? "Đang cập nhật"} />
            <Meta icon={<Info size={14} />} label="Cập nhật" value={formatDate(manga.updatedAt)} />
            <Meta icon={<ListOrdered size={14} />} label="Số chương" value={String(chapters.length)} />
          </div>
        </div>
      </section>

      {/* Chapter list + sidebar */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 md:pb-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Chapters</p>
                <h2 className="mt-2 break-words text-2xl font-display font-medium leading-tight text-foreground md:text-3xl">
                  Danh sách chương
                </h2>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {chapters.length > 0 && chapters[0]?.source !== manga.source && (
                  <span
                    title={`MangaDex chưa có chương VI/EN — dùng nguồn ${chapters[0]?.source?.toUpperCase()} thay thế.`}
                    className="meta-mono inline-flex items-center gap-1.5 rounded-full bg-accent-2/15 px-2.5 py-1 text-accent-2"
                  >
                    Nguồn: {chapters[0]?.source?.toUpperCase()}
                  </span>
                )}
                <span className="meta-mono shrink-0">{chapters.length} chương</span>
              </div>
            </div>

            {chapters.length === 0 ? (
              <div className="rounded-[var(--radius-card)] border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                Chưa có chương nào cho truyện này.
              </div>
            ) : chapters.every((chapter) => chapter.source === "sample") ? (
              <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-secondary/40 p-5 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Chưa tìm thấy chương từ nguồn chính thức.</p>
                <p className="mt-1.5 leading-6">
                  Truyện này hiện chưa có bản tiếng Việt hoặc tiếng Anh trên MangaDex/OTruyen, hoặc API tạm thời không phản hồi.
                  Bên dưới là <span className="font-medium text-foreground">dữ liệu mẫu</span> để bạn xem trước giao diện đọc — bấm vào sẽ mở trang đọc demo.
                </p>
              </div>
            ) : (
              <ChapterList
                chapters={chapters}
                progressByChapter={new Map(
                  Array.from(progressByChapter.entries()).map(([k, v]) => [
                    k,
                    { scrollPercent: v.scrollPercent, updatedAt: v.updatedAt },
                  ]),
                )}
                currentChapterId={continueTarget?.id ?? null}
              />
            )}
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
                <dd className="font-medium capitalize">{manga.status}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">Chương cuối</dt>
                <dd className="font-medium">{manga.lastChapter ?? "—"}</dd>
              </div>
              {manga.rating ? (
                <div className="flex justify-between gap-4 border-b border-border pb-3">
                  <dt className="text-muted-foreground">Điểm</dt>
                  <dd className="font-medium text-primary">{manga.rating.toFixed(1)} / 10</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Ngôn ngữ</dt>
                <dd className="font-medium uppercase">{chapterLanguageLabel(chapters[0]?.language)}</dd>
              </div>
            </dl>
          </aside>
        </div>
        <CommentsPanel
          mangaId={manga.id}
          initialComments={(commentsResult.data ?? []) as CommentItem[]}
          initialUserId={userResult?.id ?? null}
          initialError={commentsResult.error?.message ?? null}
        />
      </section>
    </main>
  );
}

function chapterLanguageLabel(lang?: string) {
  if (!lang) return "—";
  if (lang.startsWith("en")) return "EN";
  if (lang.startsWith("vi")) return "VI";
  if (lang.startsWith("ja")) return "JA";
  if (lang.startsWith("ko")) return "KO";
  if (lang.startsWith("zh")) return "ZH";
  return lang.slice(0, 2).toUpperCase();
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="meta-mono flex items-center gap-1.5">
        {icon} {label}
      </p>
      <p className="mt-2 break-words text-base font-medium">{value}</p>
    </div>
  );
}
