import { ArrowRight, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { ContinueReadingPill } from "@/components/continue-reading-pill";
import { MangaCard } from "@/components/manga-card";
import { Badge } from "@/components/ui/primitives";
import { homeSections, type HomeSection } from "@/lib/home-sections";
import { latestHistoryByManga } from "@/lib/library";
import { getHome, getManga } from "@/lib/sources";
import { createServerSupabaseClient, getVerifiedUser } from "@/lib/supabase/server";
import { type Manga } from "@/lib/types";
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
  const topContinue = continueItems[0]
    ? { manga: continueItems[0], history: latestHistory[0] }
    : null;

  return (
    <main>
      <HeroFeatured featured={featured} />

      {topContinue && <ContinueReadingPill mangaId={topContinue.manga.id} title={topContinue.manga.title} cover={topContinue.manga.cover} history={topContinue.history} />}

      <div className="mx-auto max-w-7xl space-y-4 px-4 sm:px-6 sm:space-y-6 lg:px-8">
        {homeSections.map((section) => {
          const items = pickItems(section, home, continueItems);
          if (!items.length) return null;
          return <SectionVariant key={section.id} section={section} items={items} />;
        })}
      </div>
    </main>
  );
}

function HeroFeatured({ featured }: { featured: ReturnType<typeof getHome> extends Promise<infer T> ? T extends { featured: infer F } ? F : never : never }) {
  return (
      <section className="relative overflow-hidden border-b border-border bg-card/40">
      {/* Decorative grid bg */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,theme(colors.primary/12),transparent_60%)]" />
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-6 sm:px-6 sm:py-10 md:grid-cols-[1fr_minmax(0,1.4fr)] md:gap-10 md:py-16 lg:px-8">
        {/* Cover - bigger on mobile, fills left half on desktop */}
        <Link
          href={`/manga/${encodeURIComponent(featured.id)}`}
          className="group relative mx-auto block aspect-[2/3] w-44 overflow-hidden rounded-[var(--radius-card)] bg-surface-strong shadow-[0_24px_60px_-20px_rgba(60,28,8,0.35)] sm:w-56 md:mx-0 md:aspect-[5/6] md:w-auto md:self-stretch"
        >
          {featured.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={featured.cover}
              alt={featured.title}
              loading="eager"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          )}
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-foreground/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-background backdrop-blur-sm sm:left-3 sm:top-3 sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[10px]">
            <Sparkles size={9} className="text-primary sm:hidden" />
            <Sparkles size={11} className="text-primary hidden sm:inline" />
            Hôm nay
          </span>
        </Link>

        <div className="flex flex-col justify-center md:py-4">
          <p className="flex items-center gap-2 font-code text-[11px] uppercase tracking-[2px] text-primary">
            <span className="inline-block h-px w-6 bg-primary" />
            Đang nổi bật
            <span className="text-muted-foreground/60">/</span>
            <span className="text-muted-foreground">{featured.source}</span>
          </p>
          <h1 className="mt-3 break-words font-display text-3xl font-medium leading-[0.98] text-foreground sm:mt-4 sm:text-5xl sm:leading-[0.98] md:text-6xl md:leading-[0.96] lg:text-[5.5rem] lg:leading-[0.92]">
            {featured.title}
          </h1>
          {featured.description && (
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:mt-5 sm:line-clamp-3 sm:text-base md:text-lg">
              {truncate(featured.description, 220)}
            </p>
          )}
          {featured.genres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5 sm:mt-5">
              {featured.genres.slice(0, 4).map((genre) => (
                <Badge key={genre}>{genre}</Badge>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
            <Link
              href={`/manga/${encodeURIComponent(featured.id)}`}
              className="ink-cta inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold"
            >
              <Play size={15} fill="currentColor" /> Bắt đầu đọc
            </Link>
            <Link
              href="/discover"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              Khám phá thêm <ArrowRight size={14} />
            </Link>
          </div>

          <dl className="mt-6 grid grid-cols-3 gap-x-4 border-t border-border pt-5 sm:mt-8 sm:max-w-md">
            <div>
              <dt className="font-code text-[10px] uppercase tracking-wider text-muted-foreground">Chương mới</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">{featured.lastChapter ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-code text-[10px] uppercase tracking-wider text-muted-foreground">Cập nhật</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">{formatDate(featured.updatedAt)}</dd>
            </div>
            <div>
              <dt className="font-code text-[10px] uppercase tracking-wider text-muted-foreground">Điểm</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">{featured.rating ? featured.rating.toFixed(1) : "—"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

function pickItems(section: HomeSection, home: Awaited<ReturnType<typeof getHome>>, continueItems: Array<Awaited<ReturnType<typeof getManga>>>) {
  switch (section.id) {
    case "continue":
      return continueItems.filter(Boolean);
    case "trending":
      return home.trending.slice(0, section.count);
    case "recent":
      return home.recent.slice(0, section.count);
    case "new":
      return home.recent.slice(6, 6 + section.count);
    case "completed":
      return [...home.trending, ...home.recent, ...home.recommended].filter((m) => m.status === "completed").slice(0, section.count);
    case "recommended":
      return home.recommended.slice(0, section.count);
    default:
      return [];
  }
}

function SectionVariant({ section, items }: { section: HomeSection; items: Manga[] }) {
  if (section.variant === "ranked") return <RankedSection section={section} items={items} />;
  if (section.variant === "editorial") return <EditorialSection section={section} items={items} />;
  return <RailSection section={section} items={items} />;
}

function RailSection({ section, items }: { section: HomeSection; items: Manga[] }) {
  return (
    <section className="py-6 md:py-8">
      <SectionHeader section={section} />
      <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 md:mx-0 md:px-0">
        {items.map((manga, i) => (
          <div key={`${manga.source}-${manga.sourceId}-${i}`} className="w-[124px] shrink-0 snap-start sm:w-[148px] md:w-[168px]">
            <MangaCard manga={manga} compact />
          </div>
        ))}
      </div>
    </section>
  );
}

function RankedSection({ section, items }: { section: HomeSection; items: Manga[] }) {
  return (
    <section className="py-6 md:py-8">
      <SectionHeader section={section} />
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.slice(0, 8).map((manga, index) => (
          <li key={`${manga.source}-${manga.sourceId}-${index}`}>
            <Link
              href={`/manga/${encodeURIComponent(manga.id)}`}
              className="group relative flex items-center gap-3 overflow-hidden rounded-[var(--radius-card)] border border-border bg-card p-2 transition hover:border-input hover:bg-card/80"
            >
              <span className="font-display text-3xl font-bold leading-none tabular-nums text-muted-foreground/40 sm:text-4xl">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="relative block aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-surface-strong ring-1 ring-border">
                {manga.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={manga.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-1 break-words text-[13px] font-semibold text-foreground">{manga.title}</h3>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                  {manga.author ?? "—"} {manga.lastChapter ? `· Ch.${manga.lastChapter}` : ""}
                </p>
                {manga.rating && (
                  <p className="mt-0.5 font-code text-[10px] font-semibold text-primary">★ {manga.rating.toFixed(1)}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function EditorialSection({ section, items }: { section: HomeSection; items: Manga[] }) {
  const main = items[0];
  const rest = items.slice(1, 5);
  if (!main) return null;

  return (
    <section className="py-6 md:py-8">
      <SectionHeader section={section} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr]">
        <Link
          href={`/manga/${encodeURIComponent(main.id)}`}
          className="group relative block aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-surface-strong sm:aspect-[5/4]"
        >
          {main.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={main.cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 sm:p-5">
            <p className="font-code text-[10px] uppercase tracking-wider text-primary-foreground/70">{main.source}</p>
            <h3 className="mt-1 line-clamp-2 text-lg font-semibold text-white sm:text-xl">{main.title}</h3>
            <p className="mt-1 line-clamp-2 text-[12px] text-white/75">{truncate(main.description ?? "", 120)}</p>
          </div>
        </Link>
        <ul className="flex flex-col gap-2">
          {rest.map((manga, i) => (
            <li key={`${manga.source}-${manga.sourceId}-${i}`} className="flex-1">
              <Link
                href={`/manga/${encodeURIComponent(manga.id)}`}
                className="group flex h-full gap-3 rounded-[var(--radius-card)] border border-border bg-card p-2.5 transition hover:border-input hover:bg-card/80"
              >
                <span className="relative block aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-surface-strong ring-1 ring-border">
                  {manga.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={manga.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-[13px] font-semibold text-foreground">{manga.title}</h3>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{truncate(manga.description ?? "", 80)}</p>
                  {manga.rating && (
                    <p className="mt-1 font-code text-[10px] font-semibold text-primary">★ {manga.rating.toFixed(1)}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SectionHeader({ section }: { section: HomeSection }) {
  const Icon = section.icon;
  return (
    <div className="mb-4 flex items-end justify-between gap-4 md:mb-5">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-code text-[10px] uppercase tracking-[2px] text-muted-foreground">
          {Icon && <Icon size={12} className="text-primary" />} {section.label}
        </p>
        <h2 className="mt-1.5 break-words font-display text-2xl font-medium leading-tight text-foreground md:text-3xl">
          {section.title}
        </h2>
      </div>
      {section.href && (
        <Link
          href={section.href}
          className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline-flex"
        >
          Xem tất cả <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}