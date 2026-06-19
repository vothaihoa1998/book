import Image from "next/image";
import { BookOpen } from "lucide-react";
import { type Manga } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MangaCover({
  manga,
  priority = false,
  eager = false,
  className,
  topBadgeContent,
}: {
  manga: Manga;
  priority?: boolean;
  eager?: boolean;
  className?: string;
  topBadgeContent?: { left: string; right: string };
}) {
  return (
    <div className={cn("grain relative aspect-[2/3] overflow-hidden rounded-[2px] bg-surface-strong", className)}>
      {manga.cover ? (
        <Image
          src={manga.cover}
          alt={`Bìa truyện ${manga.title}`}
          fill
          preload={priority}
          loading={priority ? undefined : eager ? "eager" : "lazy"}
          sizes={priority ? "(min-width: 1024px) 420px, 72vw" : "(min-width: 1024px) 220px, 45vw"}
          className="object-cover transition duration-300 group-hover:scale-[1.025]"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
          <BookOpen size={36} strokeWidth={1.4} />
          <span className="font-display text-2xl font-medium text-foreground">{manga.title}</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 border border-foreground/10" />
      {topBadgeContent && (
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
          <span className="meta-mono min-w-0 rounded-[var(--radius-control)] bg-background/88 px-2.5 py-1 text-foreground backdrop-blur">
            {topBadgeContent.left}
          </span>
          <span className="meta-mono min-w-0 rounded-[var(--radius-control)] bg-background/88 px-2.5 py-1 text-foreground backdrop-blur text-right">
            {topBadgeContent.right}
          </span>
        </div>
      )}
    </div>
  );
}
