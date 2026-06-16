import { ArrowRight, BookMarked, Clock3, Play } from "lucide-react";
import Link from "next/link";
import { MangaCover } from "@/components/manga-cover";
import { MangaRail } from "@/components/manga-rail";
import { getHome } from "@/lib/sources";
import { formatDate, truncate } from "@/lib/utils";

export const revalidate = 1800;

export default async function HomePage() {
  const home = await getHome();
  const featured = home.featured;

  return (
    <main>
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[minmax(280px,420px)_1fr] md:items-center md:py-16 lg:px-8">
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

      <section className="border-y border-border bg-foreground ink-on-dark">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 md:grid-cols-[240px_1fr_auto] md:items-center lg:px-8">
          <div className="flex items-center gap-3">
            <Clock3 size={18} />
            <span className="font-code text-[11px] uppercase">Đang đọc dở</span>
          </div>
          <p className="font-display text-2xl leading-tight ink-on-dark-soft">
            Đồng bộ lịch sử qua Supabase khi đăng nhập; nếu chưa có tài khoản, reader vẫn lưu tiến độ trên thiết bị này.
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold">
            Đăng nhập <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <MangaRail label="Mới cập nhật" title="Những chương vừa lên kệ" items={home.recent.slice(0, 12)} />
        <MangaRail label="Đề xuất" title="Có thể hợp gu đọc của bạn" items={home.recommended.slice(0, 12)} />
        <MangaRail label="Thịnh hành" title="Được theo dõi nhiều" items={home.trending.slice(0, 12)} />
      </div>
    </main>
  );
}
