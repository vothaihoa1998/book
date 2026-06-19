import { ArrowRight } from "lucide-react";
import { type Manga } from "@/lib/types";
import { AppLinkButton } from "./ui/primitives";
import { MangaCard } from "./manga-card";

export function MangaRail({ label, title, items, href }: { label: string; title: string; items: Manga[]; href?: string }) {
  if (!items.length) return null;

  return (
    <section className="py-8 md:py-11">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted">{label}</p>
          <h2 className="mt-2 font-ui text-xl font-bold leading-tight tracking-normal md:text-2xl">{title}</h2>
        </div>
        {href && (
          <AppLinkButton href={href} variant="soft" size="sm" pill className="hidden sm:inline-flex">
            Xem tất cả <ArrowRight size={15} />
          </AppLinkButton>
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
        <AppLinkButton href={href} variant="soft" size="sm" pill className="mt-4 sm:hidden">
          Xem tất cả <ArrowRight size={15} />
        </AppLinkButton>
      )}
    </section>
  );
}
