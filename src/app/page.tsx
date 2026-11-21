import { Compass } from "lucide-react";
import Link from "next/link";
import { ContinueReadingPill } from "@/components/continue-reading-pill";
import { HomeCatalog } from "@/components/home-catalog";
import { MangaRail } from "@/components/manga-rail";
import { filterHomeFeed, getContentPreferences } from "@/lib/content-preferences";
import { latestHistoryByManga } from "@/lib/library";
import { getHome, getHomeCollections, getManga } from "@/lib/sources";
import { createServerSupabaseClient, getVerifiedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [home, collections, prefs, user, supabase] = await Promise.all([
    getHome(), getHomeCollections(), getContentPreferences(), getVerifiedUser(), createServerSupabaseClient(),
  ]);
  const history = user && supabase
    ? await supabase.from("reading_history").select("manga_id, chapter_id, page_index, scroll_percent, updated_at")
      .order("updated_at", { ascending: false }).limit(24)
    : null;
  const latest = latestHistoryByManga(history?.data ?? []).slice(0, 3);
  const reading = (await Promise.all(latest.map(async (item) => {
    const manga = await getManga(item.manga_id);
    return manga ? { ...item, title: manga.title } : null;
  }))).filter((item) => item !== null);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-7 sm:px-6 md:pb-12 md:pt-10">
      <header className="hidden flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-border pb-5">
        <h1 className="font-display text-[2.9rem] font-medium leading-[0.88] tracking-tight sm:text-6xl">Kệ truyện</h1>
        <Link href="/discover" className="inline-flex items-center gap-2 rounded-full bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-85">
          <Compass size={16} /> Khám phá
        </Link>
      </header>

      <ContinueReadingPill key={user?.id ?? "guest"} userId={user?.id ?? null} history={reading} />
      <nav aria-label="Khám phá theo thể loại" className="mt-6 flex flex-wrap gap-2">
        {[
          ["action", "Hành động"],
          ["fantasy", "Fantasy"],
          ["romance", "Tình cảm"],
          ["comedy", "Hài hước"],
          ["isekai", "Isekai"],
          ["horror", "Kinh dị"],
        ].map(([genre, label]) => (
          <Link key={genre} href={`/discover?genres=${genre}`} className="rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium transition hover:border-primary/50 hover:text-primary">
            {label}
          </Link>
        ))}
      </nav>
      <HomeCatalog recent={filterHomeFeed(home.recent, prefs)} trending={filterHomeFeed(home.trending, prefs)} />
      {collections.map((collection) => (
        <MangaRail key={collection.id} title={collection.title} href={collection.href} items={filterHomeFeed(collection.items, prefs)} />
      ))}

    </main>
  );
}
