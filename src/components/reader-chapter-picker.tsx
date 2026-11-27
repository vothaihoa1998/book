"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, LocateFixed } from "lucide-react";
import { Sheet } from "./ui/sheet";
import { preferredChapter, type ChapterGroup } from "@/lib/reader-navigation";
import type { Chapter } from "@/lib/types";

const WINDOW = 50;
export function ReaderChapterPicker({ open, onClose, groups, chapter }: {
  open: boolean; onClose: () => void; groups: ChapterGroup[]; chapter: Chapter;
}) {
  const [query, setQuery] = useState("");
  const currentIndex = groups.findIndex(g => g.versions.some(c => c.id === chapter.id));
  const [offset, setOffset] = useState(Math.max(0, currentIndex - 12));
  const activeRef = useRef<HTMLLIElement>(null);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("vi");
    return q ? groups.filter(g => g.number.includes(q) || g.versions.some(c => c.title?.toLocaleLowerCase("vi").includes(q))) : groups;
  }, [groups, query]);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => centerCurrentChapter(activeRef.current));
    return () => cancelAnimationFrame(frame);
  }, [open, offset]);
  function current() {
    setQuery(""); setOffset(Math.max(0, currentIndex - 12));
    requestAnimationFrame(() => centerCurrentChapter(activeRef.current));
  }
  return <Sheet open={open} onClose={onClose} ariaLabel="Danh sách chương" placement="responsive-right" maxHeightClass="h-[85dvh]">
    <div className="sticky -top-1 z-10 bg-background pb-4 pt-2">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Đang đọc chương {chapter.number} · {chapter.language.toUpperCase()}</p>
      <h2 className="mt-1 text-xl font-semibold">Danh sách chương</h2>
      <label className="mt-4 flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-3">
        <Search size={18} className="text-muted-foreground" />
        <input aria-label="Tìm số hoặc tên chương" placeholder="Tìm số hoặc tên chương…" value={query} onChange={e => { setQuery(e.target.value); setOffset(0); }} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" />
      </label>
      <button onClick={current} className="mt-2 flex min-h-11 items-center gap-2 text-sm font-medium text-primary"><LocateFixed size={16} /> Về chương đang đọc</button>
      <p role="status" className="text-xs text-muted-foreground">{filtered.length} chương · {chapter.group ?? "Chưa có thông tin nhóm dịch"}</p>
    </div>
    {offset > 0 && <button className="min-h-11 w-full rounded-lg border border-border text-sm" onClick={() => setOffset(Math.max(0, offset - WINDOW))}>Xem các chương trước</button>}
    <ul className="divide-y divide-border pb-3">
      {filtered.slice(offset, offset + WINDOW).map(group => {
        const item = preferredChapter(group, chapter)!;
        const active = group.versions.some(c => c.id === chapter.id);
        return <li key={group.key} ref={active ? activeRef : undefined} className="py-1.5">
          <Link href={`/read/${encodeURIComponent(item.id)}`} prefetch={false} aria-current={active ? "page" : undefined}
            className={`block min-h-14 rounded-xl px-3 py-3 ${active ? "bg-primary/10 text-primary" : "hover:bg-secondary"}`}>
            <span className="flex items-center justify-between gap-2 text-sm font-semibold">Chương {group.number}{active && <span className="text-xs">Đang đọc</span>}</span>
            {item.title && <span className="mt-1 block truncate text-xs text-muted-foreground">{item.title}</span>}
            <span className="mt-1 block text-xs text-muted-foreground">{item.group ?? "Không rõ nhóm dịch"}{item.externalUrl ? " · Trang nhà phát hành ↗" : ""}</span>
          </Link>
          {group.versions.length > 1 && <details className="px-3 pb-2 text-xs">
            <summary className="min-h-11 cursor-pointer py-3 text-muted-foreground">{group.versions.length} bản dịch · Chọn bản khác</summary>
            <div className="space-y-1">{group.versions.map(version => <Link key={version.id} href={`/read/${encodeURIComponent(version.id)}`} prefetch={false} className="block min-h-11 rounded-lg bg-secondary px-3 py-3" aria-current={version.id === chapter.id ? "page" : undefined}>{version.group ?? "Không rõ nhóm dịch"} · {version.title ?? `Chương ${version.number}`}{version.id === chapter.id ? " · Đang đọc" : ""}</Link>)}</div>
          </details>}
        </li>;
      })}
    </ul>
    {!filtered.length && <p className="py-10 text-center text-sm text-muted-foreground">Không tìm thấy chương phù hợp.</p>}
    {offset + WINDOW < filtered.length && <button className="mb-4 min-h-11 w-full rounded-lg border border-border text-sm" onClick={() => setOffset(offset + WINDOW)}>Xem các chương tiếp theo</button>}
  </Sheet>;
}

function centerCurrentChapter(item: HTMLLIElement | null) {
  const scroller = item?.closest<HTMLElement>("[data-sheet-content]");
  if (!item || !scroller) return;
  scroller.scrollTop += item.getBoundingClientRect().top - scroller.getBoundingClientRect().top
    - (scroller.clientHeight - item.offsetHeight) / 2;
}
