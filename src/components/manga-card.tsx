import Link from "next/link";
import { type Manga } from "@/lib/types";
import { Badge } from "@/components/ui/primitives";
import { MangaCover } from "./manga-cover";

const statusLabel = {
  ongoing: "Đang ra",
  completed: "Hoàn thành",
  hiatus: "Tạm nghỉ",
  cancelled: "Đã huỷ",
  unknown: "Chưa rõ",
};

export function MangaCard({ manga, compact = false, eager = false }: { manga: Manga; compact?: boolean; eager?: boolean }) {
  const chapterLabel = manga.lastChapter || "?";

  return (
    <Link href={`/manga/${encodeURIComponent(manga.id)}`} className="group flex h-full min-w-0 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
      <MangaCover manga={manga} eager={eager} className="hairline transition duration-200 group-hover:-translate-y-0.5" />
      <div className={compact ? "mt-3 flex flex-1 flex-col" : "mt-4 flex flex-1 flex-col"}>
        <h3 className="line-clamp-2 min-h-[2.65rem] font-ui text-[15px] font-bold leading-snug text-foreground md:text-base">{manga.title}</h3>
        <div className="mt-2 flex min-h-7 flex-nowrap items-center gap-1.5 overflow-hidden">
          <span className="shrink-0 whitespace-nowrap rounded-full bg-surface px-2.5 py-1 text-xs font-semibold leading-none text-muted">Ch. {chapterLabel}</span>
          <Badge className="min-w-0 shrink whitespace-nowrap px-2.5 py-1 text-xs font-semibold leading-none">
            {statusLabel[manga.status]}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
