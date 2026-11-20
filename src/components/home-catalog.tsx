"use client";

import { ArrowDownRight, ArrowLeft, ArrowRight, BookOpen, Grid2X2, List, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MangaCard } from "@/components/manga-card";
import { MangaCover } from "@/components/manga-cover";
import { SelectField } from "@/components/ui/select-field";
import { relativeTime } from "@/lib/format-time";
import { mangaFormatLabels, type Manga, type MangaFormat } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HomeCatalog({ recent, trending }: { recent: Manga[]; trending: Manga[] }) {
  const [format, setFormat] = useState<MangaFormat | "all">("all");
  const [grid, setGrid] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  useEffect(() => {
    const viewport = matchMedia("(max-width: 639px)");
    const resize = () => setPageSize(viewport.matches ? 3 : 6);
    const frame = requestAnimationFrame(resize);
    viewport.addEventListener("change", resize);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("change", resize);
    };
  }, []);
  const rail = useRef<HTMLDivElement>(null);
  const formats = (Object.keys(mangaFormatLabels) as MangaFormat[]).filter((value) => recent.some((item) => item.format === value));
  const matches = format === "all" ? recent : recent.filter((item) => item.format === format);
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  const activePage = Math.min(page, pages);
  const shown = matches.slice((activePage - 1) * pageSize, activePage * pageSize);

  function moveRail(direction: number) {
    const element = rail.current;
    if (element) element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="mt-8 space-y-10 md:mt-10 md:space-y-12">
      <section aria-labelledby="updates-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="updates-heading" className="font-display text-[2rem] leading-none sm:text-[2.5rem]">Mới cập nhật</h2>
          </div>
          <div className="flex items-center gap-2">
            {formats.length > 0 && (
              <SelectField
                aria-label="Lọc loại truyện mới cập nhật"
                value={format}
                className="w-fit"
                triggerClassName="h-9 min-w-32 w-fit rounded-lg bg-card px-2.5"
                options={[
                  { value: "all", label: "Mọi loại" },
                  ...formats.map((value) => ({ value, label: mangaFormatLabels[value] })),
                ]}
                onValueChange={(value) => {
                  if (value !== null && (value === "all" || Object.hasOwn(mangaFormatLabels, value))) {
                    setFormat(value as MangaFormat | "all");
                    setPage(1);
                  }
                }}
              />
            )}
            <div className="flex rounded-lg border border-border bg-card p-0.5" aria-label="Kiểu hiển thị">
              <button type="button" aria-label="Dạng danh sách" aria-pressed={!grid} onClick={() => setGrid(false)} className={cn("rounded-md p-2", !grid && "bg-secondary text-primary")}><List size={16} /></button>
              <button type="button" aria-label="Dạng lưới" aria-pressed={grid} onClick={() => setGrid(true)} className={cn("rounded-md p-2", grid && "bg-secondary text-primary")}><Grid2X2 size={16} /></button>
            </div>
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Chưa có truyện mới để hiển thị.
          </p>
        ) : grid ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {shown.map((item, index) => <MangaCard key={item.id} manga={item} compact eager={index < 3} />)}
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((item, index) => <UpdateCard key={item.id} manga={item} eager={index < 3} />)}
          </div>
        )}

        {pages > 1 && (
          <nav aria-label="Phân trang truyện mới" className="mt-3 flex items-center justify-end gap-3 text-sm">
            <button type="button" aria-label="Trang cập nhật trước" disabled={activePage <= 1} onClick={() => setPage(activePage - 1)} className="rounded-lg border border-border p-2 disabled:opacity-35"><ArrowLeft size={14} /></button>
            <span className="meta-mono" aria-live="polite">{activePage} / {pages}</span>
            <button type="button" aria-label="Trang cập nhật sau" disabled={activePage >= pages} onClick={() => setPage(activePage + 1)} className="rounded-lg border border-border p-2 disabled:opacity-35"><ArrowRight size={14} /></button>
          </nav>
        )}
      </section>

      <section aria-labelledby="popular-heading" className="rounded-2xl border border-border bg-card/55 px-3 pb-4 pt-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 id="popular-heading" className="flex items-center gap-2.5 font-display text-[1.85rem] leading-none sm:text-[2.25rem]">
              <TrendingUp className="text-primary" size={20} aria-hidden="true" /> Đang được theo dõi
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Theo lượt theo dõi trên MangaDex</p>
          </div>
          {trending.length > 0 && (
            <div className="flex gap-1.5">
              <button type="button" aria-label="Truyện phổ biến trước" onClick={() => moveRail(-1)} className="rounded-lg border border-border p-2.5 hover:bg-secondary"><ArrowLeft size={15} /></button>
              <button type="button" aria-label="Truyện phổ biến sau" onClick={() => moveRail(1)} className="rounded-lg border border-border p-2.5 hover:bg-secondary"><ArrowRight size={15} /></button>
            </div>
          )}
        </div>
        {trending.length ? (
          <div ref={rail} className="scrollbar-none flex snap-x gap-3 overflow-x-auto pb-2 sm:gap-4">
            {trending.map((manga, index) => (
              <div key={manga.id} className="w-[calc((100%-0.75rem)/2)] min-w-0 shrink-0 snap-start sm:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-5rem)/6)]">
                <MangaCard manga={manga} compact eager={index < 2} />
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">Hiện chưa có danh sách phù hợp.</p>}
      </section>
    </div>
  );
}

function UpdateCard({ manga, eager }: { manga: Manga; eager: boolean }) {
  return (
    <Link href={`/manga/${encodeURIComponent(manga.id)}`} className="group grid min-w-0 grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition hover:border-primary/40 sm:grid-cols-[64px_minmax(0,1fr)_auto]">
      <MangaCover decorative manga={manga} eager={eager} className="rounded-md" />
      <div className="min-w-0 space-y-1.5">
        <p className="meta-mono text-[10px]">{manga.format ? mangaFormatLabels[manga.format] : manga.source === "sample" ? "Mẫu" : manga.source === "mangadex" ? "MangaDex" : "OTruyen"}</p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{manga.title}</h3>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {manga.lastChapter && <span className="inline-flex items-center gap-1 text-primary"><BookOpen size={12} /> Ch. {manga.lastChapter}</span>}
          <span>{relativeTime(manga.updatedAt)}</span>
        </p>
      </div>
      <ArrowDownRight size={15} className="text-muted-foreground group-hover:text-primary" aria-hidden="true" />
    </Link>
  );
}
