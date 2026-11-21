"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowLeft, ArrowRight, Bookmark, ChevronLeft, ChevronRight, Download, List,
  Maximize, MoreHorizontal, Settings2,
} from "lucide-react";
import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ReaderSettings } from "@/components/reader-settings";
import { Sheet } from "@/components/ui/sheet";
import {
  defaultReaderPrefs, orderChapters, resolvePrefetchCount, resolveReaderFormat, resolveReaderLayout,
} from "@/lib/reader-presets";
import {
  emptyReaderPreferenceStore, getReaderFormatOverride, getReaderProfile, normalizeReaderPrefs,
  parseReaderPreferenceStore, readerPreferencesStorageKey, setReaderFormatOverride, setReaderProfile,
} from "@/lib/reader-preferences";
import { readPosition, savePosition, type ReaderPosition } from "@/lib/reading-progress";
import {
  imageProxyUrl, type Chapter, type Manga, type ReaderDeviceClass, type ReaderFormatProfile,
  type ReaderPrefs,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const directions = { vertical: "Tự động", "horizontal-ltr": "Trái sang phải", "horizontal-rtl": "Phải sang trái" };

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
    const saved: unknown = JSON.parse(raw);
    const legacyDirection = localStorage.getItem(legacyKey);
    const direction = legacyDirection && Object.hasOwn(directions, legacyDirection) &&
      typeof saved === "object" && saved !== null && !("layout" in saved)
      ? legacyDirection : undefined;
    return normalizeReaderPrefs(
      typeof saved === "object" && saved !== null && direction
        ? { ...saved, direction }
        : saved,
      fallback,
    );
  } catch {
    return fallback;
  }
}

export function ReaderClient({ manga, chapter, chapters, userId, syncedPosition, syncedPrefs, initialAppTheme, resume }: ReaderProps) {
  const total = chapter.pages.length;
  const prefsKey = userId ? `inkrail-reader-prefs:${userId}` : "inkrail-reader-prefs";
  const [prefs, setPrefs] = useState(() => syncedPrefs ?? defaultReaderPrefs(initialAppTheme === "dark"));
  const [basePrefs, setBasePrefs] = useState(() => syncedPrefs ?? defaultReaderPrefs(initialAppTheme === "dark"));
  const [profileStore, setProfileStore] = useState(emptyReaderPreferenceStore);
  const [profileFormat, setProfileFormat] = useState<ReaderFormatProfile>(() => resolveReaderFormat(manga, chapter));
  const [prefsSaved, setPrefsSaved] = useState(true);
  const [ready, setReady] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [page, setPage] = useState(0);
  const [pageTurn, setPageTurn] = useState<"forward" | "backward" | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [panel, setPanel] = useState<"chapters" | "settings" | "actions" | null>(null);
  const [endReached, setEndReached] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState<"bookmark" | "offline" | null>(null);
  const [failedPage, setFailedPage] = useState<number[]>([]);
  const [attempts, setAttempts] = useState<Record<number, number>>({});
  const [activityTick, setActivityTick] = useState(0);
  const [networkHints, setNetworkHints] = useState<{ saveData?: boolean; effectiveType?: string; deviceMemory?: number }>({});
  const controlsVisible = useRef(true);
  const controlsShownAt = useRef(Number.NEGATIVE_INFINITY);
  const lastActivityAt = useRef(0);
  const pageRefs = useRef<Array<HTMLElement | null>>([]);
  const pendingJump = useRef<ReaderPosition | null>(null);
  const restoring = useRef(true);
  const lastPosition = useRef<ReaderPosition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const syncQueue = useRef(Promise.resolve());
  const preferencesQueue = useRef(Promise.resolve());
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const registerPage = useCallback((index: number, node: HTMLElement | null) => {
    pageRefs.current[index] = node;
  }, []);
  const markPageFailed = useCallback((index: number) => {
    setFailedPage((items) => items.includes(index) ? items : [...items, index]);
  }, []);
  const retryPage = useCallback((index: number) => {
    setFailedPage((items) => items.filter((item) => item !== index));
    setAttempts((items) => ({ ...items, [index]: (items[index] ?? 0) + 1 }));
  }, []);

  const updateControlsVisibility = useCallback((visible: boolean) => {
    if (controlsVisible.current === visible) return;
    controlsVisible.current = visible;
    if (visible) controlsShownAt.current = performance.now();
    setShowControls(visible);
  }, []);

  const deviceClass: ReaderDeviceClass = narrow ? "mobile" : "desktop";
  const markControlsActivity = useCallback(() => {
    if (!prefs.autoHide || !controlsVisible.current || panel) return;
    const now = performance.now();
    if (now - lastActivityAt.current < 400) return;
    lastActivityAt.current = now;
    setActivityTick((tick) => tick + 1);
  }, [panel, prefs.autoHide]);
  const layout = resolveReaderLayout(prefs, manga, chapter, narrow, profileFormat);
  const strip = layout === "strip";
  const fitSpread = !strip && prefs.fit !== "width";
  const step = layout === "double" ? 2 : 1;
  const start = Math.floor(page / step) * step;
  const end = Math.min(total, start + step);
  const rtl = prefs.direction === "horizontal-rtl" ||
    (prefs.direction === "vertical" && chapter.direction === "horizontal-rtl");
  const prefetchCount = resolvePrefetchCount(prefs, deviceClass, networkHints);
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
    type Connection = {
      saveData?: boolean;
      effectiveType?: string;
      addEventListener?: (type: "change", listener: () => void) => void;
      removeEventListener?: (type: "change", listener: () => void) => void;
    };
    const extendedNavigator = navigator as Navigator & { connection?: Connection; deviceMemory?: number };
    const connection = extendedNavigator.connection;
    const updateHints = () => setNetworkHints({
      saveData: connection?.saveData,
      effectiveType: connection?.effectiveType,
      deviceMemory: extendedNavigator.deviceMemory,
    });
    updateHints();
    connection?.addEventListener?.("change", updateHints);
    return () => connection?.removeEventListener?.("change", updateHints);
  }, []);

  useEffect(() => {
    if (!ready || strip || prefetchCount === 0) return;
    const preloaded: HTMLImageElement[] = [];
    for (let index = end; index < Math.min(total, end + prefetchCount); index += 1) {
      const image = new Image();
      image.decoding = "async";
      image.src = pageUrls[index];
      preloaded.push(image);
    }
    return () => {
      for (const image of preloaded) image.removeAttribute("src");
    };
  }, [end, pageUrls, prefetchCount, ready, strip, total]);

  useEffect(() => {
    const viewport = window.matchMedia("(max-width: 767px)");
    const frame = requestAnimationFrame(() => {
      const device = viewport.matches ? "mobile" : "desktop";
      const fallback = defaultReaderPrefs(initialAppTheme === "dark");
      let localStore = emptyReaderPreferenceStore();
      let legacyPrefs = fallback;
      let storageAvailable = true;
      try {
        localStore = parseReaderPreferenceStore(localStorage.getItem(readerPreferencesStorageKey));
        legacyPrefs = storedPrefs(prefsKey, `inkrail-reader-direction:${chapter.id}`, fallback);
      } catch {
        storageAvailable = false;
      }
      const base = normalizeReaderPrefs(syncedPrefs ?? legacyPrefs, fallback);
      const format = getReaderFormatOverride(localStore, manga.id) ?? resolveReaderFormat(manga, chapter);
      const savedProfile = localStore.byDeviceClass[device]?.[format];
      const current = savedProfile ? normalizeReaderPrefs(savedProfile, base) : base;
      const migratedStore = !savedProfile
        ? setReaderProfile(localStore, device, format, current)
        : localStore;

      setNarrow(viewport.matches);
      setBasePrefs(base);
      setProfileStore(migratedStore);
      setProfileFormat(format);
      setPrefs(current);
      if (!storageAvailable) {
        setPrefsSaved(false);
        setNotice("Cài đặt đang áp dụng nhưng trình duyệt không cho phép lưu trên thiết bị.");
      } else if (migratedStore !== localStore) {
        try {
          localStorage.setItem(readerPreferencesStorageKey, JSON.stringify(migratedStore));
        } catch {
          setPrefsSaved(false);
          setNotice("Cài đặt cũ đã được áp dụng nhưng chưa lưu được trên thiết bị.");
        }
      }

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
  }, [chapter, initialAppTheme, manga, prefsKey, resume, syncedPosition, syncedPrefs, total, userId]);

  useEffect(() => {
    if (!ready) return;
    const frame = requestAnimationFrame(() => {
      const nextPrefs = getReaderProfile(profileStore, deviceClass, profileFormat, basePrefs);
      if (JSON.stringify(nextPrefs) === JSON.stringify(prefs)) return;
      if (resolveReaderLayout(nextPrefs, manga, chapter, narrow, profileFormat) !== layout) {
        pendingJump.current = lastPosition.current ?? {
          pageIndex: page,
          pageOffset: 0,
          scrollPercent: 0,
        };
        restoring.current = true;
        setEndReached(false);
      }
      setPrefs(nextPrefs);
      if (nextPrefs.reduceMotion) setPageTurn(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [basePrefs, chapter, deviceClass, layout, manga, narrow, page, prefs, profileFormat, profileStore, ready]);

  useEffect(() => {
    if (!ready || !prefs.autoHide || !showControls || panel) return;
    const timeout = window.setTimeout(() => updateControlsVisibility(false), prefs.hideDelay * 1000);
    return () => window.clearTimeout(timeout);
  }, [activityTick, panel, prefs.autoHide, prefs.hideDelay, ready, showControls, updateControlsVisibility]);

  useEffect(() => {
    window.addEventListener("pointermove", markControlsActivity, { passive: true });
    window.addEventListener("pointerdown", markControlsActivity, { passive: true });
    window.addEventListener("touchstart", markControlsActivity, { passive: true });
    window.addEventListener("keydown", markControlsActivity);
    return () => {
      window.removeEventListener("pointermove", markControlsActivity);
      window.removeEventListener("pointerdown", markControlsActivity);
      window.removeEventListener("touchstart", markControlsActivity);
      window.removeEventListener("keydown", markControlsActivity);
    };
  }, [markControlsActivity]);

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
    if (!narrow || !ready || !prefs.autoHide) return;

    let previousY = window.scrollY;
    let previousDirection = 0;
    let distance = 0;
    let lastScrollAt = 0;
    let frame = 0;

    const onScroll = () => {
      markControlsActivity();
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
          now - controlsShownAt.current >= prefs.hideDelay * 1000) {
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
  }, [markControlsActivity, narrow, prefs.autoHide, prefs.hideDelay, ready, updateControlsVisibility]);

  const goToPage = useCallback((target: number) => {
    if (!ready) return;
    const destination = Math.max(0, Math.min(total - 1, target));
    if (!strip && !prefs.reduceMotion && Math.floor(destination / step) !== Math.floor(page / step)) {
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
  }, [jumpToStripPage, page, prefs.reduceMotion, ready, record, step, strip, total]);

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

  function persistProfileStore(nextStore: ReturnType<typeof setReaderProfile>) {
    setProfileStore(nextStore);
    try {
      localStorage.setItem(readerPreferencesStorageKey, JSON.stringify(nextStore));
      setPrefsSaved(true);
    } catch {
      setPrefsSaved(false);
      setNotice("Cài đặt áp dụng nhưng không lưu được trên thiết bị.");
    }
  }

  function preserveReadingAnchor() {
    pendingJump.current = lastPosition.current ?? {
      pageIndex: page,
      pageOffset: 0,
      scrollPercent: 0,
    };
    restoring.current = true;
    setEndReached(false);
  }

  function updatePrefs(patch: Partial<ReaderPrefs>) {
    const updated = normalizeReaderPrefs({ ...prefs, ...patch }, defaultReaderPrefs(initialAppTheme === "dark"));
    if (resolveReaderLayout(updated, manga, chapter, narrow, profileFormat) !== layout) {
      preserveReadingAnchor();
    }
    if (updated.reduceMotion) setPageTurn(null);
    setPrefs(updated);
    persistProfileStore(setReaderProfile(profileStore, deviceClass, profileFormat, updated));
    if (userId) {
      const { theme, direction, layout: savedLayout, fit, brightness, gap, fontSize } = updated;
      preferencesQueue.current = preferencesQueue.current.then(async () => {
        const response = await fetch("/api/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme, direction, layout: savedLayout, fit, brightness, gap, fontSize }),
          keepalive: true,
        });
        if (!response.ok) setNotice("Chưa đồng bộ được cài đặt cơ bản.");
      }).catch(() => setNotice("Chưa đồng bộ được cài đặt cơ bản."));
    }
  }

  function changeProfileFormat(format: ReaderFormatProfile) {
    if (format === profileFormat) return;
    const nextPrefs = getReaderProfile(profileStore, deviceClass, format, basePrefs);
    if (resolveReaderLayout(nextPrefs, manga, chapter, narrow, format) !== layout) preserveReadingAnchor();
    setProfileFormat(format);
    setPrefs(nextPrefs);
    const nextStore = setReaderProfile(
      setReaderFormatOverride(profileStore, manga.id, format),
      deviceClass,
      format,
      nextPrefs,
    );
    persistProfileStore(nextStore);
  }

  function resetProfile() {
    updatePrefs(defaultReaderPrefs(initialAppTheme === "dark"));
  }

  function toggleFullscreen() {
    const toggle = document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.();
    if (!toggle) setNotice("Thiết bị chưa hỗ trợ toàn màn hình.");
    else void toggle.catch(() => setNotice("Không mở được toàn màn hình."));
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
    <div className={cn("min-h-dvh bg-background pb-12 text-foreground", prefs.reduceMotion && "reader-reduce-motion")}>
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
            <IconButton label="Cài đặt đọc" onClick={() => setPanel("settings")} disabled={!ready}><Settings2 size={17} /></IconButton>
            <IconButton label="Thao tác khác" onClick={() => setPanel("actions")}><MoreHorizontal size={17} /></IconButton>
          </div>
        </header>
      )}

      <main className={cn("pt-3 bg-background text-foreground", `reader-theme-${prefs.theme}`, strip ? "mx-auto w-full max-w-5xl px-2 sm:px-4" : "w-full px-0")}
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest("button, a, input, textarea, select, [contenteditable]")) return;
          if (narrow && !showControls) {
            updateControlsVisibility(true);
            return;
          }
          if (!narrow || !prefs.tapEdges || strip || !showControls) return;
          const edge = window.innerWidth * 0.18;
          const forward = rtl ? event.clientX <= edge : event.clientX >= window.innerWidth - edge;
          const backward = rtl ? event.clientX >= window.innerWidth - edge : event.clientX <= edge;
          if (forward) goToPage(start + step);
          else if (backward) goToPage(start - step);
        }}
        onDoubleClick={(event) => {
          if (narrow || (event.target instanceof HTMLElement && event.target.closest("button, a, input, textarea, select, [contenteditable]"))) return;
          updateControlsVisibility(!controlsVisible.current);
        }}
        onTouchStart={(event) => {
          const point = event.touches[0];
          swipe.current = prefs.swipe && event.touches.length === 1 ? { x: point.clientX, y: point.clientY } : null;
        }}
        onTouchCancel={() => { swipe.current = null; }}
        onTouchEnd={(event) => {
          const first = swipe.current;
          swipe.current = null;
          if (!first || !prefs.swipe || strip || event.touches.length || !event.changedTouches.length) return;
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
              !strip && !prefs.reduceMotion && pageTurn && `reader-page-turn-${pageTurn}`,
            )}
            dir={!strip && rtl ? "rtl" : "ltr"} style={{ gap: layout === "single" ? 0 : prefs.gap }}>
            {pagesToShow.map((image, offset) => {
              const index = strip ? offset : start + offset;
              return (
                <ReaderImagePage
                  key={index}
                  index={index}
                  image={image}
                  url={pageUrls[index]}
                  attempt={attempts[index] ?? 0}
                  failed={failedPage.includes(index)}
                  isStrip={strip}
                  isCurrent={index === page}
                  eager={!strip || index === page || (index > page && index <= page + prefetchCount)}
                  fitSpread={fitSpread}
                  doubleSpread={layout === "double" && end - start === 2}
                  fit={prefs.fit}
                  brightness={prefs.brightness}
                  gap={layout === "double" && end - start === 2 ? prefs.gap : 0}
                  registerPage={registerPage}
                  onFailure={markPageFailed}
                  onRetry={retryPage}
                />
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

      {!strip && prefs.tapEdges && (
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
            "fixed inset-x-0 bottom-0 z-30 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 text-foreground transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none",
            !showControls && "pointer-events-none translate-y-full opacity-0",
          )}
          aria-label="Điều hướng đọc"
        >
          <div className="mx-auto flex max-w-4xl items-center gap-1.5 rounded-2xl border border-border bg-background/90 px-2 py-2 shadow-xl backdrop-blur-xl sm:gap-3 sm:rounded-full sm:px-4">
            {prev && <Link href={chapterHref(prev)} aria-label="Chương trước" className="shrink-0 rounded-lg border border-border p-2"><ArrowLeft size={16} /></Link>}
            {!strip && <IconButton label="Trang trước" disabled={start === 0} onClick={() => goToPage(start - step)}><ChevronLeft size={17} /></IconButton>}
            <input aria-label="Đi đến trang" aria-valuetext={`Trang ${page + 1} trên ${total}`} type="range" min={1} max={total} value={page + 1} onChange={(event) => goToPage(Number(event.target.value) - 1)} className="min-w-0 flex-1 accent-primary" />
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

      <Sheet open={panel === "actions"} onClose={() => setPanel(null)} ariaLabel="Thao tác đọc" maxHeightClass="max-h-[60dvh]">
        <h2 className="text-lg font-semibold">Thao tác đọc</h2>
        <div className="mt-4 grid gap-2">
          <ActionButton icon={<Bookmark size={16} />} onClick={() => { setPanel(null); void saveBookmark(); }} disabled={saving !== null}>
            Lưu truyện vào thư viện
          </ActionButton>
          <ActionButton icon={<Download size={16} />} onClick={() => { setPanel(null); void saveOffline(); }} disabled={saving !== null}>
            Tải ảnh chương về thiết bị
          </ActionButton>
          <ActionButton icon={<Maximize size={16} />} onClick={() => { setPanel(null); toggleFullscreen(); }}>
            Toàn màn hình
          </ActionButton>
        </div>
      </Sheet>

      <ReaderSettings
        open={panel === "settings"}
        onClose={() => setPanel(null)}
        prefs={prefs}
        layout={layout}
        format={profileFormat}
        saved={prefsSaved}
        onFormatChange={changeProfileFormat}
        onChange={updatePrefs}
        onReset={resetProfile}
      />
    </div>
  );
}

function IconButton({ children, label, onClick, disabled = false }: { children: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return <button title={label} aria-label={label} type="button" onClick={onClick} disabled={disabled} className="grid size-9 shrink-0 place-items-center rounded-lg border border-border hover:bg-secondary disabled:opacity-35">{children}</button>;
}

function ActionButton({
  icon,
  children,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-12 items-center gap-3 rounded-xl border border-border px-3 text-left text-sm font-medium hover:bg-secondary disabled:opacity-50"
    >
      {icon}<span>{children}</span>
    </button>
  );
}

const ReaderImagePage = memo(function ReaderImagePage({
  index,
  image,
  url,
  attempt,
  failed,
  isStrip,
  isCurrent,
  eager,
  fitSpread,
  doubleSpread,
  fit,
  brightness,
  gap,
  registerPage,
  onFailure,
  onRetry,
}: {
  index: number;
  image: Chapter["pages"][number];
  url: string;
  attempt: number;
  failed: boolean;
  isStrip: boolean;
  isCurrent: boolean;
  eager: boolean;
  fitSpread: boolean;
  doubleSpread: boolean;
  fit: ReaderPrefs["fit"];
  brightness: number;
  gap: number;
  registerPage: (index: number, node: HTMLElement | null) => void;
  onFailure: (index: number) => void;
  onRetry: (index: number) => void;
}) {
  const maxWidth = fitSpread && doubleSpread ? `calc((100vw - ${gap}px) / 2)` : undefined;
  return (
    <figure
      ref={(node) => registerPage(index, node)}
      className={cn(
        "relative min-w-0",
        (isStrip || !fitSpread) && "w-full",
        fitSpread && doubleSpread && "max-w-[50vw]",
        fitSpread && !doubleSpread && "max-w-full",
      )}
      style={maxWidth ? { maxWidth } : undefined}
      data-page={index + 1}
    >
      {failed ? (
        <div className="grid min-h-40 place-content-center bg-card p-4 text-center text-sm text-foreground">
          <p>Không tải được trang {index + 1}.</p>
          <button type="button" className="mt-2 text-primary underline" onClick={() => onRetry(index)}>Tải lại ảnh</button>
        </div>
      ) : (
        <img
          src={attempt && url.startsWith("/api/") ? `${url}&retry=${attempt}` : url}
          key={attempt}
          width={image.width ?? 800}
          height={image.height ?? 1200}
          alt={`Trang ${index + 1}`}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={isCurrent ? "high" : undefined}
          decoding="async"
          onError={() => onFailure(index)}
          className={cn(
            "mx-auto block h-auto max-w-full object-contain",
            fit === "width" && "w-full",
            fit === "smart" && cn("max-h-[calc(100dvh-9rem)]", fitSpread ? "w-auto" : "w-full"),
            fit === "height" && "max-h-[calc(100dvh-9rem)] w-auto",
          )}
          style={{ filter: brightness ? `brightness(${1 - brightness / 100})` : undefined }}
        />
      )}
    </figure>
  );
});
