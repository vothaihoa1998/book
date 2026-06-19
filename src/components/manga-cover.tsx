import Image from "next/image";
import { BookOpen } from "lucide-react";
import { type Manga } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MangaCover({
  manga,
  priority = false,
  eager = false,
  className,
  showChapterBadge = false,
}: {
  manga: Manga;
  priority?: boolean;
  eager?: boolean;
  className?: string;
  showChapterBadge?: boolean;
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
      {showChapterBadge && manga.lastChapter && (
        <div className="meta-mono absolute bottom-2 left-2 right-2 rounded-[var(--radius-control)] bg-background/88 px-2.5 py-1 text-foreground backdrop-blur">
          Ch. {manga.lastChapter}
        </div>
      )}
    </div>
  );
}
