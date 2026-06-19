"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Bookmark, Download, EyeOff, Check, Loader2, AlertCircle, Settings2 } from "lucide-react";
import Link from "next/link";
import { type Chapter, type Manga, type ReaderPrefs, imageProxyUrl } from "@/lib/types";
import { cn } from "@/lib/utils";

const basePrefs = {
  direction: "vertical",
  fit: "width",
  brightness: 0,
  fontSize: 18,
  gap: 8,
} as const;

const defaultPrefs: ReaderPrefs = {
  ...basePrefs,
  theme: "warm-light",
};

const darkDefaultPrefs: ReaderPrefs = {
  ...basePrefs,
  theme: "graphite-dark",
};

const readerThemes: Array<{ value: ReaderPrefs["theme"]; label: string; className: string }> = [
  { value: "warm-light", label: "Sáng dịu", className: "bg-[#f7f1e7]" },
  { value: "paper", label: "Giấy", className: "bg-[#faf3e2]" },
  { value: "sepia", label: "Sepia", className: "bg-[#d9c3a1]" },
  { value: "graphite-dark", label: "Graphite", className: "bg-[#1a130c]" },
  { value: "pure-black", label: "OLED", className: "bg-black" },
];

function readStoredPrefs() {
  if (typeof window === "undefined") return defaultPrefs;
  const stored = window.localStorage.getItem("inkrail-reader-prefs");
  if (!stored) return defaultPrefs;

  try {
    return { ...defaultPrefs, ...JSON.parse(stored) } as ReaderPrefs;
  } catch {
    return defaultPrefs;
  }
}

function clampPage(page: number, totalPages: number) {
  return Math.min(totalPages, Math.max(1, Math.round(page)));
}

function readStoredProgress(chapterId: string, totalPages: number) {
  if (typeof window === "undefined") return { page: 1, scrollPercent: 0 };
  const stored = window.localStorage.getItem(`inkrail-progress:${chapterId}`);
  if (!stored) return { page: 1, scrollPercent: 0 };

  try {
    const parsed = JSON.parse(stored) as { pageIndex?: number; scrollPercent?: number };
    const page = typeof parsed.pageIndex === "number" ? clampPage(parsed.pageIndex + 1, totalPages) : 1;
    const scrollPercent = typeof parsed.scrollPercent === "number" ? Math.min(100, Math.max(0, parsed.scrollPercent)) : 0;
    return { page, scrollPercent };
  } catch {
    return { page: 1, scrollPercent: 0 };
  }
}

export function ReaderClient({ manga, chapter, chapters, initialAppTheme = "light" }: { manga: Manga; chapter: Chapter; chapters: Chapter[]; initialAppTheme?: "light" | "dark" }) {
  const totalPages = Math.max(1, chapter.pages.length);
  const [showUi, setShowUi] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [prefs, setPrefs] = useState<ReaderPrefs>(initialAppTheme === "dark" ? darkDefaultPrefs : defaultPrefs);
  const [prefsReady, setPrefsReady] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadState, setDownloadState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [bookmarkState, setBookmarkState] = useState<"idle" | "saving" | "saved" | "error" | "anonymous">("idle");
  const lastSync = useRef(0);
  const prefsMounted = useRef(false);
  const pageRefs = useRef<Array<HTMLImageElement | null>>([]);

  const orderedChapters = chapters.slice().reverse();
  const currentIndex = orderedChapters.findIndex((item) => item.id === chapter.id);
  const previousChapter = currentIndex > 0 ? orderedChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && currentIndex < orderedChapters.length - 1 ? orderedChapters[currentIndex + 1] : null;

  const pageUrls = useMemo(() => chapter.pages.map((page) => imageProxyUrl(page.url, chapter.source)), [chapter]);

  const statusMessage = useMemo<{ tone: "info" | "success" | "warn" | "error"; icon: ReactNode; text: string } | null>(() => {
    if (downloadState === "saving") return { tone: "info", icon: <Loader2 size={12} className="animate-spin" />, text: "Đang lưu offline" };
    if (downloadState === "saved") return { tone: "success", icon: <Check size={12} />, text: "Đã lưu chương này" };
    if (downloadState === "error") return { tone: "error", icon: <AlertCircle size={12} />, text: "Không lưu được offline" };
    if (bookmarkState === "saving") return { tone: "info", icon: <Loader2 size={12} className="animate-spin" />, text: "Đang lưu bookmark" };
    if (bookmarkState === "saved") return { tone: "success", icon: <Check size={12} />, text: "Đã lưu bookmark" };
    if (bookmarkState === "anonymous") return { tone: "warn", icon: <AlertCircle size={12} />, text: "Đăng nhập để đồng bộ bookmark" };
    if (bookmarkState === "error") return { tone: "error", icon: <AlertCircle size={12} />, text: "Không lưu được bookmark" };
    return null;
  }, [downloadState, bookmarkState]);

  const setReaderMode = (direction: ReaderPrefs["direction"]) => {
    setPrefs((current) => ({ ...current, direction }));
    setShowUi(true);
    setShowControls(false);
  };

  const setReaderFit = (fit: ReaderPrefs["fit"]) => {
    setPrefs((current) => ({ ...current, fit }));
    setShowUi(true);
    setShowControls(false);
  };

  const setReaderTheme = (theme: ReaderPrefs["theme"]) => {
    setPrefs((current) => ({ ...current, theme }));
    setShowUi(true);
  };

  const findCurrentPage = useCallback(() => {
    const center = window.innerHeight / 2;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    pageRefs.current.forEach((node, index) => {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const distance = rect.top <= center && rect.bottom >= center
        ? 0
        : Math.min(Math.abs(rect.top - center), Math.abs(rect.bottom - center));

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    return clampPage(bestIndex + 1, totalPages);
  }, [totalPages]);

  const syncReaderProgress = useCallback((page: number) => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const scrollPercent = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
    const pageIndex = clampPage(page, totalPages) - 1;
    const payload = { mangaId: manga.id, chapterId: chapter.id, pageIndex, scrollPercent };

    setScrollProgress(scrollPercent);
    setCurrentPage(pageIndex + 1);
    localStorage.setItem(`inkrail-progress:${chapter.id}`, JSON.stringify(payload));

    const now = Date.now();
    if (now - lastSync.current < 3000) return;
    lastSync.current = now;
    fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  }, [chapter.id, manga.id, totalPages]);

  useEffect(() => {
    let active = true;
    const frame = window.requestAnimationFrame(() => {
      if (!active) return;
      setPrefs(readStoredPrefs());
      setPrefsReady(true);

      fetch("/api/preferences")
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { prefs?: Partial<ReaderPrefs>; mode?: string } | null) => {
          if (active && payload?.mode === "synced" && payload.prefs) setPrefs((current) => ({ ...current, ...payload.prefs }));
        })
        .catch(() => undefined);
    });

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const progress = readStoredProgress(chapter.id, totalPages);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setCurrentPage(progress.page);
        setScrollProgress(progress.scrollPercent);

        const target = pageRefs.current[progress.page - 1];
        if (target) {
          target.scrollIntoView({ block: "start", behavior: "instant" });
          return;
        }

        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({ top: (progress.scrollPercent / 100) * max, behavior: "instant" });
      });
    });
  }, [chapter.id, totalPages]);

  useEffect(() => {
    if (!prefsReady) return;
    localStorage.setItem("inkrail-reader-prefs", JSON.stringify(prefs));
    if (!prefsMounted.current) {
      prefsMounted.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      fetch("/api/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(prefs),
        keepalive: true,
      }).catch(() => undefined);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [prefs, prefsReady]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowUi(true);
      }
      if (event.key.toLowerCase() === "h") setShowUi((value) => !value);
      if (event.key.toLowerCase() === "f") document.documentElement.requestFullscreen?.();
      if (event.key.toLowerCase() === "b") setShowUi((value) => !value);
      if (event.key === "ArrowRight" && nextChapter) location.href = `/read/${encodeURIComponent(nextChapter.id)}`;
      if (event.key === "ArrowLeft" && previousChapter) location.href = `/read/${encodeURIComponent(previousChapter.id)}`;
      if (event.key.toLowerCase() === "j" && nextChapter) location.href = `/read/${encodeURIComponent(nextChapter.id)}`;
      if (event.key.toLowerCase() === "k" && previousChapter) location.href = `/read/${encodeURIComponent(previousChapter.id)}`;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextChapter, previousChapter]);

  useEffect(() => {
    const syncProgress = () => syncReaderProgress(findCurrentPage());
    window.addEventListener("scroll", syncProgress, { passive: true });
    window.addEventListener("resize", syncProgress);
    syncProgress();
    return () => {
      window.removeEventListener("scroll", syncProgress);
      window.removeEventListener("resize", syncProgress);
    };
  }, [findCurrentPage, syncReaderProgress]);

  async function warmCache() {
    if (!("caches" in window)) return;
    setDownloadState("saving");
    try {
      const cache = await caches.open("inkrail-chapter-pages-v1");
      await Promise.all(pageUrls.map((url) => cache.add(url)));
      setDownloadState("saved");
    } catch {
      setDownloadState("error");
    }
  }

  async function saveBookmark() {
    setBookmarkState("saving");
    try {
      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mangaId: manga.id, manga }),
      });
      const payload = await response.json().catch(() => null) as { mode?: string; ok?: boolean } | null;
      if (!response.ok || payload?.ok === false) {
        setBookmarkState("error");
        return;
      }
      setBookmarkState(payload?.mode === "anonymous" || payload?.mode === "local-only" ? "anonymous" : "saved");
    } catch {
      setBookmarkState("error");
    }
  }

  return (
    <div className={cn("min-h-screen", prefs.theme !== "warm-light" && `reader-theme-${prefs.theme}`)} style={{ background: "var(--background)", color: "var(--foreground)", fontSize: `${prefs.fontSize}px` }}>
      {showUi && (
        <header className="fixed inset-x-0 top-0 z-30 border-b border-border/70 bg-background/92 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.45rem)] backdrop-blur-xl md:px-4">
          <div className="mx-auto flex max-w-7xl items-center gap-2 md:gap-3">
            <Link
              href={`/manga/${encodeURIComponent(manga.id)}`}
              className="inline-flex h-9 max-w-[40vw] shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring md:max-w-sm"
              aria-label="Quay lại truyện"
            >
              <ArrowLeft size={15} />
              <span className="truncate">{manga.title}</span>
            </Link>

            <div className="ml-1 shrink-0 text-sm font-medium md:ml-0 md:absolute md:left-1/2 md:-translate-x-1/2">
              Chương {chapter.number}
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1.5 md:gap-2">
              {/* Theme — only labeled, default to current */}
              <div className="reader-theme-row" aria-label="Màu đọc">
                {readerThemes.map((theme) => (
                  <ThemeSwatch
                    key={theme.value}
                    active={prefs.theme === theme.value}
                    label={`Màu: ${theme.label}`}
                    className={theme.className}
                    onClick={() => setReaderTheme(theme.value)}
                  />
                ))}
              </div>

              <ReaderIconButton onClick={saveBookmark} label="Lưu bookmark" active={bookmarkState === "saved"}>
                <Bookmark size={15} />
              </ReaderIconButton>
              <ReaderIconButton onClick={warmCache} label="Tải offline" active={downloadState === "saved"}>
                <Download size={15} />
              </ReaderIconButton>
              <ReaderIconButton onClick={() => setShowControls((value) => !value)} label="Tuỳ chỉnh đọc" active={showControls}>
                <Settings2 size={15} />
              </ReaderIconButton>
            </div>
          </div>

          {/* Slide-down controls drawer (direction + fit) */}
          <div
            className={cn(
              "mx-auto mt-2 flex max-w-7xl flex-wrap items-center gap-2 overflow-hidden transition-all duration-200 ease-out md:gap-3",
              showControls ? "max-h-24 opacity-100" : "max-h-0 opacity-0",
            )}
          >
            <div className="reader-control-group" aria-label="Kiểu đọc">
              <QuickButton active={prefs.direction === "vertical"} onClick={() => setReaderMode("vertical")} label="Đọc dọc">↕</QuickButton>
              <QuickButton active={prefs.direction === "horizontal-ltr"} onClick={() => setReaderMode("horizontal-ltr")} label="Đọc ngang trái sang phải">→</QuickButton>
              <QuickButton active={prefs.direction === "horizontal-rtl"} onClick={() => setReaderMode("horizontal-rtl")} label="Đọc ngang phải sang trái">←</QuickButton>
            </div>
            <div className="reader-control-group" aria-label="Fit ảnh">
              <QuickButton active={prefs.fit === "width"} onClick={() => setReaderFit("width")} label="Fit chiều rộng">Rộng</QuickButton>
              <QuickButton active={prefs.fit === "height"} onClick={() => setReaderFit("height")} label="Fit chiều cao">Cao</QuickButton>
              <QuickButton active={prefs.fit === "smart"} onClick={() => setReaderFit("smart")} label="Fit thông minh">Tự động</QuickButton>
              <QuickButton active={prefs.fit === "original"} onClick={() => setReaderFit("original")} label="Kích thước gốc">Gốc</QuickButton>
            </div>
          </div>
        </header>
      )}

      <button aria-label="Ẩn hoặc hiện giao diện đọc" onClick={() => setShowUi((value) => !value)} className="fixed inset-x-1/3 top-1/3 z-10 h-1/3 cursor-default" />
      {prefs.direction !== "vertical" && !showUi && previousChapter && (
        <Link aria-label="Chương trước" href={`/read/${encodeURIComponent(previousChapter.id)}`} className="fixed inset-y-0 left-0 z-10 w-1/4" />
      )}
      {prefs.direction !== "vertical" && !showUi && nextChapter && (
        <Link aria-label="Chương sau" href={`/read/${encodeURIComponent(nextChapter.id)}`} className="fixed inset-y-0 right-0 z-10 w-1/4" />
      )}

      <main
        className={cn(
          "mx-auto px-0 pb-28 pt-16 md:pt-20",
          prefs.direction === "vertical" ? "max-w-[920px]" : "max-w-7xl",
        )}
      >
        <div
          className={cn(
            prefs.direction === "vertical" && "flex flex-col items-center",
            prefs.direction !== "vertical" && "grid grid-cols-1 gap-4 md:grid-cols-2",
          )}
          style={{ gap: `${prefs.gap}px` }}
        >
          {pageUrls.map((url, index) => (
            <img
              key={url}
              ref={(node) => {
                pageRefs.current[index] = node;
              }}
              src={url}
              alt={`${manga.title} trang ${index + 1}`}
              loading={index < 2 ? "eager" : "lazy"}
              decoding="async"
              className={cn(
                "bg-surface-strong object-contain",
                prefs.fit === "width" && "w-full",
                prefs.fit === "height" && "max-h-[calc(100vh-8rem)] w-auto",
                prefs.fit === "original" && "w-auto max-w-full",
                prefs.fit === "smart" && "max-h-[calc(100vh-8rem)] w-full",
              )}
            />
          ))}
        </div>
      </main>

      {showUi && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/92 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur-xl" aria-label="Điều hướng chương">
          <div className="mb-2 h-0.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${scrollProgress}%` }} />
          </div>
          <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2">
            {previousChapter ? (
              <Link
                href={`/read/${encodeURIComponent(previousChapter.id)}`}
                className="inline-flex h-11 w-fit items-center gap-2 rounded-[var(--radius-control)] bg-secondary px-3 text-sm font-medium text-foreground transition hover:bg-surface-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                <ArrowLeft size={15} /> <span><span className="hidden sm:inline">Chương </span>trước</span>
              </Link>
            ) : (
              <span className="inline-flex h-11 w-fit items-center gap-2 rounded-[var(--radius-control)] bg-secondary px-3 text-sm font-medium text-muted-foreground opacity-45">
                <ArrowLeft size={15} /> <span><span className="hidden sm:inline">Chương </span>trước</span>
              </span>
            )}
            <div className="meta-mono flex items-center justify-center gap-1.5 text-center leading-5">
              {statusMessage ? (
                <span className={cn(
                  "inline-flex items-center gap-1.5",
                  statusMessage.tone === "success" && "text-accent-2",
                  statusMessage.tone === "error" && "text-danger",
                  statusMessage.tone === "warn" && "text-warning",
                  statusMessage.tone === "info" && "text-foreground",
                )}>
                  {statusMessage.icon}
                  <span className="hidden sm:inline">{statusMessage.text}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span className="tabular-nums">{currentPage}/{totalPages}</span>
                  <span aria-hidden className="hidden sm:inline">·</span>
                  <span className="hidden items-center gap-1 sm:inline-flex" title="Phím H: ẩn/hiện giao diện">
                    <EyeOff size={11} /> H
                  </span>
                </span>
              )}
            </div>
            {nextChapter ? (
              <Link
                href={`/read/${encodeURIComponent(nextChapter.id)}`}
                className="ml-auto inline-flex h-11 w-fit items-center gap-2 rounded-[var(--radius-control)] bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                <span><span className="hidden sm:inline">Chương </span>sau</span> <ArrowRight size={15} />
              </Link>
            ) : (
              <span className="ml-auto inline-flex h-11 w-fit items-center gap-2 rounded-[var(--radius-control)] bg-secondary px-3 text-sm font-medium text-muted-foreground opacity-45">
                Hết chương <ArrowRight size={15} />
              </span>
            )}
          </div>
        </nav>
      )}

      <div className="pointer-events-none fixed inset-0 z-20" style={{ background: `rgba(0,0,0,${prefs.brightness / 100})` }} />
    </div>
  );
}

function QuickButton({ active, onClick, label, children }: { active?: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center rounded-[calc(var(--radius-control)+1px)] px-2.5 text-sm font-semibold leading-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ReaderIconButton({ active, onClick, label, children }: { active?: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ThemeSwatch({ active, label, className, onClick }: { active?: boolean; label: string; className: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "size-7 shrink-0 rounded-full border border-border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        className,
        active && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    />
  );
}
