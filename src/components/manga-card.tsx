import Link from "next/link";
import { type Manga } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { MangaCover } from "./manga-cover";

const statusLabel = {
  ongoing: "Đang ra",
  completed: "Hoàn thành",
  hiatus: "Tạm nghỉ",
  cancelled: "Đã huỷ",
  unknown: "Chưa rõ",
};

export function MangaCard({ manga, compact = false }: { manga: Manga; compact?: boolean }) {
  return (
    <Link href={`/manga/${encodeURIComponent(manga.id)}`} className="group block min-w-0">
      <MangaCover manga={manga} className="hairline transition duration-200 group-hover:-translate-y-0.5" />
      <div className={compact ? "mt-3" : "mt-4"}>
        <h3 className="line-clamp-2 font-display text-lg font-semibold leading-tight text-foreground md:text-xl">{manga.title}</h3>
        <p className="mt-1 line-clamp-1 text-xs text-muted">
          Ch. {manga.lastChapter ?? "?"} · {formatDate(manga.updatedAt)}
        </p>
        <p className="mt-2 inline-flex rounded-full bg-chip px-2.5 py-1 text-[11px] font-medium text-chip-text">
          {statusLabel[manga.status]}
        </p>
      </div>
    </Link>
  );
}
