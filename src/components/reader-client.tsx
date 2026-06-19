"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Bookmark, Columns2, Download, Maximize2, Moon, PanelTop, Settings, Smartphone, Sun, X } from "lucide-react";
import Link from "next/link";
import { AppButton, BottomSheet, FieldLabel, IconButton, SegmentButton, SegmentedControl } from "@/components/ui/primitives";
import { type Chapter, type Manga, type ReaderPrefs, imageProxyUrl } from "@/lib/types";
import { cn } from "@/lib/utils";

const defaultPrefs: ReaderPrefs = {
  theme: "warm-light",
  direction: "vertical",
  fit: "width",
  brightness: 0,
  fontSize: 18,
  gap: 8,
};

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

export function ReaderClient({ manga, chapter, chapters }: { manga: Manga; chapter: Chapter; chapters: Chapter[] }) {
  const totalPages = Math.max(1, chapter.pages.length);
  const [showUi, setShowUi] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [prefs, setPrefs] = useState<ReaderPrefs>(defaultPrefs);
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
  const statusText =
    downloadState === "saving" ? "Đang lưu offline" :
    downloadState === "saved" ? "Đã lưu chương này" :
    downloadState === "error" ? "Không lưu được offline" :
    bookmarkState === "saving" ? "Đang lưu bookmark" :
    bookmarkState === "saved" ? "Đã lưu bookmark" :
    bookmarkState === "anonymous" ? "Đăng nhập để đồng bộ bookmark" :
    bookmarkState === "error" ? "Không lưu được bookmark" :
    `${currentPage}/${totalPages} · H ẩn/hiện · ? phím tắt`;

  const setReaderMode = (direction: ReaderPrefs["direction"]) => {
    setPrefs((current) => ({ ...current, direction }));
    setShowUi(true);
  };

  const setReaderFit = (fit: ReaderPrefs["fit"]) => {
    setPrefs((current) => ({ ...current, fit }));
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
        .then((payload: { prefs?: Partial<ReaderPrefs> } | null) => {
          if (active && payload?.prefs) setPrefs((current) => ({ ...current, ...payload.prefs }));
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
        setShowHelp(false);
        setShowSettings(false);
        setShowUi(true);
      }
      if (event.key === "?") {
        setShowHelp((value) => !value);
        setShowUi(true);
      }
      if (event.key.toLowerCase() === "h") setShowUi((value) => !value);
      if (event.key.toLowerCase() === "s") setShowSettings((value) => !value);
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
        <header className="fixed inset-x-0 top-0 z-30 border-b border-border bg-background/92 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur-xl md:px-4">
          <div className="scrollbar-none mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto">
            <Link
              href={`/manga/${encodeURIComponent(manga.id)}`}
              className="inline-flex h-10 max-w-[42vw] shrink-0 items-center gap-2 rounded-[var(--radius-control)] px-2 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring md:max-w-sm"
              aria-label="Quay lại truyện"
            >
              <ArrowLeft size={15} />
              <span className="truncate">{manga.title}</span>
            </Link>

            <div className="shrink-0 px-1 text-sm font-medium">Chương {chapter.number}</div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <div className="flex rounded-[var(--radius-control)] border border-border bg-secondary p-1" aria-label="Kiểu đọc">
                <QuickButton active={prefs.direction === "vertical"} onClick={() => setReaderMode("vertical")} label="Đọc dọc">↕</QuickButton>
                <QuickButton active={prefs.direction === "horizontal-ltr"} onClick={() => setReaderMode("horizontal-ltr")} label="Đọc ngang trái sang phải">→</QuickButton>
                <QuickButton active={prefs.direction === "horizontal-rtl"} onClick={() => setReaderMode("horizontal-rtl")} label="Đọc ngang phải sang trái">←</QuickButton>
              </div>

              <div className="flex rounded-[var(--radius-control)] border border-border bg-secondary p-1" aria-label="Fit ảnh">
                <QuickButton active={prefs.fit === "width"} onClick={() => setReaderFit("width")} label="Fit chiều rộng">W</QuickButton>
                <QuickButton active={prefs.fit === "height"} onClick={() => setReaderFit("height")} label="Fit chiều cao">H</QuickButton>
                <QuickButton active={prefs.fit === "original"} onClick={() => setReaderFit("original")} label="Kích thước gốc">1:1</QuickButton>
              </div>

              <QuickButton active={showSettings} onClick={() => setShowSettings(true)} label="Cài đặt reader">
                <Settings size={15} />
              </QuickButton>

              <QuickButton active={showHelp} onClick={() => setShowHelp((value) => !value)} label="Phím tắt reader">
                ?
              </QuickButton>
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
            <div className="h-full rounded-full bg-primary" style={{ width: `${scrollProgress}%` }} />
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
            <p className="meta-mono text-center leading-5">
              {statusText}
            </p>
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

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-3 backdrop-blur-sm md:items-center md:justify-center" onClick={() => setShowHelp(false)}>
          <section className="w-full rounded-[var(--radius-sheet)] border border-border bg-popover p-5 text-foreground shadow-2xl md:max-w-md" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Reader</p>
                <h2 className="section-title mt-1">Phím tắt</h2>
              </div>
              <IconButton onClick={() => setShowHelp(false)} aria-label="Đóng phím tắt">
                <X size={16} />
              </IconButton>
            </div>
            <dl className="mt-5 grid gap-3 text-sm">
              <Shortcut label="H" value="Ẩn hoặc hiện giao diện đọc" />
              <Shortcut label="?" value="Mở bảng phím tắt" />
              <Shortcut label="S" value="Mở cài đặt nâng cao" />
              <Shortcut label="F" value="Toàn màn hình" />
              <Shortcut label="← / →" value="Chuyển chương khi có chương trước/sau" />
            </dl>
          </section>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 p-0 backdrop-blur-sm md:items-stretch md:justify-end md:p-4" onClick={() => setShowSettings(false)}>
          <BottomSheet onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Reader</p>
                <h2 className="mt-1 section-title">Không gian đọc</h2>
              </div>
              <IconButton onClick={() => setShowSettings(false)} aria-label="Đóng cài đặt">
                <X size={16} />
              </IconButton>
            </div>
            <Setting label="Giao diện">
              <Segmented
                value={prefs.theme}
                options={[
                  { value: "warm-light", label: "Sáng dịu", icon: <Sun size={14} /> },
                  { value: "paper", label: "Giấy", icon: <Sun size={14} /> },
                  { value: "sepia", label: "Sepia", icon: <Sun size={14} /> },
                  { value: "graphite-dark", label: "Graphite", icon: <Moon size={14} /> },
                  { value: "pure-black", label: "OLED", icon: <Moon size={14} /> },
                ]}
                onChange={(theme) => setPrefs({ ...prefs, theme: theme as ReaderPrefs["theme"] })}
              />
            </Setting>
            <Setting label="Đồng bộ">
              <div className="grid grid-cols-2 gap-2">
                <AppButton type="button" variant="secondary" onClick={saveBookmark}>
                  <Bookmark size={15} /> Lưu
                </AppButton>
                <AppButton type="button" variant="secondary" onClick={warmCache}>
                  <Download size={15} /> Offline
                </AppButton>
              </div>
              <p className="meta-mono mt-3">{downloadState !== "idle" || bookmarkState !== "idle" ? statusText : `${currentPage}/${totalPages} đã đọc`}</p>
            </Setting>
            <Setting label="Cửa sổ">
              <AppButton type="button" variant="secondary" onClick={() => document.documentElement.requestFullscreen?.()}>
                <Maximize2 size={15} /> Toàn màn hình
              </AppButton>
            </Setting>
            <Setting label="Kiểu đọc">
              <Segmented
                value={prefs.direction}
                options={[
                  { value: "vertical", label: "Dọc", icon: <Smartphone size={14} /> },
                  { value: "horizontal-ltr", label: "LTR", icon: <Columns2 size={14} /> },
                  { value: "horizontal-rtl", label: "RTL", icon: <Columns2 size={14} /> },
                ]}
                onChange={(direction) => setPrefs({ ...prefs, direction: direction as ReaderPrefs["direction"] })}
              />
            </Setting>
            <Setting label="Khung ảnh">
              <Segmented
                value={prefs.fit}
                options={[
                  { value: "width", label: "Rộng", icon: <PanelTop size={14} /> },
                  { value: "height", label: "Cao", icon: <PanelTop size={14} /> },
                  { value: "smart", label: "Smart", icon: <PanelTop size={14} /> },
                  { value: "original", label: "Gốc", icon: <PanelTop size={14} /> },
                ]}
                onChange={(fit) => setPrefs({ ...prefs, fit: fit as ReaderPrefs["fit"] })}
              />
            </Setting>
            <Setting label={`Độ tối ${prefs.brightness}%`}>
              <input type="range" min="0" max="60" value={prefs.brightness} onChange={(event) => setPrefs({ ...prefs, brightness: Number(event.target.value) })} className="w-full accent-accent" />
            </Setting>
            <Setting label={`Cỡ UI ${prefs.fontSize}px`}>
              <input type="range" min="14" max="24" value={prefs.fontSize} onChange={(event) => setPrefs({ ...prefs, fontSize: Number(event.target.value) })} className="w-full accent-accent" />
            </Setting>
            <Setting label={`Khoảng cách trang ${prefs.gap}px`}>
              <input type="range" min="0" max="32" value={prefs.gap} onChange={(event) => setPrefs({ ...prefs, gap: Number(event.target.value) })} className="w-full accent-accent" />
            </Setting>
          </BottomSheet>
        </div>
      )}

      <div className="pointer-events-none fixed inset-0 z-20" style={{ background: `rgba(0,0,0,${prefs.brightness / 100})` }} />
    </div>
  );
}

function Setting({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-6 block">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </label>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: Array<{ value: string; label: string; icon?: ReactNode }>; onChange: (value: string) => void }) {
  return (
    <SegmentedControl>
      {options.map((option) => (
        <SegmentButton
          key={option.value}
          onClick={() => onChange(option.value)}
          active={value === option.value}
        >
          {option.icon} {option.label}
        </SegmentButton>
      ))}
    </SegmentedControl>
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
        "inline-flex h-8 min-w-8 items-center justify-center rounded-[calc(var(--radius-control)-2px)] px-2 text-xs font-semibold leading-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Shortcut({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-control)] bg-secondary px-3 py-2">
      <dt className="meta-mono inline-flex min-w-12 justify-center rounded bg-background px-2 py-1 text-foreground">{label}</dt>
      <dd className="text-right text-sm text-muted-foreground">{value}</dd>
    </div>
  );
}
