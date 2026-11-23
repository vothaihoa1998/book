import type { Metadata } from "next";
import { ArrowRight, BookOpen, CalendarDays, ChevronDown, Info, ListOrdered, Play, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentsPanel, type CommentItem } from "@/components/comments-panel";
import { ChapterList } from "@/components/chapter-list";
import { FollowButton } from "@/components/follow-button";
import { MangaCover } from "@/components/manga-cover";
import { MangaDescription } from "@/components/manga-description";
import { AppLinkButton, Badge, LinkButton } from "@/components/ui/primitives";
import { getChapters, getManga } from "@/lib/sources";
import { siteConfig } from "@/lib/seo";
import { imageProxyUrl, mangaFormatLabels } from "@/lib/types";
import { normalizeChapterLanguage } from "@/lib/sources/search-utils";
import { orderChapters } from "@/lib/reader-presets";
import { absoluteUrl, formatDate, truncate } from "@/lib/utils";
import { getRequestContext } from "@/lib/request-context";

export const dynamic = "force-dynamic";

type Props = PageProps<"/manga/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { identity } = await getRequestContext();
  const manga = await getManga(id, identity);
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
  const { user: userResult, supabase, identity } = await getRequestContext();
  const manga = await getManga(id, identity);
  if (!manga) notFound();
  const mangaHref = `/manga/${encodeURIComponent(manga.id)}`;

  const [chapters, mangaHistory, commentsResult] = await Promise.all([
    getChapters(manga.id, language, identity),
    supabase && userResult
    ? supabase
        .from("reading_history")
        .select("chapter_id, page_index, scroll_percent, updated_at")
        .eq("manga_id", manga.id)
        .order("updated_at", { ascending: false })
    : null,
    supabase
    ? supabase
        .from("comments")
        .select("id, user_id, author_name, manga_id, chapter_id, parent_id, body, created_at, updated_at")
        .eq("manga_id", manga.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(80)
    : { data: [], error: null },
  ]);

  // Pull reading history to mark which chapters the user has visited + sticky CTA
  const progressByChapter = new Map<string, { pageIndex: number; scrollPercent: number; updatedAt: string }>();
  mangaHistory?.data?.forEach((row) => {
    if (!progressByChapter.has(row.chapter_id)) {
      progressByChapter.set(row.chapter_id, {
        pageIndex: Number(row.page_index ?? 0),
        scrollPercent: Number(row.scroll_percent ?? 0),
        updatedAt: row.updated_at,
      });
    }
  });

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
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-7 sm:px-6 md:grid-cols-[minmax(210px,255px)_minmax(0,1fr)] md:items-start md:gap-9 md:py-12">
          <div className="mx-auto w-[156px] sm:w-[184px] md:mx-0 md:w-full">
            <MangaCover manga={manga} priority className="hairline rounded-xl shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]" />
          </div>

          <div className="min-w-0 md:pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              {manga.source === "mangadex" ? (
                <a href={`https://mangadex.org/title/${encodeURIComponent(manga.sourceId)}`} target="_blank" rel="noreferrer" className="rounded-md bg-secondary px-2.5 py-1 font-code text-[10px] font-medium uppercase tracking-wide text-muted-foreground transition hover:text-foreground">
                  MangaDex
                </a>
              ) : (
                <span className="rounded-md bg-secondary px-2.5 py-1 font-code text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{manga.source === "otruyen" ? "OTruyen" : "InkRail"}</span>
              )}
              {manga.format && <span className="rounded-md bg-primary/12 px-2.5 py-1 font-code text-[10px] font-medium uppercase tracking-wide text-primary">{mangaFormatLabels[manga.format]}</span>}
              <span className={`rounded-md px-2.5 py-1 font-code text-[10px] font-medium uppercase tracking-wide ${manga.status === "ongoing" ? "bg-accent-2/12 text-accent-2" : "bg-secondary text-muted-foreground"}`}>{statusLabels[manga.status]}</span>
              {manga.releaseYear && <span className="rounded-md bg-secondary px-2.5 py-1 font-code text-[10px] text-muted-foreground">{manga.releaseYear}</span>}
            </div>

            <h1 className="mt-4 break-words font-ui text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-[1.08] tracking-tight text-foreground">
              {manga.title}
            </h1>

            {manga.altTitles.length > 0 && (
              <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">{manga.altTitles.slice(0, 3).join(" · ")}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-border py-3 text-sm">
              {manga.rating ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                  <Star size={15} className="fill-primary text-primary" />
                  {manga.rating.toFixed(1)}
                  <span className="font-normal text-muted-foreground">/ 10</span>
                </span>
              ) : null}
              <a href="#chapters" className="inline-flex items-center gap-1.5 text-muted-foreground transition hover:text-foreground">
                <BookOpen size={15} />
                {chapters.length} chương
              </a>
              {manga.lastChapter && <span className="text-muted-foreground">Mới nhất: {manga.lastChapter}</span>}
            </div>

            {manga.genres.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {manga.genres.slice(0, 8).map((genre) => (
                  <Link key={genre} href={`/discover?genres=${encodeURIComponent(genre.toLowerCase())}`} className="rounded-md transition hover:ring-1 hover:ring-primary/40">
                    <Badge>{genre}</Badge>
                  </Link>
                ))}
              </div>
            )}

            {(manga.author || manga.artist) && (
              <p className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                {manga.author && <span><span className="font-medium text-foreground">Tác giả</span> {manga.author}</span>}
                {manga.artist && manga.artist !== manga.author && <span><span className="font-medium text-foreground">Họa sĩ</span> {manga.artist}</span>}
              </p>
            )}

            <div className="mt-4">
              <MangaDescription description={manga.description} />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:mt-6 sm:flex sm:flex-wrap sm:gap-2.5">
              {continueTarget ? (
                <AppLinkButton
                  href={`/read/${encodeURIComponent(continueTarget.id)}?resume=1`}
                  size="lg"
                  className="ink-cta sm:px-6"
                >
                  <Play size={15} fill="currentColor" />
                  Đọc tiếp · {Math.round(continueTarget.progress)}%
                </AppLinkButton>
              ) : firstChapter ? (
                <AppLinkButton
                  href={`/read/${encodeURIComponent(firstChapter.id)}`}
                  size="lg"
                  className="ink-cta sm:px-6"
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
                  className="sm:px-5"
                >
                  Mới nhất <ArrowRight size={14} />
                </AppLinkButton>
              )}
              <FollowButton manga={manga} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} /> Cập nhật {formatDate(manga.updatedAt)}</span>
              <a href="#chapters" className="inline-flex items-center gap-1.5 transition hover:text-foreground"><ListOrdered size={13} /> Xem danh sách chương <ChevronDown size={13} /></a>
              {manga.source === "mangadex" && <span className="inline-flex items-center gap-1.5"><Info size={13} /> Dữ liệu từ MangaDex</span>}
            </div>
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
                  <LinkButton
                    key={code}
                    href={code ? `${mangaHref}?lang=${encodeURIComponent(code)}#chapters` : `${mangaHref}#chapters`}
                    aria-current={(language ?? "") === code ? "true" : undefined}
                    prefetch={false}
                    variant="secondary"
                    size="sm"
                    className={`${(language ?? "") === code ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card hover:bg-secondary"}`}
                  >
                    {label}
                  </LinkButton>
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
