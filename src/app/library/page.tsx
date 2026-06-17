import type { Metadata } from "next";
import { AlertTriangle, BookMarked, Clock3, Heart, LogIn, Play, Rows3, UserRound } from "lucide-react";
import Link from "next/link";
import { latestHistoryByManga } from "@/lib/library";
import { getManga } from "@/lib/sources";
import { createServerSupabaseClient, getVerifiedUser } from "@/lib/supabase/server";
import { type Json } from "@/lib/supabase/types";
import { type Manga, parseScopedId } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thư viện",
  description: "Bookmark, lịch sử đọc và truyện đang theo dõi của bạn trên InkRail.",
};

function storedManga(mangaId: string, value: Json | null): Manga {
  const parsed = parseScopedId(mangaId);
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<Manga> : {};
  return {
    id: mangaId,
    source: raw.source ?? parsed.source,
    sourceId: raw.sourceId ?? parsed.sourceId,
    slug: raw.slug ?? parsed.sourceId,
    title: raw.title ?? mangaId,
    altTitles: raw.altTitles ?? [],
    cover: raw.cover ?? null,
    author: raw.author ?? null,
    status: raw.status ?? "unknown",
    genres: raw.genres ?? [],
    description: raw.description ?? "",
    lastChapter: raw.lastChapter ?? null,
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    rating: raw.rating ?? null,
  };
}

export default async function LibraryPage() {
  const user = await getVerifiedUser();
  const supabase = await createServerSupabaseClient();

  if (!user || !supabase) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="font-code text-[11px] uppercase text-muted">Thư viện</p>
        <h1 className="mt-3 font-display text-5xl font-semibold leading-none md:text-7xl">Kệ đọc cá nhân</h1>
        <div className="mt-8 border border-border bg-surface p-6">
          <LogIn size={22} />
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
            Đăng nhập để đồng bộ bookmark, đang đọc và theo dõi. Khi chưa đăng nhập, reader vẫn lưu tiến độ trên thiết bị hiện tại.
          </p>
          <Link href="/login" className="mt-5 inline-flex h-11 items-center justify-center rounded-[8px] bg-foreground px-4 text-sm font-semibold ink-on-dark">
            Đăng nhập
          </Link>
        </div>
      </main>
    );
  }

  const [bookmarksResult, historyResult, followsResult] = await Promise.all([
    supabase.from("bookmarks").select("manga_id, manga, created_at").order("created_at", { ascending: false }).limit(60),
    supabase.from("reading_history").select("manga_id, chapter_id, page_index, scroll_percent, updated_at").order("updated_at", { ascending: false }).limit(80),
    supabase.from("follows").select("manga_id, manga, created_at").order("created_at", { ascending: false }).limit(60),
  ]);

  const latestHistory = latestHistoryByManga(historyResult.data ?? []).slice(0, 24);
  const historyManga = await Promise.all(latestHistory.map((item) => getManga(item.manga_id)));
  const bookmarks = (bookmarksResult.data ?? []).map((item) => ({ ...item, mangaData: storedManga(item.manga_id, item.manga) }));
  const follows = (followsResult.data ?? []).map((item) => ({ ...item, mangaData: storedManga(item.manga_id, item.manga) }));
  const errors = [bookmarksResult.error, historyResult.error, followsResult.error].filter(Boolean);
  const total = bookmarks.length + latestHistory.length + follows.length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
        <div>
          <p className="font-code text-[11px] uppercase text-muted">Thư viện</p>
          <h1 className="mt-3 font-display text-5xl font-semibold leading-none md:text-7xl">Kệ đọc của bạn</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted">
            Lịch sử chỉ hiện tập mới nhất của mỗi bộ, giúp bạn quay lại đọc nhanh mà không bị nhiễu bởi nhiều chapter cùng truyện.
          </p>
        </div>
        <aside className="grid grid-cols-3 gap-2 rounded-[8px] border border-border bg-surface p-3 text-center">
          <Stat label="Đang đọc" value={latestHistory.length} />
          <Stat label="Bookmark" value={bookmarks.length} />
          <Stat label="Theo dõi" value={follows.length} />
        </aside>
      </div>

      {errors.length > 0 && (
        <div className="mt-8 flex items-start gap-3 border border-border bg-surface p-4 text-sm leading-6 text-muted">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-foreground" />
          <p>Đã đăng nhập, nhưng chưa đọc được một phần dữ liệu thư viện. Lỗi đầu tiên: {errors[0]?.message}</p>
        </div>
      )}

      {total === 0 && errors.length === 0 && (
        <div className="mt-10 border-y border-border py-14 text-center">
          <Rows3 className="mx-auto text-muted" size={26} />
          <p className="mt-4 font-display text-3xl font-semibold">Kệ đọc còn trống</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">Bấm bookmark hoặc đọc một chương, mục này sẽ tự sáng lên.</p>
          <Link href="/discover" className="mt-5 inline-flex h-11 items-center justify-center rounded-[8px] bg-foreground px-4 text-sm font-semibold ink-on-dark">
            Khám phá truyện
          </Link>
        </div>
      )}

      <div className="mt-10 space-y-12">
        <section>
          <SectionTitle icon={<Clock3 size={18} />} title="Đang đọc" count={latestHistory.length} />
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {latestHistory.map((item, index) => (
              <ShelfCard
                key={item.manga_id}
                manga={historyManga[index]}
                href={`/read/${encodeURIComponent(item.chapter_id)}`}
                action="Đọc tiếp"
                meta={`Ch. ${item.chapter_id.split(":").at(-1)?.slice(0, 8) ?? "?"} · ${Math.round(Number(item.scroll_percent))}%`}
                progress={Number(item.scroll_percent)}
                icon={<Play size={15} fill="currentColor" />}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionTitle icon={<BookMarked size={18} />} title="Bookmark" count={bookmarks.length} />
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {bookmarks.map((item) => (
              <ShelfCard key={item.manga_id} manga={item.mangaData} href={`/manga/${encodeURIComponent(item.manga_id)}`} action="Mở truyện" meta={`Đã lưu · ${formatDate(item.created_at)}`} />
            ))}
          </div>
        </section>

        <section>
          <SectionTitle icon={<Heart size={18} />} title="Theo dõi" count={follows.length} />
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {follows.map((item) => (
              <ShelfCard key={item.manga_id} manga={item.mangaData} href={`/manga/${encodeURIComponent(item.manga_id)}`} action="Xem cập nhật" meta={`Theo dõi · ${formatDate(item.created_at)}`} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[8px] bg-background px-2 py-3">
      <p className="font-display text-2xl font-semibold">{value}</p>
      <p className="mt-1 font-code text-[10px] uppercase text-muted">{label}</p>
    </div>
  );
}

function SectionTitle({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
      <h2 className="flex items-center gap-2 font-display text-3xl font-semibold">{icon} {title}</h2>
      <span className="font-code text-[11px] uppercase text-muted">{count}</span>
    </div>
  );
}

function ShelfCard({ manga, href, action, meta, progress, icon }: { manga: Manga; href: string; action: string; meta: string; progress?: number; icon?: React.ReactNode }) {
  return (
    <Link href={href} className="group grid grid-cols-[82px_1fr] gap-4 rounded-[8px] border border-border bg-surface p-3 transition hover:border-foreground/30">
      <div className="relative aspect-[2/3] overflow-hidden rounded-[4px] bg-surface-strong">
        {manga.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={manga.cover} alt={manga.title} className="h-full w-full object-cover transition group-hover:scale-[1.03]" referrerPolicy="no-referrer" />
        ) : (
          <div className="grid h-full place-items-center text-muted"><UserRound size={22} /></div>
        )}
      </div>
      <div className="min-w-0 py-1">
        <p className="line-clamp-2 font-display text-xl font-semibold leading-tight">{manga.title}</p>
        <p className="mt-2 line-clamp-1 font-code text-[10px] uppercase text-muted">{meta}</p>
        {typeof progress === "number" && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-accent-2" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        )}
        <span className="mt-4 inline-flex h-9 items-center gap-2 rounded-[8px] bg-foreground px-3 text-sm font-semibold ink-on-dark">
          {icon} {action}
        </span>
      </div>
    </Link>
  );
}
