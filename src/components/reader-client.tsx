"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, Columns2, Download, Maximize2, Moon, PanelTop, Settings, Smartphone, Sun, X } from "lucide-react";
import Link from "next/link";
import { AppButton, AppLinkButton, BottomSheet, FieldLabel, IconButton, IconLinkButton, SegmentButton, SegmentedControl } from "@/components/ui/primitives";
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

export function ReaderClient({ manga, chapter, chapters }: { manga: Manga; chapter: Chapter; chapters: Chapter[] }) {
  const [showUi, setShowUi] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState<ReaderPrefs>(readStoredPrefs);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [downloadState, setDownloadState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [bookmarkState, setBookmarkState] = useState<"idle" | "saving" | "saved" | "error" | "anonymous">("idle");
  const lastSync = useRef(0);
  const prefsMounted = useRef(false);

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
    "Chạm giữa màn hình để ẩn hoặc hiện giao diện";

  useEffect(() => {
    if (!showUi || showSettings) return;
    const timer = window.setTimeout(() => setShowUi(false), 3200);
    return () => window.clearTimeout(timer);
  }, [showUi, showSettings]);

  useEffect(() => {
    const progress = localStorage.getItem(`inkrail-progress:${chapter.id}`);
    if (progress) {
      const parsed = JSON.parse(progress) as { scrollPercent?: number };
      if (typeof parsed.scrollPercent === "number") {
        const scrollPercent = parsed.scrollPercent;
        requestAnimationFrame(() => {
          setScrollProgress(Math.min(100, Math.max(0, scrollPercent)));
          const max = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo({ top: (scrollPercent / 100) * max, behavior: "instant" });
        });
      }
    }
  }, [chapter.id]);

  useEffect(() => {
    let active = true;
    fetch("/api/preferences")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { prefs?: Partial<ReaderPrefs> } | null) => {
        if (active && payload?.prefs) setPrefs((current) => ({ ...current, ...payload.prefs }));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
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
  }, [prefs]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowUi(true);
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
    const syncProgress = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const scrollPercent = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
      const pageIndex = Math.min(chapter.pages.length - 1, Math.floor((scrollPercent / 100) * chapter.pages.length));
      const payload = { mangaId: manga.id, chapterId: chapter.id, pageIndex, scrollPercent };
      setScrollProgress(scrollPercent);
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
    };
    window.addEventListener("scroll", syncProgress, { passive: true });
    return () => window.removeEventListener("scroll", syncProgress);
  }, [chapter, manga.id]);

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
        <div className="fixed inset-x-0 top-0 z-30 border-b border-border bg-background/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <IconLinkButton href={`/manga/${encodeURIComponent(manga.id)}`} aria-label="Quay lại truyện">
              <ArrowLeft size={16} />
            </IconLinkButton>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-semibold">{manga.title}</p>
              <p className="text-xs font-medium text-muted">Ch. {chapter.number} · {chapter.pages.length} trang</p>
            </div>
            <IconButton onClick={warmCache} className="hidden sm:inline-flex" aria-label="Tải chương offline">
              <Download size={16} />
            </IconButton>
            <IconButton onClick={() => document.documentElement.requestFullscreen?.()} className="hidden sm:inline-flex" aria-label="Toàn màn hình">
              <Maximize2 size={16} />
            </IconButton>
            <IconButton onClick={() => setShowSettings(true)} variant="primary" aria-label="Cài đặt reader">
              <Settings size={16} />
            </IconButton>
          </div>
        </div>
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
          "mx-auto px-0 pb-28 pt-24 md:pt-28",
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
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/92 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl md:left-auto md:right-5 md:bottom-5 md:w-[380px] md:rounded-[var(--radius-card)] md:border md:pb-3 md:shadow-xl">
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-surface-strong">
            <div className="h-full rounded-full bg-accent-2" style={{ width: `${scrollProgress}%` }} />
          </div>
          <div className="flex items-center justify-between gap-3">
            {previousChapter ? (
              <AppLinkButton href={`/read/${encodeURIComponent(previousChapter.id)}`} variant="secondary" size="sm">
                <ArrowLeft size={15} /> Trước
              </AppLinkButton>
            ) : (
              <span />
            )}
            <AppButton onClick={saveBookmark} variant="secondary" size="sm">
              <Bookmark size={15} /> Lưu
            </AppButton>
            {nextChapter ? (
              <AppLinkButton href={`/read/${encodeURIComponent(nextChapter.id)}`} size="sm">
                Sau <ArrowRight size={15} />
              </AppLinkButton>
            ) : (
              <span />
            )}
          </div>
          <p className="mt-2 text-center text-xs font-medium text-muted">{statusText}</p>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 p-0 backdrop-blur-sm md:items-stretch md:justify-end md:p-4" onClick={() => setShowSettings(false)}>
          <BottomSheet onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted">Reader</p>
                <h2 className="mt-1 font-display text-3xl font-semibold">Không gian đọc</h2>
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

function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-6 block">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </label>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: Array<{ value: string; label: string; icon?: React.ReactNode }>; onChange: (value: string) => void }) {
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
