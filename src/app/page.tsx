import { Play } from "lucide-react";
import Link from "next/link";
import { MangaCover } from "@/components/manga-cover";
import { MangaRail } from "@/components/manga-rail";
import { AppLinkButton, Badge } from "@/components/ui/primitives";
import { latestHistoryByManga } from "@/lib/library";
import { getHome, getManga } from "@/lib/sources";
import { createServerSupabaseClient, getVerifiedUser } from "@/lib/supabase/server";
import { formatDate, truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [home, user, supabase] = await Promise.all([getHome(), getVerifiedUser(), createServerSupabaseClient()]);
  const featured = home.featured;
  const history = user && supabase
    ? await supabase
      .from("reading_history")
      .select("manga_id, chapter_id, page_index, scroll_percent, updated_at")
      .order("updated_at", { ascending: false })
      .limit(24)
    : null;
  const latestHistory = latestHistoryByManga(history?.data ?? []).slice(0, 6);
  const continueItems = await Promise.all(latestHistory.map((item) => getManga(item.manga_id)));
  const completed = [...home.trending, ...home.recent, ...home.recommended].filter((item) => item.status === "completed");

  return (
    <main>
      <section className="mx-auto grid max-w-7xl grid-cols-[112px_minmax(0,1fr)] items-start gap-4 px-4 py-6 sm:grid-cols-[160px_minmax(0,1fr)] sm:px-6 sm:py-8 md:grid-cols-[minmax(240px,340px)_1fr] md:items-center md:gap-10 md:py-14 lg:px-8">
        <Link href={`/manga/${encodeURIComponent(featured.id)}`} className="group w-full max-w-[112px] sm:max-w-[160px] md:max-w-none">
          <MangaCover manga={featured} priority className="hairline rounded-[var(--radius-card)]" />
        </Link>

        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow flex items-center gap-2">
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            Đang nổi bật <span className="text-muted-foreground/60">/</span> {featured.source}
          </p>
          <h1 className="mt-2 break-words editorial-title text-3xl leading-[1.05] text-foreground sm:mt-3 sm:text-5xl sm:leading-[1.0] md:mt-4 md:text-6xl md:leading-[0.98] lg:text-7xl">
            {featured.title}
          </h1>
          <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:mt-4 sm:line-clamp-3 sm:font-display sm:text-lg sm:leading-7 md:text-xl md:leading-8">
            {truncate(featured.description, 190)}
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5 sm:mt-5">
            {featured.genres.slice(0, 3).map((genre) => (
              <Badge key={genre}>{genre}</Badge>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-2.5 sm:mt-6 sm:flex-row sm:gap-3">
            <AppLinkButton
              className="rounded-full"
              href={`/manga/${encodeURIComponent(featured.id)}`}
              size="md"
            >
              <Play size={15} fill="currentColor" />
              Bắt đầu đọc
            </AppLinkButton>
            <AppLinkButton
              href="/discover"
              variant="soft"
              size="md"
              className="rounded-full"
            >
              Khám phá thêm
            </AppLinkButton>
          </div>

          <div className="mt-6 hidden gap-3 border-y border-border py-4 sm:mt-8 sm:grid sm:grid-cols-3">
            <div>
              <p className="meta-mono">Chương mới</p>
              <p className="mt-1 text-lg font-medium">{featured.lastChapter ?? "—"}</p>
            </div>
            <div>
              <p className="meta-mono">Cập nhật</p>
              <p className="mt-1 text-lg font-medium">{formatDate(featured.updatedAt)}</p>
            </div>
            <div>
              <p className="meta-mono">Điểm đọc</p>
              <p className="mt-1 text-lg font-medium">{featured.rating ? featured.rating.toFixed(1) : "Editorial"}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {user && continueItems.length > 0 && <MangaRail label="Tiếp tục đọc" title="Quay lại đúng bộ đang dở" items={continueItems} href="/library" />}
        <MangaRail label="Hot tuần" title="Đang được chú ý" items={home.trending.slice(0, 18)} href="/discover?sort=hot" />
        <MangaRail label="Mới cập nhật" title="Những chương vừa lên kệ" items={home.recent.slice(0, 20)} href="/discover?sort=latest" />
        <MangaRail label="Mới ra mắt" title="Truyện mới để thử ngay" items={home.recent.slice(6, 24)} href="/discover?sort=latest" />
        <MangaRail label="Đã hoàn thành" title="Đọc liền mạch không phải chờ" items={completed.slice(0, 18)} href="/discover?status=completed" />
      </div>
    </main>
  );
}
