import { ArrowRight, BookMarked, LogIn, Play } from "lucide-react";
import Link from "next/link";
import { MangaCover } from "@/components/manga-cover";
import { MangaRail } from "@/components/manga-rail";
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
  const action = [...home.trending, ...home.recent].filter((item) => item.genres.some((genre) => /action/i.test(genre)));
  const romance = [...home.trending, ...home.recommended].filter((item) => item.genres.some((genre) => /romance/i.test(genre)));
  const fantasy = [...home.trending, ...home.recommended].filter((item) => item.genres.some((genre) => /fantasy|isekai/i.test(genre)));

  return (
    <main>
      <section className="mx-auto grid min-h-[calc(92vh-4rem)] max-w-7xl gap-10 px-4 py-8 sm:px-6 md:grid-cols-[minmax(240px,380px)_1fr] md:items-center md:py-12 lg:px-8">
        <Link href={`/manga/${encodeURIComponent(featured.id)}`} className="group mx-auto w-full max-w-[360px] md:max-w-none">
          <MangaCover manga={featured} priority className="hairline" />
        </Link>

        <div className="max-w-3xl">
          <p className="font-code text-[11px] uppercase text-muted">Đang nổi bật / {featured.source}</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-[0.96] text-foreground sm:text-6xl lg:text-8xl">
            {featured.title}
          </h1>
          <p className="mt-6 max-w-2xl font-display text-xl leading-8 text-muted md:text-2xl md:leading-9">
            {truncate(featured.description, 230)}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {featured.genres.slice(0, 4).map((genre) => (
              <span key={genre} className="border border-border bg-surface px-3 py-1 font-code text-[11px] uppercase text-muted">
                {genre}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/manga/${encodeURIComponent(featured.id)}`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-foreground px-5 text-sm font-semibold ink-on-dark transition hover:opacity-90"
            >
              <Play size={16} fill="currentColor" />
              Bắt đầu đọc
            </Link>
            <Link
              href="/library"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-border bg-surface px-5 text-sm font-semibold transition hover:border-foreground/25"
            >
              <BookMarked size={16} />
              Tiếp tục đọc
            </Link>
          </div>

          <div className="mt-10 grid gap-3 border-y border-border py-5 sm:grid-cols-3">
            <div>
              <p className="font-code text-[11px] uppercase text-muted">Chương mới</p>
              <p className="mt-1 text-lg font-semibold">{featured.lastChapter ?? "?"}</p>
            </div>
            <div>
              <p className="font-code text-[11px] uppercase text-muted">Cập nhật</p>
              <p className="mt-1 text-lg font-semibold">{formatDate(featured.updatedAt)}</p>
            </div>
            <div>
              <p className="font-code text-[11px] uppercase text-muted">Điểm đọc</p>
              <p className="mt-1 text-lg font-semibold">{featured.rating ? featured.rating.toFixed(1) : "Editorial"}</p>
            </div>
          </div>
        </div>
      </section>

      {!user && (
        <section className="border-y border-border bg-surface/70">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <p className="flex items-center gap-2 text-sm text-muted"><LogIn size={16} /> Đăng nhập để đồng bộ lịch sử và bookmark giữa các thiết bị.</p>
            <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              Đăng nhập <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {user && continueItems.length > 0 && <MangaRail label="Tiếp tục đọc" title="Quay lại đúng bộ đang dở" items={continueItems} />}
        <MangaRail label="Mới cập nhật" title="Những chương vừa lên kệ" items={home.recent.slice(0, 12)} />
        <MangaRail label="Mới ra mắt" title="Truyện mới để thử ngay" items={home.recent.slice(4, 16)} />
        <MangaRail label="Đề xuất" title="Có thể hợp gu đọc của bạn" items={home.recommended.slice(0, 12)} />
        <MangaRail label="Thịnh hành" title="Được theo dõi nhiều" items={home.trending.slice(0, 12)} />
        <MangaRail label="Đã hoàn thành" title="Đọc liền mạch không phải chờ" items={completed.slice(0, 12)} />
        <MangaRail label="Action nổi bật" title="Nhịp nhanh, dễ vào truyện" items={action.slice(0, 12)} />
        <MangaRail label="Romance nhẹ nhàng" title="Cho buổi đọc chậm hơn" items={romance.slice(0, 12)} />
        <MangaRail label="Fantasy / Isekai" title="Rời khỏi đời thường một chút" items={fantasy.slice(0, 12)} />
      </div>
    </main>
  );
}
