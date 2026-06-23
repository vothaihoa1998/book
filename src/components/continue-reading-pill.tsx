"use client";

import { ArrowRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type HistoryRow = {
  manga_id: string;
  chapter_id: string;
  page_index?: number | null;
  scroll_percent?: number | null;
  updated_at?: string | null;
};

type ContinueReadingPillProps = {
  mangaId: string;
  title: string;
  cover?: string;
  history: HistoryRow;
};

/**
 * Phase H2: Floating "Continue reading" pill — fixed bottom-left trên mobile
 * (ẩn khi đang cuộn xuống để không che content). Hiện lại khi cuộn lên.
 * Desktop: hiện ở dưới hero, không fixed.
 */
export function ContinueReadingPill({ mangaId, title, cover, history }: ContinueReadingPillProps) {
  const [visible, setVisible] = useState(true);
  const [lastY, setLastY] = useState(0);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastY;
      // Show on scroll-up hoặc ở top, hide khi scroll down >200px
      if (y < 80) {
        setVisible(true);
      } else if (delta > 4) {
        setVisible(false);
      } else if (delta < -4) {
        setVisible(true);
      }
      setLastY(y);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastY]);

  const progress = Math.min(100, Math.max(0, history.scroll_percent ?? 0));
  const readChapter = history.chapter_id;
  const lastReadLabel = history.updated_at
    ? relativeTime(history.updated_at)
    : "";

  return (
    <div
      className="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 transition-all duration-300 sm:bottom-6"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
      }}
    >
      <Link
        href={`/read/${encodeURIComponent(readChapter)}`}
        className="pointer-events-auto group flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-background/95 p-2 shadow-[0_12px_40px_-12px_rgba(60,28,8,0.45)] backdrop-blur-md transition hover:border-input"
      >
        <span className="relative block aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-xl bg-surface-strong ring-1 ring-border">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-full w-full object-cover" />
          )}
          <span className="absolute inset-0 grid place-items-center bg-black/30">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-foreground text-background">
              <Play size={12} fill="currentColor" />
            </span>
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-code text-[9px] uppercase tracking-wider text-primary">
            <Pause size={9} className="text-primary" /> Tiếp tục đọc
          </p>
          <p className="mt-0.5 line-clamp-1 text-[13px] font-semibold text-foreground">{title}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-secondary">
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
            </div>
            <span className="font-code text-[9px] tabular-nums text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          {lastReadLabel && <p className="mt-0.5 text-[10px] text-muted-foreground">{lastReadLabel}</p>}
        </div>
        <span className="hidden h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground transition group-hover:bg-primary group-hover:text-primary-foreground sm:grid">
          <ArrowRight size={14} />
        </span>
      </Link>
    </div>
  );
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} ngày trước`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} tháng trước`;
  return `${Math.floor(mo / 12)} năm trước`;
}