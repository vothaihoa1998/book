import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { type Manga } from "@/lib/types";
import { MangaCard } from "./manga-card";

export function MangaRail({ label, title, items, href }: { label?: string; title: string; items: Manga[]; href?: string }) {
  if (!items.length) return null;

  return (
    <section aria-label={title} className="py-7 md:py-10">
      <div className="mb-4 flex items-end justify-between gap-4 md:mb-5">
        <div className="min-w-0">
          {label && <p className="eyebrow">{label}</p>}
          <h2 className="break-words text-2xl font-display font-medium leading-tight text-foreground md:text-3xl">
            {title}
          </h2>
        </div>
        {href && (
          <Link href={href} className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline-flex">
            Xem tất cả <ArrowRight size={14} />
          </Link>
        )}
      </div>
      <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:gap-4 md:mx-0 md:px-0">
        {items.map((manga, index) => (
          <div key={`${manga.source}-${manga.sourceId}-${index}`} className="w-[120px] shrink-0 snap-start sm:w-[150px] md:w-[168px]">
            <MangaCard manga={manga} compact />
          </div>
        ))}
      </div>
      {href && (
        <Link href={href} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:hidden">
          Xem tất cả <ArrowRight size={14} />
        </Link>
      )}
    </section>
  );
}
