import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { ReaderClient } from "@/components/reader-client";
import { getReaderPreferences } from "@/lib/reader-preferences-server";
import { getChapter, getChapters, getManga } from "@/lib/sources";
import { langShortLabel } from "@/lib/format-time";
import { absoluteUrl } from "@/lib/utils";
import { getRequestContext } from "@/lib/request-context";

type Props = PageProps<"/read/[chapterId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chapterId } = await params;
  const { identity } = await getRequestContext();
  const chapter = await getChapter(chapterId, identity);
  if (!chapter) return { title: "Chương chưa khả dụng", robots: { index: false } };
  const manga = await getManga(chapter.mangaId, identity);
  return {
    title: manga ? `${manga.title} · Chương ${chapter.number}` : `Chương ${chapter.number}`,
    alternates: { canonical: absoluteUrl(`/read/${encodeURIComponent(chapter.id)}`) },
  };
}

export default async function ReadPage({ params, searchParams }: Props) {
  const [{ chapterId }, { resume }] = await Promise.all([params, searchParams]);
  const { headerList, user, supabase, identity } = await getRequestContext();
  const chapter = await getChapter(chapterId, identity);
  if (!chapter) {
    return <ChapterStatus title="Chương chưa khả dụng">Nguồn truyện chưa cung cấp chương này hoặc đang tạm gián đoạn.</ChapterStatus>;
  }

  const [manga, chapters, prefs, progress] = await Promise.all([
    getManga(chapter.mangaId, identity),
    chapter.externalUrl ? [] : getChapters(chapter.mangaId, chapter.language, identity),
    user ? getReaderPreferences(user.id) : null,
    user && supabase ? supabase.from("reading_history").select("page_index, page_offset, scroll_percent, updated_at")
      .eq("user_id", user.id).eq("manga_id", chapter.mangaId).eq("chapter_id", chapter.id).maybeSingle() : null,
  ]);
  if (chapter.externalUrl) {
    return (
      <ChapterStatus title={manga?.title ?? `Chương ${chapter.number}`} mangaId={chapter.mangaId}>
        <p>Chương {chapter.number} · {langShortLabel(chapter.language)} · MangaDex</p>
        {chapter.group && <p>Nhóm phát hành: {chapter.group}</p>}
        <a href={chapter.externalUrl} rel="noreferrer" className="ink-cta mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold">
          Đọc trên trang phát hành <ExternalLink size={15} />
        </a>
      </ChapterStatus>
    );
  }

  if (!manga || !chapter.pages.length) {
    return <ChapterStatus title="Chương chưa khả dụng" mangaId={chapter.mangaId}>Chưa tải được ảnh của chương {chapter.number}.</ChapterStatus>;
  }

  return (
    <ReaderClient
      key={chapter.id}
      manga={manga}
      chapter={chapter}
      chapters={chapters.map((item) => ({ ...item, pages: [] }))}
      userId={user?.id ?? null}
      syncedPrefs={prefs}
      syncedPosition={progress?.data ? {
        pageIndex: progress.data.page_index,
        pageOffset: progress.data.page_offset ?? undefined,
        scrollPercent: progress.data.scroll_percent,
        updatedAt: progress.data.updated_at,
      } : null}
      initialAppTheme={headerList.get("x-inkrail-theme") === "light" ? "light" : "dark"}
      resume={resume === "1"}
    />
  );
}

function ChapterStatus({ title, children, mangaId }: { title: string; children: React.ReactNode; mangaId?: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
      <div className="space-y-3 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h1 className="font-display text-4xl">{title}</h1>
        <div className="space-y-1 text-sm leading-6 text-muted-foreground">{children}</div>
        <Link href={mangaId ? `/manga/${encodeURIComponent(mangaId)}` : "/discover"} className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
          {mangaId ? "← Về trang truyện" : "← Khám phá truyện"}
        </Link>
      </div>
    </main>
  );
}
