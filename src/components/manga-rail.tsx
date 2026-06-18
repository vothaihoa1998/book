import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { type Manga } from "@/lib/types";
import { MangaCard } from "./manga-card";

export function MangaRail({ label, title, items, href }: { label: string; title: string; items: Manga[]; href?: string }) {
  if (!items.length) return null;

  return (
    <section className="py-8 md:py-11">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-code text-[11px] uppercase text-muted">{label}</p>
          <h2 className="mt-2 font-display text-3xl font-semibold leading-tight md:text-4xl">{title}</h2>
        </div>
        {href && (
          <Link href={href} className="hidden h-10 shrink-0 items-center gap-2 rounded-full bg-chip px-4 text-sm font-semibold text-chip-text transition hover:text-foreground sm:inline-flex">
            Xem tất cả <ArrowRight size={15} />
          </Link>
        )}
      </div>
      <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {items.map((manga, index) => (
          <div key={`${manga.source}-${manga.sourceId}-${index}`} className="w-[138px] shrink-0 snap-start sm:w-[158px] md:w-[176px]">
            <MangaCard manga={manga} compact />
          </div>
        ))}
      </div>
      {href && (
        <Link href={href} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-chip px-4 text-sm font-semibold text-chip-text transition hover:text-foreground sm:hidden">
          Xem tất cả <ArrowRight size={15} />
        </Link>
      )}
    </section>
  );
}
