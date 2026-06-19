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
        <h3 className="line-clamp-2 min-h-[2.42rem] font-ui text-sm font-medium leading-[1.375] text-foreground">{manga.title}</h3>
        <div className="mt-2 flex min-h-6 flex-nowrap items-center gap-1.5 overflow-hidden">
          <span className="meta-mono shrink-0 whitespace-nowrap rounded-[var(--radius-control)] bg-secondary px-2 py-1">Ch. {chapterLabel}</span>
          <Badge className="min-w-0 shrink whitespace-nowrap">
            {statusLabel[manga.status]}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
