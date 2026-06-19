import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { type Manga } from "@/lib/types";
import { MangaCard } from "./manga-card";

export function MangaRail({ label, title, items, href }: { label: string; title: string; items: Manga[]; href?: string }) {
  if (!items.length) return null;

  return (
    <section className="py-8 md:py-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{label}</p>
          <h2 className="mt-2 section-title">{title}</h2>
        </div>
        {href && (
          <Link href={href} className="hidden items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline-flex">
            Xem tất cả <ArrowRight size={15} />
          </Link>
        )}
      </div>
      <div className="scrollbar-none flex snap-x gap-4 overflow-x-auto pb-3">
        {items.map((manga, index) => (
          <div key={`${manga.source}-${manga.sourceId}-${index}`} className="w-[142px] shrink-0 snap-start sm:w-[160px] md:w-[176px]">
            <MangaCard manga={manga} compact />
          </div>
        ))}
      </div>
      {href && (
        <Link href={href} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] text-sm font-medium text-muted-foreground transition hover:text-foreground sm:hidden">
          Xem tất cả <ArrowRight size={15} />
        </Link>
      )}
    </section>
  );
}
