import Image from "next/image";
import { BookOpen } from "lucide-react";
import { type Manga } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MangaCover({ manga, priority = false, className }: { manga: Manga; priority?: boolean; className?: string }) {
  return (
    <div className={cn("grain relative aspect-[2/3] overflow-hidden rounded-[2px] bg-surface-strong", className)}>
      {manga.cover ? (
        <Image
          src={manga.cover}
          alt={`Bìa truyện ${manga.title}`}
          fill
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          sizes={priority ? "(min-width: 1024px) 420px, 72vw" : "(min-width: 1024px) 220px, 45vw"}
          className="object-cover transition duration-300 group-hover:scale-[1.025]"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted">
          <BookOpen size={36} strokeWidth={1.4} />
          <span className="font-display text-2xl font-semibold text-foreground">{manga.title}</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 border border-foreground/10" />
      {manga.lastChapter && (
        <div className="absolute bottom-2 left-2 right-2 border border-white/20 bg-foreground/82 px-2 py-1 font-code text-[10px] uppercase ink-on-dark backdrop-blur">
          Ch. {manga.lastChapter}
        </div>
      )}
    </div>
  );
}
