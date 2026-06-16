import type { Metadata } from "next";
import { BookMarked, Clock3, Heart, LogIn } from "lucide-react";
import Link from "next/link";
import { createServerSupabaseClient, getVerifiedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thư viện",
  description: "Bookmark, lịch sử đọc và truyện đang theo dõi của bạn trên InkRail.",
};

export default async function LibraryPage() {
  const user = await getVerifiedUser();
  const supabase = await createServerSupabaseClient();

  if (!user || !supabase) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="font-code text-[11px] uppercase text-muted">Thư viện</p>
        <h1 className="mt-3 font-display text-5xl font-semibold leading-none md:text-7xl">Không gian đọc cá nhân</h1>
        <div className="mt-8 border border-border bg-surface p-6">
          <LogIn size={22} />
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
            Đăng nhập để đồng bộ bookmark, đang đọc và theo dõi. Nếu chưa cấu hình Supabase env, reader vẫn lưu tiến độ trong localStorage.
          </p>
          <Link href="/login" className="mt-5 inline-flex h-11 items-center justify-center rounded-[8px] bg-foreground px-4 text-sm font-semibold ink-on-dark">
            Đăng nhập
          </Link>
        </div>
      </main>
    );
  }

  const [{ data: bookmarks }, { data: history }, { data: follows }] = await Promise.all([
    supabase.from("bookmarks").select("manga_id, manga, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("reading_history").select("manga_id, chapter_id, page_index, scroll_percent, updated_at").order("updated_at", { ascending: false }).limit(20),
    supabase.from("follows").select("manga_id, manga, created_at").order("created_at", { ascending: false }).limit(20),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <p className="font-code text-[11px] uppercase text-muted">Thư viện</p>
      <h1 className="mt-3 font-display text-5xl font-semibold leading-none md:text-7xl">Kệ đọc của bạn</h1>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <LibraryPanel icon={<BookMarked size={18} />} title="Bookmark" count={bookmarks?.length ?? 0}>
          {(bookmarks ?? []).map((item) => (
            <LibraryRow key={item.manga_id} href={`/manga/${encodeURIComponent(item.manga_id)}`} title={String((item.manga as { title?: string } | null)?.title ?? item.manga_id)} meta="Đã lưu" />
          ))}
        </LibraryPanel>
        <LibraryPanel icon={<Clock3 size={18} />} title="Đang đọc" count={history?.length ?? 0}>
          {(history ?? []).map((item) => (
            <LibraryRow key={`${item.manga_id}-${item.chapter_id}`} href={`/read/${encodeURIComponent(item.chapter_id)}`} title={item.manga_id} meta={`Trang ${item.page_index + 1} / ${Math.round(Number(item.scroll_percent))}%`} />
          ))}
        </LibraryPanel>
        <LibraryPanel icon={<Heart size={18} />} title="Theo dõi" count={follows?.length ?? 0}>
          {(follows ?? []).map((item) => (
            <LibraryRow key={item.manga_id} href={`/manga/${encodeURIComponent(item.manga_id)}`} title={String((item.manga as { title?: string } | null)?.title ?? item.manga_id)} meta="Nhận cập nhật" />
          ))}
        </LibraryPanel>
      </div>
    </main>
  );
}

function LibraryPanel({ icon, title, count, children }: { icon: React.ReactNode; title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-3xl font-semibold">{icon} {title}</h2>
        <span className="font-code text-[11px] uppercase text-muted">{count}</span>
      </div>
      <div className="mt-5 divide-y divide-border border-y border-border">
        {count > 0 ? children : <p className="py-5 text-sm text-muted">Chưa có dữ liệu.</p>}
      </div>
    </section>
  );
}

function LibraryRow({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <Link href={href} className="block py-4 transition hover:bg-foreground/[0.03]">
      <p className="truncate text-sm font-semibold">{title}</p>
      <p className="mt-1 font-code text-[10px] uppercase text-muted">{meta}</p>
    </Link>
  );
}
