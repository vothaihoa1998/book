import type { Metadata } from "next";
import { ArrowRight, Info, ListOrdered, Play, Radio } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentsPanel, type CommentItem } from "@/components/comments-panel";
import { ChapterList } from "@/components/chapter-list";
import { FollowButton } from "@/components/follow-button";
import { MangaCover } from "@/components/manga-cover";
import { MangaDescription } from "@/components/manga-description";
import { AppLinkButton, Badge } from "@/components/ui/primitives";
import { getChapters, getManga } from "@/lib/sources";
import { siteConfig } from "@/lib/seo";
import { createServerSupabaseClient, getVerifiedUser } from "@/lib/supabase/server";
import { imageProxyUrl, mangaFormatLabels } from "@/lib/types";
import { normalizeChapterLanguage } from "@/lib/sources/search-utils";
import { orderChapters } from "@/lib/reader-presets";
import { absoluteUrl, formatDate, truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = PageProps<"/manga/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const manga = await getManga(id);
  if (!manga) return { title: "Truyện chưa khả dụng", robots: { index: false } };
  const url = absoluteUrl(`/manga/${encodeURIComponent(manga.id)}`);
  const description = manga.description?.trim()
    ? truncate(manga.description, 155)
    : `Đọc ${manga.title} trên InkRail với reader tối giản, giao diện tối dễ chịu và đồng bộ thư viện.`;
  const cover = manga.cover ? absoluteUrl(imageProxyUrl(manga.cover, manga.source, manga.coverProxyToken)) : siteConfig.ogImage;

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

export default async function MangaDetailPage({ params, searchParams }: Props) {
  const [{ id }, { lang }] = await Promise.all([params, searchParams]);
  const language = normalizeChapterLanguage(typeof lang === "string" ? lang : null);
  const manga = await getManga(id);
  if (!manga) notFound();
  const mangaHref = `/manga/${encodeURIComponent(manga.id)}`;
  const [chapters, supabase, userResult] = await Promise.all([
    getChapters(manga.id, language),
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

  const ordered = orderChapters(chapters);
  const firstChapter = ordered[0];
  const latestChapter = ordered.at(-1);
  const languages = Array.from(new Set([
    ...(manga.languages?.filter((code) => normalizeChapterLanguage(code)) ?? (manga.source === "mangadex" ? ["vi", "en"] : [])),
    ...chapters.map((chapter) => chapter.language),
    ...(language ? [language] : []),
  ]));

  // "Continue reading" target: pick the chapter with the most recent
  // in-progress entry, not just the first one in the chapter list (chapters
  // may be returned in arbitrary order from the source).
  let continueTarget: { id: string; progress: number } | null = null;
  for (const ch of chapters) {
    const p = progressByChapter.get(ch.id);
    if (!p) continue;
    if (p.scrollPercent <= 1 || p.scrollPercent >= 95) continue;
    if (!continueTarget || new Date(p.updatedAt) > new Date(progressByChapter.get(continueTarget.id)!.updatedAt)) {
      continueTarget = { id: ch.id, progress: p.scrollPercent };
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* Hero — mobile-first editorial. Cover lớn 50vw mobile, info wrap.
          Desktop: 2-col với cover sticky bên trái. */}
      <section className="relative isolate overflow-hidden border-b border-border">
        {manga.cover && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageProxyUrl(manga.cover, manga.source, manga.coverProxyToken)} alt="" className="h-full w-full scale-110 object-cover opacity-15 blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
          </div>
        )}
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 py-7 sm:px-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-start md:gap-10 md:py-11">
          {/* Cover — mobile centered ~140px, desktop sticky */}
          <div className="mx-auto w-[172px] sm:w-[192px] md:mx-0 md:w-full">
            <MangaCover manga={manga} priority className="hairline rounded-[var(--radius-card)] shadow-[0_24px_60px_-24px_rgba(60,28,8,0.4)]" />
          </div>

          {/* Info */}
          <div className="min-w-0">
            {/* Source eyebrow */}
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-code text-[11px] uppercase tracking-[1.5px] text-muted-foreground">
              {manga.source === "mangadex" ? (
                <a href={`https://mangadex.org/title/${encodeURIComponent(manga.sourceId)}`} target="_blank" rel="noreferrer" className="hover:text-primary">
                  MangaDex
                </a>
              ) : (
                <span>{manga.source === "otruyen" ? "OTruyen" : "Mẫu"}</span>
              )}
              {manga.format && <span className="rounded bg-primary/15 px-1.5 py-0.5 text-primary">{mangaFormatLabels[manga.format]}</span>}
              {manga.releaseYear && <span>{manga.releaseYear}</span>}
              <span className="text-muted-foreground/40">·</span>
              <span className="text-foreground">{statusLabels[manga.status]}</span>
              {manga.rating ? (<><span className="text-muted-foreground/40">·</span><span className="text-primary font-semibold">★ {manga.rating.toFixed(1)}</span></>) : null}
            </p>

            {/* Title */}
            <h1 className="mt-2 break-words font-display text-[28px] font-medium leading-[1.05] text-foreground sm:text-4xl md:text-5xl md:leading-[0.98] lg:text-5xl">
              {manga.title}
            </h1>

            {/* Alt titles */}
            {manga.altTitles.length > 0 && (
              <p className="mt-1.5 break-words text-[12px] leading-5 text-muted-foreground sm:text-sm sm:leading-6">{manga.altTitles.slice(0, 3).join(" / ")}</p>
            )}

            {/* Description — collapse */}
            <div className="mt-3 sm:mt-4">
              <MangaDescription description={manga.description} />
            </div>

            {/* Genres */}
            {manga.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4">
                {manga.genres.slice(0, 8).map((genre) => (
                  <Link key={genre} href={`/discover?genres=${encodeURIComponent(genre.toLowerCase())}`} className="rounded-md hover:outline hover:outline-primary/40">
                    <Badge>{genre}</Badge>
                  </Link>
                ))}
              </div>
            )}

            {/* CTA row — primary "Đọc" full-width mobile, secondary inline desktop */}
            <div className="mt-5 grid grid-cols-1 gap-2 sm:mt-6 sm:flex sm:flex-wrap sm:gap-2.5">
              {continueTarget ? (
                <AppLinkButton
                  href={`/read/${encodeURIComponent(continueTarget.id)}?resume=1`}
                  size="lg"
                  className="ink-cta rounded-full sm:px-6"
                >
                  <Play size={15} fill="currentColor" />
                  Đọc tiếp · {Math.round(continueTarget.progress)}%
                </AppLinkButton>
              ) : firstChapter ? (
                <AppLinkButton
                  href={`/read/${encodeURIComponent(firstChapter.id)}`}
                  size="lg"
                  className="ink-cta rounded-full sm:px-6"
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
                  className="rounded-full sm:px-5"
                >
                  Mới nhất <ArrowRight size={14} />
                </AppLinkButton>
              )}
              <FollowButton manga={manga} />
            </div>

            {/* Stats row — 3 cột gọn */}
            <dl className="mt-5 grid grid-cols-3 gap-x-2 border-y border-border py-3 sm:mt-6 sm:gap-x-4 sm:py-4">
              {manga.author && <Meta icon={<Radio size={12} />} label="Tác giả" value={manga.author} />}
              {manga.artist && manga.artist !== manga.author && <Meta icon={<Radio size={12} />} label="Họa sĩ" value={manga.artist} />}
              <Meta icon={<Info size={12} />} label="Cập nhật" value={formatDate(manga.updatedAt)} />
              {chapters.length > 0 && <Meta icon={<ListOrdered size={12} />} label="Chương có thể mở" value={String(chapters.length)} />}
            </dl>
          </div>
        </div>
      </section>

      {/* Chapter list + sidebar */}
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 md:pb-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div id="chapters" className="scroll-mt-24">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
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

            {languages.length > 1 && (
              <nav aria-label="Ngôn ngữ chương" className="mb-4 flex flex-wrap gap-2">
                {[["", "Ưu tiên tiếng Việt"], ...languages.map((code) => [code, chapterLanguageLabel(code)])].map(([code, label]) => (
                  <Link
                    key={code}
                    href={code ? `${mangaHref}?lang=${encodeURIComponent(code)}#chapters` : `${mangaHref}#chapters`}
                    aria-current={(language ?? "") === code ? "true" : undefined}
                    prefetch={false}
                    className={`rounded-lg border px-2.5 py-1.5 text-sm ${(language ?? "") === code ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card hover:bg-secondary"}`}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            )}
            {chapters.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                {language ? "Chưa tải được chương bằng ngôn ngữ này." : "Chưa có chương nào khả dụng từ nguồn truyện."}
              </div>
            ) : (
              <ChapterList
                key={language ?? "default"}
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
                <dd className="font-medium">
                  {manga.source === "mangadex" ? (
                    <a href={`https://mangadex.org/title/${encodeURIComponent(manga.sourceId)}`} target="_blank" rel="noreferrer" className="hover:text-primary">
                      MangaDex
                    </a>
                  ) : manga.source === "otruyen" ? "OTruyen" : "InkRail"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">Trạng thái</dt>
                <dd className="font-medium">{statusLabels[manga.status]}</dd>
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

const statusLabels = {
  ongoing: "Đang ra", completed: "Hoàn thành", hiatus: "Tạm nghỉ", cancelled: "Đã hủy", unknown: "Chưa rõ",
};

function chapterLanguageLabel(lang?: string) {
  if (!lang) return "—";
  if (lang === "en") return "Tiếng Anh";
  if (lang === "vi") return "Tiếng Việt";
  if (lang === "ja") return "Tiếng Nhật";
  if (lang === "ko") return "Tiếng Hàn";
  if (lang === "zh") return "Tiếng Trung";
  if (lang === "zh-hk") return "Tiếng Trung phồn thể";
  return lang.toUpperCase();
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
