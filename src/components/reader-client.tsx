"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowLeft, ArrowRight, Bookmark, ChevronLeft, ChevronRight, Download, List,
  Maximize, Settings2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Sheet } from "@/components/ui/sheet";
import { SelectField } from "@/components/ui/select-field";
import { defaultReaderPrefs, orderChapters, resolveReaderLayout } from "@/lib/reader-presets";
import { readPosition, savePosition, type ReaderPosition } from "@/lib/reading-progress";
import { imageProxyUrl, type Chapter, type Manga, type ReaderPrefs } from "@/lib/types";
import { cn } from "@/lib/utils";

const themes = {
  "warm-light": "Sáng dịu",
  paper: "Giấy",
  sepia: "Sepia",
  "graphite-dark": "Graphite",
  "pure-black": "OLED",
};
const layouts = { auto: "Tự động", single: "Một trang", double: "Hai trang", strip: "Cuộn dọc" };
const directions = { vertical: "Tự động", "horizontal-ltr": "Trái sang phải", "horizontal-rtl": "Phải sang trái" };
const fits = { width: "Vừa chiều rộng", height: "Vừa chiều cao", smart: "Vừa màn hình", original: "Kích thước gốc" };

type ReaderProps = {
  manga: Manga;
  chapter: Chapter;
  chapters: Chapter[];
  userId: string | null;
  syncedPosition: ReaderPosition | null;
  syncedPrefs: ReaderPrefs | null;
  initialAppTheme: "light" | "dark";
  resume: boolean;
};

function chapterHref(chapter: Chapter) {
  return `/read/${encodeURIComponent(chapter.id)}`;
}

function storedPrefs(key: string, legacyKey: string, fallback: ReaderPrefs) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as ReaderPrefs;
    const legacyDirection = localStorage.getItem(legacyKey);
    const direction = Object.hasOwn(directions, legacyDirection ?? "") && !saved.layout
      ? legacyDirection as ReaderPrefs["direction"] : saved.direction;
    return {
      theme: Object.hasOwn(themes, saved.theme) ? saved.theme : fallback.theme,
      direction: Object.hasOwn(directions, direction) ? direction : fallback.direction,
      layout: Object.hasOwn(layouts, saved.layout ?? "") ? saved.layout : undefined,
      fit: Object.hasOwn(fits, saved.fit) ? saved.fit : fallback.fit,
      brightness: Number.isFinite(saved.brightness) ? saved.brightness : fallback.brightness,
      gap: Number.isFinite(saved.gap) ? saved.gap : fallback.gap,
      fontSize: Number.isFinite(saved.fontSize) ? saved.fontSize : fallback.fontSize,
    };
  } catch {
    return fallback;
  }
}

export function ReaderClient({ manga, chapter, chapters, userId, syncedPosition, syncedPrefs, initialAppTheme, resume }: ReaderProps) {
  const total = chapter.pages.length;
  const prefsKey = userId ? `inkrail-reader-prefs:${userId}` : "inkrail-reader-prefs";
  const [prefs, setPrefs] = useState(() => syncedPrefs ?? defaultReaderPrefs(initialAppTheme === "dark"));
  const [ready, setReady] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [page, setPage] = useState(0);
  const [pageTurn, setPageTurn] = useState<"forward" | "backward" | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [panel, setPanel] = useState<"chapters" | "settings" | null>(null);
  const [endReached, setEndReached] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState<"bookmark" | "offline" | null>(null);
  const [failedPage, setFailedPage] = useState<number[]>([]);
  const [attempts, setAttempts] = useState<Record<number, number>>({});
  const controlsVisible = useRef(true);
  const controlsShownAt = useRef(Number.NEGATIVE_INFINITY);
  const pageRefs = useRef<Array<HTMLElement | null>>([]);
  const pendingJump = useRef<ReaderPosition | null>(null);
  const restoring = useRef(true);
  const lastPosition = useRef<ReaderPosition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const syncQueue = useRef(Promise.resolve());
  const preferencesQueue = useRef(Promise.resolve());
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const updateControlsVisibility = useCallback((visible: boolean) => {
    if (controlsVisible.current === visible) return;
    controlsVisible.current = visible;
    if (visible) controlsShownAt.current = performance.now();
    setShowControls(visible);
  }, []);

  const layout = resolveReaderLayout(prefs, manga, chapter, narrow);
  const strip = layout === "strip";
  const fitSpread = !strip && prefs.fit !== "width";
  const step = layout === "double" ? 2 : 1;
  const start = Math.floor(page / step) * step;
  const end = Math.min(total, start + step);
  const rtl = prefs.direction === "horizontal-rtl";
  const { sequence, prev, next } = useMemo(() => {
    const available = chapters.filter((item) => item.language === chapter.language && item.id !== chapter.id);
    const sequence = orderChapters([...available, chapter]);
    const index = sequence.findIndex((item) => item.id === chapter.id);
    return {
      sequence,
      prev: sequence.slice(0, index).reverse().find((item) => item.number !== chapter.number),
      next: sequence.slice(index + 1).find((item) => item.number !== chapter.number),
    };
  }, [chapter, chapters]);
  const pageUrls = useMemo(() => chapter.pages.map((image) => imageProxyUrl(image.url, chapter.source)), [chapter]);
  const seriesHref = `/manga/${encodeURIComponent(manga.id)}?lang=${encodeURIComponent(chapter.language)}#chapters`;
  const pagesToShow = strip ? chapter.pages : chapter.pages.slice(start, end);

  useEffect(() => {
    const viewport = window.matchMedia("(max-width: 767px)");
    const frame = requestAnimationFrame(() => {
      setNarrow(viewport.matches);
      if (!syncedPrefs) setPrefs(storedPrefs(prefsKey, `inkrail-reader-direction:${chapter.id}`, defaultReaderPrefs(initialAppTheme === "dark")));
      const local = readPosition(chapter.id, userId);
      const localTime = Date.parse(local?.updatedAt ?? "") || 0;
      const serverTime = Date.parse(syncedPosition?.updatedAt ?? "") || 0;
      const position = local && (!syncedPosition || localTime >= serverTime) ? local : syncedPosition;
      if (position && (resume || position.pageIndex > 0 || position.scrollPercent > 0)) {
        pendingJump.current = { ...position, pageIndex: Math.min(total - 1, Math.max(0, Math.floor(position.pageIndex))) };
        setPage(pendingJump.current.pageIndex);
      } else {
        pendingJump.current = { pageIndex: 0, scrollPercent: 0 };
      }
      setReady(true);
    });
    const onResize = () => {
      if (lastPosition.current) pendingJump.current = lastPosition.current;
      setNarrow(viewport.matches);
    };
    viewport.addEventListener("change", onResize);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("change", onResize);
    };
  }, [chapter.id, initialAppTheme, prefsKey, resume, syncedPosition, syncedPrefs, total, userId]);

  const jumpToStripPage = useCallback((position: ReaderPosition) => {
    const figure = pageRefs.current[position.pageIndex];
    if (!figure) return;
    const rect = figure.getBoundingClientRect();
    const offset = Math.max(0, Math.min(1, position.pageOffset ?? 0));
    const top = position.pageIndex === 0 && offset === 0 ? 0 : window.scrollY + rect.top + offset * rect.height - window.innerHeight * 0.45;
    window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
  }, []);

  useEffect(() => {
    if (!ready || !pendingJump.current) return;
    restoring.current = true;
    const frame = requestAnimationFrame(() => {
      const position = pendingJump.current;
      pendingJump.current = null;
      if (position) lastPosition.current = position;
      if (strip && position) jumpToStripPage(position);
      else window.scrollTo({ top: 0, behavior: "instant" });
      restoring.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [jumpToStripPage, layout, ready, strip]);

  const syncPosition = useCallback((position: ReaderPosition, keepalive = false) => {
    if (!userId) return;
    const payload = JSON.stringify({ ...position, mangaId: manga.id, chapterId: chapter.id });
    const send = () => fetch("/api/progress", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive,
    }).then(() => undefined).catch(() => undefined);
    if (keepalive) void send();
    else syncQueue.current = syncQueue.current.then(send);
  }, [chapter.id, manga.id, userId]);

  const record = useCallback((position: ReaderPosition) => {
    lastPosition.current = position;
    savePosition(userId, {
      manga_id: manga.id,
      chapter_id: chapter.id,
      title: manga.title,
      page_index: position.pageIndex,
      page_offset: position.pageOffset,
      scroll_percent: position.scrollPercent,
      updated_at: new Date().toISOString(),
    });
    if (!userId) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = undefined;
      syncPosition(position);
    }, 550);
  }, [chapter.id, manga.id, manga.title, syncPosition, userId]);

  useEffect(() => {
    const flush = () => {
      if (timer.current === undefined || !lastPosition.current) return;
      clearTimeout(timer.current);
      timer.current = undefined;
      syncPosition(lastPosition.current, true);
    };
    const hide = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", hide);
      flush();
    };
  }, [syncPosition]);

  useEffect(() => {
    if (!strip || !ready) return;
    let frame = 0;
    const onScroll = () => {
      if (restoring.current || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (restoring.current) return;
        const line = window.innerHeight * 0.45;
        let left = 0;
        let right = total - 1;
        while (left < right) {
          const mid = Math.floor((left + right) / 2);
          if ((pageRefs.current[mid]?.getBoundingClientRect().bottom ?? 0) < line) left = mid + 1;
          else right = mid;
        }
        const rect = pageRefs.current[left]?.getBoundingClientRect();
        if (!rect) return;
        const offset = Math.max(0, Math.min(1, (line - rect.top) / Math.max(rect.height, 1)));
        const atEnd = left === total - 1 && rect.bottom <= window.innerHeight;
        setPage(left);
        setEndReached(atEnd);
        const previous = lastPosition.current;
        const percent = atEnd ? 100 : Math.min(100, (left + offset) / total * 100);
        if (left !== previous?.pageIndex || Math.abs(offset - (previous.pageOffset ?? 0)) > 0.02 || (atEnd && previous.scrollPercent < 100)) {
          record({ pageIndex: left, pageOffset: offset, scrollPercent: percent });
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [ready, record, strip, total]);

  useEffect(() => {
    if (!narrow || !ready) return;

    let previousY = window.scrollY;
    let previousDirection = 0;
    let distance = 0;
    let lastScrollAt = 0;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const currentY = Math.max(0, window.scrollY);
        if (restoring.current) {
          previousY = currentY;
          previousDirection = 0;
          distance = 0;
          lastScrollAt = 0;
          return;
        }

        if (currentY <= 4 && !controlsVisible.current) {
          updateControlsVisibility(true);
          previousY = currentY;
          previousDirection = 0;
          distance = 0;
          lastScrollAt = 0;
          return;
        }

        const delta = currentY - previousY;
        previousY = currentY;
        if (Math.abs(delta) < 3) return;

        const now = performance.now();
        if (now - lastScrollAt > 250) {
          previousDirection = 0;
          distance = 0;
        }
        lastScrollAt = now;
        const direction = Math.sign(delta);
        distance = direction === previousDirection ? distance + Math.abs(delta) : Math.abs(delta);
        previousDirection = direction;

        if (direction > 0 && distance >= 36 &&
          now - controlsShownAt.current >= 800) {
          updateControlsVisibility(false);
          previousDirection = 0;
          distance = 0;
        } else if (direction < 0 && distance >= 80) {
          updateControlsVisibility(true);
          previousDirection = 0;
          distance = 0;
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [narrow, ready, updateControlsVisibility]);

  const goToPage = useCallback((target: number) => {
    if (!ready) return;
    const destination = Math.max(0, Math.min(total - 1, target));
    if (!strip && Math.floor(destination / step) !== Math.floor(page / step)) {
      setPageTurn(destination > page ? "forward" : "backward");
    }
    setPage(destination);
    const position = {
      pageIndex: destination,
      pageOffset: 0,
      scrollPercent: strip ? destination / total * 100 : Math.min(total, Math.floor(destination / step) * step + step) / total * 100,
    };
    if (strip) {
      jumpToStripPage(position);
      setEndReached(false);
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    record(position);
  }, [jumpToStripPage, page, ready, record, step, strip, total]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || panel ||
        (event.target instanceof HTMLElement && event.target.closest("button, a, input, textarea, select, [contenteditable]"))) return;
      if (event.key.toLowerCase() === "h") {
        updateControlsVisibility(!controlsVisible.current);
        return;
      }
      if (strip || !["ArrowRight", "ArrowLeft", " "].includes(event.key)) return;
      event.preventDefault();
      const forward = event.key === " " ? !event.shiftKey : event.key === "ArrowRight";
      const destination = start + step * (forward ? 1 : -1);
      if (destination >= 0 && destination < total) goToPage(destination);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToPage, panel, start, step, strip, total, updateControlsVisibility]);

  function updatePrefs(patch: Partial<ReaderPrefs>) {
    const updated = { ...prefs, ...patch };
    if (patch.layout && resolveReaderLayout(updated, manga, chapter, narrow) !== layout) {
      pendingJump.current = { pageIndex: page, scrollPercent: lastPosition.current?.scrollPercent ?? 0 };
      restoring.current = true;
      setEndReached(false);
    }
    setPrefs(updated);
    try {
      localStorage.setItem(prefsKey, JSON.stringify(updated));
    } catch {
      // The current settings still apply when storage is unavailable.
    }
    if (userId) {
      preferencesQueue.current = preferencesQueue.current.then(async () => {
        const response = await fetch("/api/preferences", {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated), keepalive: true,
        });
        if (!response.ok) setNotice("Chưa đồng bộ được cài đặt đọc.");
      }).catch(() => setNotice("Chưa đồng bộ được cài đặt đọc."));
    }
  }

  async function saveOffline() {
    setSaving("offline");
    try {
      const cache = await caches.open("inkrail-chapter-pages-v1");
      await cache.addAll(pageUrls);
      setNotice("Đã lưu ảnh chương trên thiết bị.");
    } catch {
      setNotice("Không lưu được ảnh chương.");
    } finally {
      setSaving(null);
    }
  }

  async function saveBookmark() {
    if (!userId) {
      setNotice("Đăng nhập để lưu truyện vào thư viện.");
      return;
    }
    setSaving("bookmark");
    try {
      const response = await fetch("/api/bookmarks", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mangaId: manga.id, manga }),
      });
      setNotice(response.ok ? "Đã lưu vào thư viện." : "Chưa lưu được vào thư viện.");
    } catch {
      setNotice("Chưa lưu được vào thư viện.");
    } finally {
      setSaving(null);
    }
  }

  const pageTurnZoneWidth = "max(1rem, calc(50vw - 66.667dvh + 7rem))";

  return (
    <div className={cn("min-h-dvh bg-background pb-12 text-foreground", `reader-theme-${prefs.theme}`)}>
      {(showControls || narrow) && (
        <header
          aria-hidden={!showControls}
          inert={!showControls}
          className={cn(
            "sticky top-0 z-30 border-b border-border bg-background/95 text-foreground backdrop-blur transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none",
            narrow && !showControls && "pointer-events-none -translate-y-full opacity-0",
          )}
        >
          <div className="mx-auto flex max-w-5xl items-center gap-1.5 px-3 py-2 sm:gap-3 sm:px-5">
            <Link href={seriesHref} className="min-w-0 flex-1 truncate py-2 text-sm font-semibold hover:text-primary" aria-label={`Quay lại ${manga.title}`}>
              <ArrowLeft size={15} className="mr-1.5 inline" /><span className="align-middle">{manga.title}</span>
            </Link>
            <button type="button" onClick={() => setPanel("chapters")} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-sm hover:bg-secondary">
              <List size={15} /> <span>Ch. {chapter.number}</span>
            </button>
            <IconButton label="Cài đặt đọc" onClick={() => setPanel("settings")}><Settings2 size={17} /></IconButton>
          </div>
        </header>
      )}

      <main className={cn("pt-3", strip ? "mx-auto w-full max-w-5xl px-2 sm:px-4" : "w-full px-0")}
        onDoubleClick={(event) => {
          if (narrow || (event.target instanceof HTMLElement && event.target.closest("button, a, input, textarea, select, [contenteditable]"))) return;
          updateControlsVisibility(!controlsVisible.current);
        }}
        onTouchStart={(event) => {
          const point = event.touches[0];
          swipe.current = event.touches.length === 1 ? { x: point.clientX, y: point.clientY } : null;
        }}
        onTouchCancel={() => { swipe.current = null; }}
        onTouchEnd={(event) => {
          const first = swipe.current;
          swipe.current = null;
          if (!first || strip || event.touches.length || !event.changedTouches.length) return;
          const last = event.changedTouches[0];
          const dx = last.clientX - first.x;
          if (Math.abs(dx) < 55 || Math.abs(dx) < 1.5 * Math.abs(last.clientY - first.y)) return;
          const destination = start + ((dx < 0) !== rtl ? step : -step);
          if (destination >= 0 && destination < total) goToPage(destination);
        }}>
        {ready && (
          <div
            key={strip ? "reader-strip" : start}
            data-reader-layout={layout}
            onAnimationEnd={() => setPageTurn(null)}
            className={cn(
              "mx-auto",
              strip ? "flex max-w-[820px] flex-col items-center" :
                fitSpread ? "flex w-fit max-w-full items-start justify-center" : "grid w-full items-start",
              !strip && !fitSpread && step === 2 && end - start === 2 && "grid-cols-2",
              !strip && pageTurn && `reader-page-turn-${pageTurn}`,
            )}
            dir={!strip && rtl ? "rtl" : "ltr"} style={{ gap: layout === "double" ? 0 : prefs.gap }}>
            {pagesToShow.map((image, offset) => {
              const i = strip ? offset : start + offset;
              const url = pageUrls[i];
              const attempt = attempts[i] ?? 0;
              return (
                <figure
                  key={i}
                  ref={(node) => { pageRefs.current[i] = node; }}
                  className={cn(
                    "relative min-w-0",
                    (strip || !fitSpread) && "w-full",
                    fitSpread && layout === "double" && end - start === 2 && "max-w-[50vw]",
                    fitSpread && (layout !== "double" || end - start === 1) && "max-w-full",
                  )}
                  data-page={i + 1}
                >
                  {failedPage.includes(i) ? (
                    <div className="grid min-h-40 place-content-center bg-card p-4 text-center text-sm text-foreground">
                      <p>Không tải được trang {i + 1}.</p>
                      <button type="button" className="mt-2 text-primary underline" onClick={() => {
                        setFailedPage((items) => items.filter((item) => item !== i));
                        setAttempts((items) => ({ ...items, [i]: attempt + 1 }));
                      }}>Tải lại ảnh</button>
                    </div>
                  ) : (
                    <img
                      src={attempt && url.startsWith("/api/") ? `${url}&retry=${attempt}` : url}
                      key={attempt}
                      width={image.width ?? 800}
                      height={image.height ?? 1200}
                      alt={`Trang ${i + 1}`}
                      loading={!strip || i === page || i < 2 ? "eager" : "lazy"}
                      decoding="async"
                      onError={() => setFailedPage((items) => items.includes(i) ? items : [...items, i])}
                      className={cn("mx-auto block h-auto max-w-full object-contain",
                        prefs.fit === "width" && "w-full",
                        prefs.fit === "smart" && cn("max-h-[calc(100dvh-9rem)]", fitSpread ? "w-auto" : "w-full"),
                        prefs.fit === "height" && "max-h-[calc(100dvh-9rem)] w-auto")}
                      style={{ filter: prefs.brightness ? `brightness(${1 - prefs.brightness / 100})` : undefined }}
                    />
                  )}
                </figure>
              );
            })}
          </div>
        )}

        {ready && (strip || end === total) && (
          <div className="mx-auto mb-16 mt-5 max-w-md rounded-xl border border-border bg-card p-4 text-center text-foreground">
            <p className="font-semibold">Hết chương {chapter.number}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {chapter.source === "mangadex" ? (
                <a href={`https://mangadex.org/chapter/${encodeURIComponent(chapter.sourceId)}`} className="underline hover:text-primary">MangaDex</a>
              ) : chapter.source === "otruyen" ? "OTruyen" : "Trang mẫu InkRail"}
              {chapter.group && ` · ${chapter.group}`}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm">
              {prev && <Link href={chapterHref(prev)} className="rounded-lg border border-border px-3 py-2">Chương trước</Link>}
              {next ? <Link href={chapterHref(next)} className="ink-cta rounded-lg px-3 py-2">Chương sau</Link> : <Link href={seriesHref} className="ink-cta rounded-lg px-3 py-2">Về trang truyện</Link>}
            </div>
          </div>
        )}
      </main>

      {!strip && (
        <>
          <button
            type="button"
            title="Trang trước"
            aria-label="Trang trước"
            disabled={start === 0}
            onClick={() => goToPage(start - step)}
            className="fixed inset-y-14 left-0 z-20 hidden cursor-pointer bg-transparent transition-colors hover:bg-foreground/5 disabled:cursor-default md:top-16 md:block"
            style={{ width: pageTurnZoneWidth, bottom: "4rem" }}
          />
          <button
            type="button"
            title="Trang sau"
            aria-label="Trang sau"
            disabled={end >= total}
            onClick={() => goToPage(start + step)}
            className="fixed inset-y-14 right-0 z-20 hidden cursor-pointer bg-transparent transition-colors hover:bg-foreground/5 disabled:cursor-default md:top-16 md:block"
            style={{ width: pageTurnZoneWidth, bottom: "4rem" }}
          />
        </>
      )}

      {(showControls || narrow) && ready && (
        <nav
          aria-hidden={!showControls}
          inert={!showControls}
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 text-foreground backdrop-blur transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none",
            !showControls && "pointer-events-none translate-y-full opacity-0",
          )}
          aria-label="Điều hướng đọc"
        >
          <div className="mx-auto flex max-w-5xl items-center gap-1.5 sm:gap-3">
            {prev && <Link href={chapterHref(prev)} aria-label="Chương trước" className="shrink-0 rounded-lg border border-border p-2"><ArrowLeft size={16} /></Link>}
            {!strip && <IconButton label="Trang trước" disabled={start === 0} onClick={() => goToPage(start - step)}><ChevronLeft size={17} /></IconButton>}
            <input aria-label="Đi đến trang" type="range" min={1} max={total} value={page + 1} onChange={(event) => goToPage(Number(event.target.value) - 1)} className="min-w-0 flex-1 accent-primary" />
            <span className="shrink-0 font-code text-xs tabular-nums" aria-live="polite">
              {strip ? page + 1 : end - start > 1 ? `${start + 1}–${end}` : end}/{total}
            </span>
            {!strip && <IconButton label="Trang sau" disabled={end >= total} onClick={() => goToPage(start + step)}><ChevronRight size={17} /></IconButton>}
            {next && <Link href={chapterHref(next)} aria-label="Chương sau" className={cn("shrink-0 rounded-lg border border-border p-2", (strip ? endReached : end === total) && "ink-cta")}><ArrowRight size={16} /></Link>}
          </div>
        </nav>
      )}

      {notice && (
        <div role="status" className="fixed bottom-17 left-1/2 z-40 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-popover px-3 py-2 text-sm text-foreground shadow-lg">
          {notice}<button type="button" aria-label="Đóng thông báo" className="text-lg" onClick={() => setNotice("")}>×</button>
        </div>
      )}

      <Sheet open={panel === "chapters"} onClose={() => setPanel(null)} ariaLabel="Chọn chương" maxHeightClass="max-h-[75dvh]">
        <h2 className="text-lg font-semibold">Chọn chương · {chapter.language.toUpperCase()}</h2>
        {chapter.group && <p className="mt-1 text-xs text-muted-foreground">Nhóm dịch: {chapter.group}</p>}
        <ul className="mt-3 grid gap-1.5 pb-4 sm:grid-cols-2 lg:grid-cols-3">
          {sequence.map((item) => (
            <li key={item.id}>
              {item.id === chapter.id ? (
                <span aria-current="page" className="block rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">Ch. {item.number} · Đang đọc</span>
              ) : (
                <Link href={chapterHref(item)} prefetch={false} className="block truncate rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
                  Ch. {item.number}{item.title && ` · ${item.title}`}{item.externalUrl && " ↗"}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet open={panel === "settings"} onClose={() => setPanel(null)} ariaLabel="Cài đặt đọc" maxHeightClass="max-h-[80dvh]">
        <h2 className="mb-3 text-lg font-semibold">Cài đặt đọc</h2>
        <div className="grid max-w-4xl grid-cols-2 gap-3 pb-4 md:grid-cols-4">
          <ReaderSelect label="Bố cục" value={prefs.layout ?? layout} options={layouts} onChange={(value) => updatePrefs({ layout: value })} />
          <ReaderSelect label="Hướng lật trang" value={prefs.direction} options={directions} onChange={(value) => updatePrefs({ direction: value })} />
          <ReaderSelect label="Kích thước ảnh" value={prefs.fit} options={fits} onChange={(value) => updatePrefs({ fit: value })} />
          <ReaderSelect label="Màu nền" value={prefs.theme} options={themes} onChange={(value) => updatePrefs({ theme: value })} />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border py-3 text-sm">
          <button type="button" onClick={saveBookmark} disabled={saving !== null} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2"><Bookmark size={15} /> Lưu truyện</button>
          <button type="button" onClick={saveOffline} disabled={saving !== null} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2"><Download size={15} /> Lưu ảnh chương</button>
          <button type="button" onClick={() => {
            const toggle = document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.();
            if (!toggle) setNotice("Thiết bị chưa hỗ trợ toàn màn hình.");
            else void toggle.catch(() => setNotice("Không mở được toàn màn hình."));
          }} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2"><Maximize size={15} /> Toàn màn hình</button>
        </div>
      </Sheet>
    </div>
  );
}

function IconButton({ children, label, onClick, disabled = false }: { children: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return <button title={label} aria-label={label} type="button" onClick={onClick} disabled={disabled} className="grid size-9 shrink-0 place-items-center rounded-lg border border-border hover:bg-secondary disabled:opacity-35">{children}</button>;
}

function ReaderSelect<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Record<T, string>; onChange: (value: T) => void }) {
  return (
    <SelectField
      label={label}
      value={value}
      className="min-w-0"
      triggerClassName="mt-1 h-10 w-full bg-card px-2"
      options={Object.entries(options).map(([key, text]) => ({ value: key, label: String(text) }))}
      onValueChange={(selected) => {
        if (selected !== null && Object.hasOwn(options, selected)) onChange(selected as T);
      }}
    />
  );
}
