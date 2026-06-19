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
      <section className="mx-auto grid max-w-7xl grid-cols-[118px_minmax(0,1fr)] items-start gap-4 px-4 py-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:px-6 md:grid-cols-[minmax(220px,320px)_1fr] md:items-center md:gap-8 md:py-10 lg:px-8">
        <Link href={`/manga/${encodeURIComponent(featured.id)}`} className="group w-full max-w-[118px] sm:max-w-[160px] md:max-w-none">
          <MangaCover manga={featured} priority className="hairline" />
        </Link>

        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-muted">Đang nổi bật / {featured.source}</p>
          <h1 className="mt-2 font-display text-2xl font-semibold leading-[1.05] text-foreground sm:mt-3 sm:text-4xl md:mt-4 md:text-6xl lg:text-7xl">
            {featured.title}
          </h1>
          <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-muted sm:line-clamp-3 sm:font-display sm:text-lg sm:leading-7 md:text-xl md:leading-8">
            {truncate(featured.description, 190)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
            {featured.genres.slice(0, 3).map((genre) => (
              <Badge key={genre}>{genre}</Badge>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row">
            <AppLinkButton
              href={`/manga/${encodeURIComponent(featured.id)}`}
              size="md"
              pill
            >
              <Play size={16} fill="currentColor" />
              Bắt đầu đọc
            </AppLinkButton>
            <AppLinkButton
              href="/discover"
              variant="soft"
              size="md"
              pill
              className="hidden sm:inline-flex"
            >
              Khám phá thêm
            </AppLinkButton>
          </div>

          <div className="mt-8 hidden gap-3 border-y border-border py-4 sm:grid sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold text-muted">Chương mới</p>
              <p className="mt-1 text-lg font-semibold">{featured.lastChapter ?? "?"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted">Cập nhật</p>
              <p className="mt-1 text-lg font-semibold">{formatDate(featured.updatedAt)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted">Điểm đọc</p>
              <p className="mt-1 text-lg font-semibold">{featured.rating ? featured.rating.toFixed(1) : "Editorial"}</p>
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
