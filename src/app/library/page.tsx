import type { Metadata } from "next";
import { AlertTriangle, BookMarked, Clock3, Heart, LogIn, Play, Rows3, UserRound } from "lucide-react";
import Link from "next/link";
import { latestHistoryByManga } from "@/lib/library";
import { getManga } from "@/lib/sources";
import { createServerSupabaseClient, getVerifiedUser } from "@/lib/supabase/server";
import { AlertState, AppLinkButton, EmptyState } from "@/components/ui/primitives";
import { type Json } from "@/lib/supabase/types";
import { type Manga, parseScopedId } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thư viện",
  description: "Bookmark, lịch sử đọc và truyện đang theo dõi của bạn trên InkRail.",
  robots: { index: false, follow: false },
};

type LibraryTab = "history" | "bookmarks" | "follows";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readTab(searchParams: Record<string, string | string[] | undefined>): LibraryTab {
  const value = searchParams.tab;
  const tab = Array.isArray(value) ? value[0] : value;
  return tab === "bookmarks" || tab === "follows" ? tab : "history";
}

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

export default async function LibraryPage({ searchParams }: Props) {
  const activeTab = readTab(await searchParams);
  const user = await getVerifiedUser();
  const supabase = await createServerSupabaseClient();

  if (!user || !supabase) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="eyebrow">Thư viện</p>
        <h1 className="mt-3 editorial-title text-5xl md:text-7xl">Kệ đọc cá nhân</h1>
        <div className="mt-8 rounded-[var(--radius-card)] border border-border bg-card p-6">
          <LogIn size={22} />
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            Đăng nhập để đồng bộ bookmark, đang đọc và theo dõi. Khi chưa đăng nhập, reader vẫn lưu tiến độ trên thiết bị hiện tại.
          </p>
          <AppLinkButton href="/login" className="mt-5">
            Đăng nhập
          </AppLinkButton>
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
  const activeCount = activeTab === "history" ? latestHistory.length : activeTab === "bookmarks" ? bookmarks.length : follows.length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-end">
        <div>
          <p className="eyebrow">Thư viện</p>
          <h1 className="mt-3 editorial-title text-5xl md:text-7xl">Kệ đọc của bạn</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">
            Lịch sử chỉ hiện tập mới nhất của mỗi bộ, giúp bạn quay lại đọc nhanh mà không bị nhiễu bởi nhiều chapter cùng truyện.
          </p>
        </div>
        <aside className="grid grid-cols-3 gap-2 rounded-[var(--radius-card)] border border-border bg-card p-3 text-center">
          <Stat label="Đang đọc" value={latestHistory.length} />
          <Stat label="Bookmark" value={bookmarks.length} />
          <Stat label="Theo dõi" value={follows.length} />
        </aside>
      </div>

      <nav className="scrollbar-none mt-8 flex gap-2 overflow-x-auto" aria-label="Chọn kệ đọc">
        <TabLink href="/library" active={activeTab === "history"} label="Đang đọc" count={latestHistory.length} />
        <TabLink href="/library?tab=bookmarks" active={activeTab === "bookmarks"} label="Bookmark" count={bookmarks.length} />
        <TabLink href="/library?tab=follows" active={activeTab === "follows"} label="Theo dõi" count={follows.length} />
      </nav>

      {errors.length > 0 && (
        <AlertState className="mt-8 flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-foreground" />
          <p>Đã đăng nhập, nhưng chưa đọc được một phần dữ liệu thư viện. Lỗi đầu tiên: {errors[0]?.message}</p>
        </AlertState>
      )}

      {total === 0 && errors.length === 0 && (
        <EmptyState title="Kệ đọc còn trống" icon={<Rows3 size={22} />} className="mt-10" action={(
          <AppLinkButton href="/discover">
            Khám phá truyện
          </AppLinkButton>
        )}>
          Bấm bookmark hoặc đọc một chương, mục này sẽ tự sáng lên.
        </EmptyState>
      )}

      {total > 0 && activeCount === 0 && errors.length === 0 && (
        <EmptyState title="Kệ này đang trống" icon={<Rows3 size={22} />} className="mt-10">
          Chuyển tab khác hoặc khám phá thêm truyện để lấp đầy mục này.
        </EmptyState>
      )}

      <div className="mt-8 space-y-12">
        {activeTab === "history" && latestHistory.length > 0 && <section>
          <SectionTitle icon={<Clock3 size={18} />} title="Đang đọc" count={latestHistory.length} />
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {latestHistory.map((item, index) => {
              const pct = Math.round(Number(item.scroll_percent));
              const chapterLabel = `Ch. ${item.chapter_id.split(":").at(-1)?.replace(/^[0-9a-f-]+/, "").slice(0, 4) ?? item.chapter_id.split(":").at(-1)?.slice(0, 6) ?? "?"}`;
              return (
                <ShelfCard
                  key={item.manga_id}
                  manga={historyManga[index]}
                  href={`/read/${encodeURIComponent(item.chapter_id)}`}
                  action={pct > 0 ? `Đọc tiếp · ${pct}%` : "Đọc tiếp"}
                  meta={`${chapterLabel} · cập nhật ${formatDate(item.updated_at)}`}
                  progress={Number(item.scroll_percent)}
                  icon={<Play size={15} fill="currentColor" />}
                />
              );
            })}
          </div>
        </section>}

        {activeTab === "bookmarks" && bookmarks.length > 0 && <section>
          <SectionTitle icon={<BookMarked size={18} />} title="Bookmark" count={bookmarks.length} />
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {bookmarks.map((item) => (
              <ShelfCard key={item.manga_id} manga={item.mangaData} href={`/manga/${encodeURIComponent(item.manga_id)}`} action="Mở truyện" meta={`Đã lưu · ${formatDate(item.created_at)}`} icon={<BookMarked size={15} />} />
            ))}
          </div>
        </section>}

        {activeTab === "follows" && follows.length > 0 && <section>
          <SectionTitle icon={<Heart size={18} />} title="Theo dõi" count={follows.length} />
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {follows.map((item) => (
              <ShelfCard key={item.manga_id} manga={item.mangaData} href={`/manga/${encodeURIComponent(item.manga_id)}`} action="Xem cập nhật" meta={`Theo dõi · ${formatDate(item.created_at)}`} icon={<Heart size={15} />} />
            ))}
          </div>
        </section>}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-background px-2 py-3">
      <p className="font-display text-2xl font-medium">{value}</p>
      <p className="meta-mono mt-1">{label}</p>
    </div>
  );
}

function TabLink({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      className={active
        ? "inline-flex h-11 shrink-0 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        : "inline-flex h-11 shrink-0 items-center gap-2 rounded-[var(--radius-control)] bg-secondary px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      }
    >
      {label} <span className="text-xs opacity-75">{count}</span>
    </Link>
  );
}

function SectionTitle({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
      <h2 className="flex items-center gap-2 section-title">{icon} {title}</h2>
      <span className="meta-mono">{count}</span>
    </div>
  );
}

function ShelfCard({ manga, href, action, meta, progress, icon }: { manga: Manga; href: string; action: string; meta: string; progress?: number; icon?: React.ReactNode }) {
  const pct = typeof progress === "number" ? Math.min(100, Math.max(0, progress)) : 0;
  const completed = typeof progress === "number" && progress >= 95;
  return (
    <Link
      href={href}
      className="group relative grid grid-cols-[82px_1fr] gap-4 overflow-hidden rounded-[var(--radius-card)] border border-border bg-card p-3 transition hover:border-input hover:shadow-[var(--shadow-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius-control)] bg-surface-strong ring-1 ring-border/40">
        {manga.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={manga.cover} alt={manga.title} className="h-full w-full object-cover transition group-hover:scale-[1.04]" referrerPolicy="no-referrer" />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground"><UserRound size={22} /></div>
        )}
        {completed && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white">
            Hoàn thành
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col py-0.5">
        <p className="line-clamp-2 break-words text-sm font-medium leading-[1.375]">{manga.title}</p>
        <p className="meta-mono mt-1.5 line-clamp-2 break-words">{meta}</p>
        {typeof progress === "number" && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Tiến độ</span>
              <span className="tabular-nums font-medium text-foreground">{Math.round(pct)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className={completed ? "h-full rounded-full bg-accent-2" : "h-full rounded-full bg-primary transition-[width] duration-300"}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
        <span className="mt-3 inline-flex h-9 w-fit items-center gap-2 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)]">
          {icon} {action}
        </span>
      </div>
    </Link>
  );
}
