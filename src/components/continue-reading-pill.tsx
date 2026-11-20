"use client";

import { ArrowUpRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { latestHistoryByManga } from "@/lib/library";
import { readRecentReading, type SavedReading } from "@/lib/reading-progress";

export function ContinueReadingPill({ history, userId }: { history: SavedReading[]; userId: string | null }) {
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
  if (!items.length) return null;

  return (
    <section aria-labelledby="continue-heading" className="mt-8">
      <h2 id="continue-heading" className="mb-3 text-lg font-semibold">Tiếp tục đọc</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.manga_id}
            href={`/read/${encodeURIComponent(item.chapter_id)}?resume=1`}
            className="group flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-primary/40"
          >
            <BookOpen className="shrink-0 text-primary" size={18} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{item.title}</span>
              <span className="meta-mono">Trang {item.page_index + 1} · {Math.round(item.scroll_percent)}%</span>
            </span>
            <ArrowUpRight size={16} className="shrink-0 text-muted-foreground group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </section>
  );
}
