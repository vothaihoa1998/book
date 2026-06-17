import { type Manga } from "@/lib/types";
import { MangaCard } from "./manga-card";

export function MangaRail({ label, title, items }: { label: string; title: string; items: Manga[] }) {
  if (!items.length) return null;

  return (
    <section className="py-12 md:py-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-code text-[11px] uppercase text-muted">{label}</p>
          <h2 className="mt-2 font-display text-3xl font-semibold leading-tight md:text-4xl">{title}</h2>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((manga, index) => (
          <MangaCard key={`${manga.source}-${manga.sourceId}-${index}`} manga={manga} compact />
        ))}
      </div>
    </section>
  );
}
