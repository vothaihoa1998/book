import Link from "next/link";
import { type Manga } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { MangaCover } from "./manga-cover";

export function MangaCard({ manga, compact = false }: { manga: Manga; compact?: boolean }) {
  return (
    <Link href={`/manga/${encodeURIComponent(manga.id)}`} className="group block min-w-0">
      <MangaCover manga={manga} className="hairline transition duration-200 group-hover:-translate-y-0.5" />
      <div className={compact ? "mt-3" : "mt-4"}>
        <h3 className="line-clamp-2 font-display text-xl font-semibold leading-tight text-foreground">{manga.title}</h3>
        <p className="mt-1 line-clamp-1 font-code text-[11px] uppercase text-muted">
          {manga.source} / {formatDate(manga.updatedAt)}
        </p>
      </div>
    </Link>
  );
}
