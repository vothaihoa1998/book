"use client";

import { Clock, Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiSearchHref, discoverSearchHref, type SearchFilterParams } from "@/lib/search-links";
import { mangaFormatLabels, type MangaFormat } from "@/lib/types";
import { cn } from "@/lib/utils";

const HISTORY_KEY = "inkrail-search-history";
const HISTORY_MAX = 10;
const POPULAR_QUERIES = ["one piece", "naruto", "conan", "bleach", "thám tử lùng danh conan", "blue lock", "spy x family"];

type InstantResult = {
  id: string;
  title: string;
  cover?: string | null;
  author?: string | null;
  lastChapter?: string | null;
  format?: MangaFormat;
  source: string;
  status?: string;
};

type InstantSearchProps = {
  className?: string;
  placeholder?: string;
  onNavigate?: () => void;
  defaultQuery?: string;
  filters?: SearchFilterParams;
  limit?: number;
  inputClassName?: string;
  dropdownClassName?: string;
};

/**
 * Phase H4: Instant search dropdown — debounce 300ms, fetch top 5, recent
 * history 10, popular chips. Click outside / Esc / submit dismisses dropdown.
 */
export function InstantSearch({
  className,
  placeholder = "Tìm truyện nhanh",
  onNavigate,
  defaultQuery = "",
  filters,
  limit = 5,
  inputClassName,
  dropdownClassName,
}: InstantSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState(defaultQuery);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(Boolean(defaultQuery.trim()));
  const [results, setResults] = useState<InstantResult[]>([]);
  const [sourceErrors, setSourceErrors] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aborterRef = useRef<AbortController | null>(null);

  // "/" focuses search
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const shortcut = event.key === "/" || (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey));
      if (!shortcut || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (event.key === "/" && target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const input = inputRef.current;
      if (!input?.getClientRects().length) return;
      event.preventDefault();
      input.focus();
      input.select();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click outside / Esc to close
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        inputRef.current && !inputRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    aborterRef.current?.abort();
    if (!query.trim()) {
      return;
    }
    debounceRef.current = setTimeout(async () => {
      aborterRef.current?.abort();
      const aborter = new AbortController();
      aborterRef.current = aborter;
      try {
        const res = await fetch(apiSearchHref(query.trim(), filters, limit), { signal: aborter.signal });
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as { results: InstantResult[]; errors?: string[] };
        if (!aborter.signal.aborted) {
          setResults(data.results);
          setSourceErrors(Boolean(data.errors?.length));
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResults([]);
        setSourceErrors(true);
      } finally {
        if (!aborter.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      aborterRef.current?.abort();
    };
  }, [filters, limit, query]);

  function saveToHistory(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    const next = [trimmed, ...history.filter((h) => h !== trimmed)].slice(0, HISTORY_MAX);
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function goSearch(q: string) {
    saveToHistory(q);
    setOpen(false);
    onNavigate?.();
    router.push(discoverSearchHref(q, filters));
  }

  function clearHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // ignore
    }
  }

  const showHistory = !query.trim() && history.length > 0;
  const showPopular = !query.trim();
  const showResults = Boolean(query.trim());

  return (
    <div className={cn("relative", className)}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          goSearch(query);
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            if (!nextQuery.trim()) {
              aborterRef.current?.abort();
              setResults([]);
              setLoading(false);
            } else {
              setLoading(true);
            }
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-keyshortcuts="Control+K Meta+K /"
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "h-9 w-full rounded-[var(--radius-control)] border border-border bg-card pl-9 pr-12 text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:border-input focus-visible:bg-background focus-visible:outline-none",
            inputClassName,
          )}
        />
        {query ? (
          <button
            type="button"
            aria-label="Xoá"
            onClick={() => {
              setQuery("");
              aborterRef.current?.abort();
              setResults([]);
              setLoading(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X size={12} />
          </button>
        ) : (
          <span
            className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-[var(--radius-control)] border border-border px-1.5 py-0.5 font-code text-[10px] leading-none text-muted-foreground lg:block"
            aria-hidden
          >
            /
          </span>
        )}
      </form>

      {open && (showHistory || showPopular || showResults) && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-y-auto rounded-[var(--radius-card)] border border-border bg-popover p-1.5 shadow-[0_24px_60px_-20px_rgba(60,28,8,0.35)]",
            dropdownClassName,
          )}
          aria-label="Gợi ý tìm kiếm"
        >
          {/* Loading state */}
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-[12px] text-muted-foreground">
              <Loader2 size={12} className="animate-spin" />
              <span>Đang tìm <span className="font-medium text-foreground">{query}</span>...</span>
            </div>
          )}

          {/* Results */}
          {showResults && !loading && results.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {results.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      saveToHistory(query);
                      setOpen(false);
                      onNavigate?.();
                      router.push(`/manga/${encodeURIComponent(m.id)}`);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2 py-1.5 text-left transition hover:bg-secondary"
                  >
                    <span className="block aspect-[2/3] w-9 shrink-0 overflow-hidden rounded bg-surface-strong ring-1 ring-border">
                      {m.cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.cover} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[13px] font-medium text-foreground">{m.title}</p>
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">
                        {m.author ? `${m.author} · ` : ""}
                        {m.lastChapter ? `Ch.${m.lastChapter}` : "—"}
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 font-code text-[9px] uppercase tracking-wider text-muted-foreground">
                      {m.format ? mangaFormatLabels[m.format] : m.source}
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => goSearch(query)}
                  className="mt-1 w-full rounded-[var(--radius-control)] bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Xem tất cả kết quả cho <span>{query}</span> →
                </button>
              </li>
            </ul>
          )}

          {/* No results */}
          {showResults && !loading && results.length === 0 && (
            <div className="px-3 py-4 text-center">
              <p className="text-[12px] text-muted-foreground">{sourceErrors ? "Một số nguồn tìm kiếm chưa phản hồi." : <>Không tìm thấy truyện cho <span className="font-medium text-foreground">{query}</span>.</>}</p>
              <button
                type="button"
                onClick={() => goSearch(query)}
                className="mt-2 text-[11px] font-medium text-primary hover:underline"
              >
                Vẫn mở trang tìm kiếm →
              </button>
            </div>
          )}

          {/* History */}
          {showHistory && (
            <div>
              <div className="flex items-center justify-between px-2 pt-1">
                <p className="font-code text-[10px] uppercase tracking-wider text-muted-foreground">Gần đây</p>
                <button type="button" onClick={clearHistory} className="text-[10px] text-muted-foreground hover:text-foreground">
                  Xoá
                </button>
              </div>
              <ul className="mt-1 flex flex-col gap-0.5">
                {history.map((h) => (
                  <li key={h}>
                    <button
                      type="button"
                      onClick={() => goSearch(h)}
                      className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-left transition hover:bg-secondary"
                    >
                      <Clock size={11} className="text-muted-foreground" />
                      <span className="line-clamp-1 flex-1 text-[12px] text-foreground">{h}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Popular */}
          {showPopular && (
            <div>
              <p className="px-2 pt-2 font-code text-[10px] uppercase tracking-wider text-muted-foreground">Xu hướng</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5 px-2 pb-2">
                {POPULAR_QUERIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => goSearch(q)}
                    className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-foreground transition hover:bg-primary hover:text-primary-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
