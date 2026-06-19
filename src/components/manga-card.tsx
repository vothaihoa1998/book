import Link from "next/link";
import { type Manga } from "@/lib/types";
import { MangaCover } from "./manga-cover";

export function MangaCard({ manga, compact = false, eager = false }: { manga: Manga; compact?: boolean; eager?: boolean }) {
  const chapterLabel = manga.lastChapter || "?";
  const yearLabel = Number.isFinite(new Date(manga.updatedAt).getFullYear())
    ? String(new Date(manga.updatedAt).getFullYear())
    : "?";

  return (
    <Link href={`/manga/${encodeURIComponent(manga.id)}`} className="group flex h-full min-w-0 flex-col focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
      <MangaCover
        manga={manga}
        eager={eager}
        className="transition rounded-lg duration-200 group-hover:-translate-y-0.5"
        topBadgeContent={{ left: `Chapter ${chapterLabel}`, right: yearLabel }}
      />
      <div className={compact ? "mt-3 flex flex-1 flex-col" : "mt-4 flex flex-1 flex-col"}>
        <h3 className="line-clamp-2 min-h-[2.42rem] font-ui text-sm font-medium leading-snug text-foreground">{manga.title}</h3>
      </div>
    </Link>
  );
}
