"use client";

import { ArrowDownRight, BookOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { latestHistoryByManga } from "@/lib/library";
import { readRecentReading, type SavedReading } from "@/lib/reading-progress";

export function ContinueReadingPill({ history, userId }: { history: (SavedReading & { coverUrl: string })[]; userId: string | null }) {
  const [local, setLocal] = useState<SavedReading[]>([]);

  useEffect(() => {
    const load = () => setLocal(readRecentReading(userId));
    const frame = requestAnimationFrame(load);
    window.addEventListener("pageshow", load);
    window.addEventListener("storage", load);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pageshow", load);
      window.removeEventListener("storage", load);
    };
  }, [userId]);

  const items = latestHistoryByManga([...history, ...local]).slice(0, 3);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const knownCovers = new Map(history.map((item) => [item.manga_id, item.coverUrl]));
  const query = new URLSearchParams(items
    .filter((item) => !knownCovers.has(item.manga_id) && !Object.hasOwn(covers, item.manga_id))
    .map((item) => ["id", item.manga_id])).toString();

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    void fetch(`/api/public/cover?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const result: Record<string, string> = await response.json();
        if (!controller.signal.aborted) setCovers((previous) => ({ ...previous, ...result }));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [query]);

  if (!items.length) return null;

  return (
    <section aria-labelledby="continue-heading" className="mt-8">
      <h2 id="continue-heading" className="mb-3 text-lg font-semibold">Tiếp tục đọc</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const cover = knownCovers.get(item.manga_id) ?? covers[item.manga_id];
          return (
            <Link
              key={item.manga_id}
              href={`/read/${encodeURIComponent(item.chapter_id)}?resume=1`}
              className="group grid min-w-0 grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition hover:border-primary/40 sm:grid-cols-[64px_minmax(0,1fr)_auto]"
            >
              <span aria-hidden="true" className="relative grid aspect-[2/3] place-items-center overflow-hidden rounded-md bg-surface-strong text-primary">
                {cover ? <Image src={cover} alt="" fill sizes="(min-width: 640px) 64px, 58px" unoptimized className="object-cover" /> : <BookOpen size={18} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</span>
                <span className="mt-1.5 block text-xs text-muted-foreground">Trang {item.page_index + 1} · {Math.round(item.scroll_percent)}%</span>
              </span>
              <ArrowDownRight size={15} aria-hidden="true" className="text-muted-foreground group-hover:text-primary" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
