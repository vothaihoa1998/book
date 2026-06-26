"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Bookmark, Download, EyeOff, Check, Hand, Loader2, AlertCircle, Settings2, Palette, X } from "lucide-react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { type Chapter, type Manga, type ReaderPrefs, imageProxyUrl } from "@/lib/types";
import { pickReaderDirection } from "@/lib/reader-presets";
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
  { value: "warm-light", label: "Sáng dịu", className: "bg-[#efe6d4]" },
  { value: "paper", label: "Giấy", className: "bg-[#e9dec5]" },
  { value: "sepia", label: "Sepia", className: "bg-[#c9b190]" },
  { value: "graphite-dark", label: "Graphite", className: "bg-[#15121a]" },
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
  if (typeof window === "undefined") return { page: 1, scrollPercent: 0, scrollY: 0 };
  const stored = window.localStorage.getItem(`inkrail-progress:${chapterId}`);
  if (!stored) return { page: 1, scrollPercent: 0, scrollY: 0 };

  try {
    const parsed = JSON.parse(stored) as { pageIndex?: number; scrollPercent?: number; scrollY?: number };
    const page = typeof parsed.pageIndex === "number" ? clampPage(parsed.pageIndex + 1, totalPages) : 1;
    const scrollPercent = typeof parsed.scrollPercent === "number" ? Math.min(100, Math.max(0, parsed.scrollPercent)) : 0;
    const scrollY = typeof parsed.scrollY === "number" ? Math.max(0, parsed.scrollY) : 0;
    return { page, scrollPercent, scrollY };
  } catch {
    return { page: 1, scrollPercent: 0, scrollY: 0 };
  }
}

export function ReaderClient({ manga, chapter, chapters, initialAppTheme = "light" }: { manga: Manga; chapter: Chapter; chapters: Chapter[]; initialAppTheme?: "light" | "dark" }) {
  const totalPages = Math.max(1, chapter.pages.length);
  const [showUi, setShowUi] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [showTapHint, setShowTapHint] = useState(true);
  const [prefs, setPrefs] = useState<ReaderPrefs>(initialAppTheme === "dark" ? darkDefaultPrefs : defaultPrefs);
  const [prefsReady, setPrefsReady] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadState, setDownloadState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [bookmarkState, setBookmarkState] = useState<"idle" | "saving" | "saved" | "error" | "anonymous">("idle");
  const [showThemePopover, setShowThemePopover] = useState(false);
  const [resumeToast, setResumeToast] = useState<{ page: number; scrollPercent: number; scrollY: number } | null>(null);
  const lastSync = useRef(0);
  const prefsMounted = useRef(false);
  const pageRefs = useRef<Array<HTMLImageElement | null>>([]);
  const headerRef = useRef<HTMLElement | null>(null);

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
    // Lưu explicit override per-chapter để auto-detect không override lại.
    try {
      localStorage.setItem(`inkrail-reader-direction:${chapter.id}`, direction);
    } catch {
      // ignore
    }
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
    // Phase F1: lưu scrollY (px) để restore chính xác, không phụ thuộc layout.
    const scrollY = Math.round(window.scrollY);
    const payload = { mangaId: manga.id, chapterId: chapter.id, pageIndex, scrollPercent, scrollY };

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
    let active = true;
    const progress = readStoredProgress(chapter.id, totalPages);

    // Phase F1: Toast "Tiếp tục đọc?" — chỉ hiện khi có progress đáng kể.
    // Threshold 5% tránh phiền khi user chủ động mở Ch.1.
    const hasResumableProgress = progress.page > 1 || progress.scrollPercent > 5;
    const toastFrame = window.requestAnimationFrame(() => {
      if (!active) return;
      setResumeToast(
        hasResumableProgress
          ? {
              page: progress.page,
              scrollPercent: progress.scrollPercent,
              scrollY: progress.scrollY,
            }
          : null,
      );
    });

    // Phase F1: chờ tất cả <img> trong range page [0..progress.page] load xong
    // trước khi scrollIntoView. Nếu không, offset tính sai vì ảnh chưa render.
    // Timeout 5s để không block nếu ảnh fail (CDN anti-hotlink, 404, ...).
    const targetsToLoad = pageRefs.current
      .slice(0, Math.max(1, progress.page))
      .filter((el): el is HTMLImageElement => el instanceof HTMLImageElement && !el.complete);
    const loadPromise = Promise.allSettled(
      targetsToLoad.map(
        (img) =>
          new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            // safety net
            window.setTimeout(done, 5000);
          }),
      ),
    );

    let restoreTried = false;
    function tryRestore() {
      if (restoreTried) return;
      restoreTried = true;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      // Phase F1: ưu tiên scrollY (px) — chính xác từng pixel, không phụ thuộc
      // vào layout hiện tại. Fallback scrollPercent khi scrollY chưa có.
      const targetY = progress.scrollY > 0 ? Math.min(progress.scrollY, max) : (progress.scrollPercent / 100) * max;
      window.scrollTo({ top: targetY, behavior: "instant" as ScrollBehavior });
      setCurrentPage(progress.page);
      setScrollProgress(progress.scrollPercent);
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        loadPromise.then(tryRestore);
        // Safety: nếu img load xong rồi (cached), vẫn restore sau 250ms.
        window.setTimeout(tryRestore, 250);
      });
    });

    return () => {
      active = false;
      window.cancelAnimationFrame(toastFrame);
    };
  }, [chapter.id, totalPages]);

  // Phase F2: auto-detect direction từ chapter/manga + viewport width.
  // Apply 1 lần sau khi prefs sẵn sàng, chỉ khi user chưa có explicit pref
  // cho chapter này (tôn trọng settings đã chọn tay).
  useEffect(() => {
    if (!prefsReady) return;
    if (typeof window === "undefined") return;

    // Per-chapter override đã lưu: nếu user đã chọn direction khác cho chapter này, không override.
    const explicitOverride = localStorage.getItem(`inkrail-reader-direction:${chapter.id}`);
    if (explicitOverride) return;

    const viewportWidth = window.innerWidth;
    const detected = pickReaderDirection(manga, chapter, { width: viewportWidth });
    if (detected !== prefs.direction) {
      setPrefs((prev) => ({ ...prev, direction: detected }));
    }
  }, [prefsReady, chapter.id, chapter.title, chapter.direction, manga, prefs.direction]);

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
      // Don't hijack typing in inputs (e.g. comments later).
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

      if (event.key === "Escape") {
        // Priority: close the controls drawer first, otherwise surface the UI
        // if it's hidden, otherwise no-op.
        if (showControls) {
          setShowControls(false);
          return;
        }
        if (!showUi) {
          setShowUi(true);
        }
        return;
      }
      if (event.key === "ArrowRight" && nextChapter) {
        location.href = `/read/${encodeURIComponent(nextChapter.id)}`;
        return;
      }
      if (event.key === "ArrowLeft" && previousChapter) {
        location.href = `/read/${encodeURIComponent(previousChapter.id)}`;
        return;
      }
      if (event.key === "h" || event.key === "H") {
        setShowUi((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextChapter, previousChapter, showControls, showUi]);

  useEffect(() => {
    // rAF-throttle: findCurrentPage iterates every <img> ref and reads
    // getBoundingClientRect. Without this, scroll fires it on every pixel.
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        syncReaderProgress(findCurrentPage());
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [findCurrentPage, syncReaderProgress]);

  // Close the controls drawer when clicking/tapping outside the header.
  useEffect(() => {
    if (!showControls) return;
    const onPointer = (event: PointerEvent) => {
      const header = headerRef.current;
      if (!header) return;
      if (event.target instanceof Node && header.contains(event.target)) return;
      setShowControls(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [showControls]);

  // Swipe gesture + prefetch next chapter + warm cache.
  // Tách ra khỏi các effect khác để dễ debug.
  useEffect(() => {
    if (prefs.direction === "vertical") return;
    if (typeof window === "undefined") return;

    const SWIPE_MIN_DISTANCE = 60;
    const SWIPE_MAX_DURATION = 500;
    const EDGE_WIDTH = 24;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let tracking = false;

    function onStart(event: TouchEvent) {
      const t = event.touches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
      startT = Date.now();
      tracking = true;
    }

    function onEnd(event: TouchEvent) {
      if (!tracking) return;
      tracking = false;
      const t = event.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startT;
      if (dt > SWIPE_MAX_DURATION) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.2) return;
      if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return;

      const fromLeftEdge = startX <= EDGE_WIDTH;
      const fromRightEdge = startX >= window.innerWidth - EDGE_WIDTH;
      const midScreen = !fromLeftEdge && !fromRightEdge;
      if (midScreen && Math.abs(dx) < 120) return;

      const isNext = prefs.direction === "horizontal-rtl" ? dx > 0 : dx < 0;
      const target = isNext ? nextChapter : previousChapter;
      if (target) {
        location.href = `/read/${encodeURIComponent(target.id)}`;
      }
    }

    function onCancel() {
      tracking = false;
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onCancel);
    };
  }, [prefs.direction, nextChapter, previousChapter]);

  // Prefetch next chapter + warm cache 3 trang đầu khi user reach 80% scroll
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!nextChapter) return;
    const url = `/read/${encodeURIComponent(nextChapter.id)}`;
    let injected = document.querySelector<HTMLLinkElement>(`link[rel="prefetch"][href="${url}"]`);
    if (!injected) {
      injected = document.createElement("link");
      injected.rel = "prefetch";
      injected.href = url;
      injected.as = "document";
      document.head.appendChild(injected);
    }
    return () => {
      // Don't remove — browser may already be prefetching
    };
  }, [nextChapter]);

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

  // End-of-chapter detection (chỉ cho vertical, vì horizontal mỗi page = 1 chapter navigate ngay).
  const endOfChapter = prefs.direction === "vertical" && scrollProgress >= 95;

  // Auto-dismiss resume toast sau 8s
  useEffect(() => {
    if (!resumeToast) return;
    const t = window.setTimeout(() => setResumeToast(null), 8000);
    return () => window.clearTimeout(t);
  }, [resumeToast]);

  // Auto-hide tap hint sau 3.5s
  useEffect(() => {
    const t = window.setTimeout(() => setShowTapHint(false), 3500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className={cn("min-h-screen", prefs.theme !== "warm-light" && `reader-theme-${prefs.theme}`)} style={{ background: "var(--background)", color: "var(--foreground)", fontSize: `${prefs.fontSize}px` }}>
      {/* RESUME TOAST — Phase F1: hiện khi vào chapter có progress > 5%.
          Đặt trên header (~3.5rem top) để user thấy ngay nhưng không che content.
          Auto-dismiss 8s. Click "Đầu chương" → scroll top, dismiss.
          Click "Tiếp tục" → scroll tới scrollY đã lưu. */}
      {resumeToast && (
        <div
          role="dialog"
          aria-live="polite"
          className="fixed left-1/2 top-3.5 z-50 -translate-x-1/2"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center gap-2 rounded-full border border-border bg-background/95 px-2 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl">
            <span className="ml-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Bookmark size={13} />
            </span>
            <div className="px-1 text-[11px] text-muted-foreground">
              <p className="font-medium text-foreground leading-tight">
                Đang đọc dở · Trang {resumeToast.page}/{totalPages}
              </p>
              <p className="text-[10px] leading-tight text-muted-foreground">
                {Math.round(resumeToast.scrollPercent)}% chương
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                setResumeToast(null);
              }}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              Đầu
            </button>
            <button
              type="button"
              onClick={() => {
                const max = document.documentElement.scrollHeight - window.innerHeight;
                const targetY = resumeToast.scrollY > 0 ? Math.min(resumeToast.scrollY, max) : (resumeToast.scrollPercent / 100) * max;
                window.scrollTo({ top: targetY, behavior: "instant" as ScrollBehavior });
                setResumeToast(null);
              }}
              className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Tiếp tục
            </button>
            <button
              type="button"
              aria-label="Đóng"
              onClick={() => setResumeToast(null)}
              className="mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* TAP HINT — overlay subtle ở giữa, fade out sau 3.5s. Dùng createPortal để bypass PageTransition containing block. */}
      {typeof document !== "undefined" && showTapHint && showUi && createPortal(
        <div
          aria-hidden
          className="tap-hint pointer-events-none fixed inset-x-0 top-1/2 z-[80] flex -translate-y-1/2 justify-center"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-md backdrop-blur-sm">
            <Hand size={11} /> Tap giữa để ẩn/hiện nav
          </span>
        </div>,
        document.body,
      )}
      {showUi && (
        <header ref={headerRef} className="fixed inset-x-0 top-0 z-30 border-b border-border/70 bg-background/92 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.45rem)] backdrop-blur-xl md:px-4">
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

            <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-1.5">
              {/* Theme swatches — ẩn trên mobile, chỉ hiện popover.
                  Trên desktop hiện ngang 5 swatches gọn 22x22. */}
              <div className="hidden items-center gap-1 md:flex" aria-label="Màu đọc">
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
              {/* Mobile theme: tap icon mở popover, 5 swatches xếp dọc */}
              <div className="relative md:hidden">
                <ReaderIconButton
                  onClick={() => setShowThemePopover((value) => !value)}
                  label="Đổi màu nền đọc"
                  active={showThemePopover}
                >
                  <Palette size={16} />
                </ReaderIconButton>
                {showThemePopover && (
                  <>
                    {/* Click-outside scrim */}
                    <button
                      type="button"
                      aria-label="Đóng popover màu"
                      onClick={() => setShowThemePopover(false)}
                      className="fixed inset-0 z-20 cursor-default"
                    />
                    <div className="absolute right-0 top-full z-30 mt-2 flex flex-col gap-1.5 rounded-2xl border border-border bg-background p-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                      {readerThemes.map((theme) => (
                        <button
                          key={theme.value}
                          type="button"
                          aria-label={`Màu: ${theme.label}`}
                          aria-pressed={prefs.theme === theme.value}
                          onClick={() => {
                            setReaderTheme(theme.value);
                            setShowThemePopover(false);
                          }}
                          className={cn(
                            "flex items-center gap-2 rounded-full px-2 py-1.5 text-left text-[11px] font-medium transition",
                            prefs.theme === theme.value
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground hover:bg-secondary",
                          )}
                        >
                          <span className={cn("size-4 shrink-0 rounded-full border border-border", theme.className)} />
                          <span>{theme.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
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

      {/* TAP ZONES — 3 vùng 33% trên mobile:
          - Vertical:   left/right = scroll page (giữ behavior scroll tự nhiên), giữa = toggle UI
          - Horizontal: left = chương trước, giữa = toggle UI, phải = chương sau
          Trên desktop, chỉ có nút toggle UI ở giữa. */}
      {prefs.direction !== "vertical" && !showUi && previousChapter && (
        <button
          aria-label="Chương trước"
          onClick={() => previousChapter && (location.href = `/read/${encodeURIComponent(previousChapter.id)}`)}
          className="fixed inset-y-0 left-0 z-10 w-1/3 cursor-default"
        />
      )}
      <button
        aria-label="Ẩn hoặc hiện giao diện đọc"
        onClick={() => setShowUi((value) => !value)}
        className={cn(
          "fixed top-1/4 z-10 h-1/2 cursor-default transition-[inset]",
          prefs.direction === "vertical"
            ? "inset-x-1/3" // 33% giữa
            : "inset-x-1/3", // 33% giữa kể cả horizontal — không edge-overlap
        )}
      />
      {prefs.direction !== "vertical" && !showUi && nextChapter && (
        <button
          aria-label="Chương sau"
          onClick={() => nextChapter && (location.href = `/read/${encodeURIComponent(nextChapter.id)}`)}
          className="fixed inset-y-0 right-0 z-10 w-1/3 cursor-default"
        />
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
            prefs.direction === "horizontal-ltr" && "grid grid-cols-1 gap-4 md:grid-cols-2",
            prefs.direction === "horizontal-rtl" && "grid grid-cols-1 gap-4 md:grid-cols-2",
          )}
          dir={prefs.direction === "horizontal-rtl" ? "rtl" : "ltr"}
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

      {/* END-OF-CHAPTER PANEL — hiện khi scrollProgress >= 95% (vertical mode).
          Fade-in 220ms, đặt trên bottom nav để user có thể bấm ngay. */}
      {endOfChapter && (
        <div
          role="dialog"
          aria-label="Hết chương"
          className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md rounded-2xl border border-border/70 bg-background/95 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-200 ease-out md:bottom-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Check size={15} />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Đã xong</p>
              <p className="text-sm font-semibold text-foreground">
                Chương {chapter.number}
                {chapter.title ? `: ${chapter.title}` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {previousChapter ? (
              <Link
                href={`/read/${encodeURIComponent(previousChapter.id)}`}
                className="flex-1 rounded-full border border-border bg-card px-3 py-2 text-center text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                ← Chương trước
              </Link>
            ) : null}
            {nextChapter ? (
              <Link
                href={`/read/${encodeURIComponent(nextChapter.id)}`}
                className="flex-1 rounded-full bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Chương sau →
              </Link>
            ) : (
              <Link
                href={`/manga/${encodeURIComponent(manga.id)}`}
                className="flex-1 rounded-full bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Quay lại trang truyện
              </Link>
            )}
          </div>
        </div>
      )}

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
        "size-6 shrink-0 rounded-full border border-border/70 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        className,
        active && "ring-2 ring-primary ring-offset-1 ring-offset-background",
      )}
    />
  );
}
