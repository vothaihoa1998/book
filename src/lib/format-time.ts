/**
 * Phase H1: relative time helper — "vừa xong" / "2 giờ trước" / "hôm qua" / "12/06"
 * Tiếng Việt, friendly, dùng cho chapter list và continue reading pill.
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diff = now.getTime() - then.getTime();
  if (Number.isNaN(diff)) return "—";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "hôm qua";
  if (day < 7) return `${day} ngày trước`;
  if (day < 30) {
    const wk = Math.floor(day / 7);
    return `${wk} tuần trước`;
  }
  if (day < 365) {
    const mo = Math.floor(day / 30);
    return `${mo} tháng trước`;
  }
  // > 1 năm → absolute date "12/06/2025"
  return then.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * "MỚI" badge — chapter update < 24h thì hiện.
 */
export function isNewChapter(iso: string, now: Date = new Date()): boolean {
  const then = new Date(iso);
  const diff = now.getTime() - then.getTime();
  return diff > 0 && diff < 24 * 60 * 60 * 1000;
}

/**
 * Phase H1: badges dựa trên progress %.
 */
export type ChapterBadge = "read" | "reading" | "fresh";
export function chapterBadge(progress: number | null | undefined): ChapterBadge | null {
  if (progress == null || progress < 5) return null;
  if (progress >= 95) return "read";
  return "reading";
}

/**
 * Phase H1: view count formatter — 1234 → "1.2K", 1500000 → "1.5M"
 */
export function formatCount(n: number | null | undefined): string | null {
  if (n == null || n <= 0) return null;
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1)}K`;
  if (n < 1000000) return `${Math.round(n / 1000)}K`;
  return `${(n / 1000000).toFixed(1)}M`;
}

/**
 * Phase H1: source short label.
 */
export function sourceShortLabel(source: string | null | undefined): string | null {
  if (!source) return null;
  if (source === "mangadex") return "MDX";
  if (source === "otruyen") return "OTR";
  if (source === "sample") return "DEMO";
  return source.slice(0, 3).toUpperCase();
}

/**
 * Phase H1: language short label.
 */
export function langShortLabel(lang: string | null | undefined): string {
  if (!lang) return "?";
  const l = lang.toLowerCase();
  if (l.startsWith("vi")) return "VI";
  if (l.startsWith("en")) return "EN";
  if (l.startsWith("ja")) return "JA";
  if (l.startsWith("ko")) return "KO";
  if (l.startsWith("zh")) return "ZH";
  return l.toUpperCase().slice(0, 2);
}