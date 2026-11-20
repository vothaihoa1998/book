import Link from "next/link";
import { type Manga } from "@/lib/types";
import { MangaCover } from "./manga-cover";

export function MangaCard({ manga, compact = false, eager = false }: { manga: Manga; compact?: boolean; eager?: boolean }) {
  const year = manga.releaseYear;
  const hasChapter = Boolean(manga.lastChapter && manga.lastChapter.trim());
  const hasYear = typeof year === "number";
  // Only show the badge if we have at least one meaningful value; otherwise
  // the "? · ?" placeholder was visual noise on cards.
  const topBadgeContent = hasChapter || hasYear
    ? { left: hasChapter ? `Ch. ${manga.lastChapter}` : "", right: hasYear ? String(year) : "" }
    : undefined;

  return (
    <Link
      href={`/manga/${encodeURIComponent(manga.id)}`}
      className="group flex h-full min-w-0 flex-col rounded-[var(--radius-card)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <MangaCover
        decorative
        manga={manga}
        eager={eager}
        className="transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-lift)]"
        topBadgeContent={topBadgeContent}
      />
      <div className={compact ? "mt-3 flex flex-1 flex-col gap-1" : "mt-4 flex flex-1 flex-col gap-1.5"}>
        <h3 className="line-clamp-2 break-words font-ui text-[13px] font-medium leading-snug text-foreground sm:text-sm">
          {manga.title}
        </h3>
        {manga.genres.length > 0 && !compact && (
          <p className="line-clamp-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            {manga.genres.slice(0, 2).join(" · ")}
          </p>
        )}
      </div>
    </Link>
  );
}
