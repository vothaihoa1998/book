import type { MangaSource } from "./types";

const IMAGE_HOSTS: Record<Exclude<MangaSource, "firecrawl">, (hostname: string) => boolean> = {
  mangadex: (hostname) =>
    hostname === "uploads.mangadex.org" || hostname.endsWith(".mangadex.network"),
  otruyen: (hostname) =>
    hostname === "img.otruyenapi.com" || hostname.endsWith(".otruyencdn.com"),
  sample: (hostname) => hostname === "images.unsplash.com",
};

export function isAllowedImageUrl(value: string, source: MangaSource) {
  if (source === "firecrawl") return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    return IMAGE_HOSTS[source](url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function parseRetryAfter(headers: Headers, now = Date.now()) {
  const rateLimitTimestamp = Number(headers.get("x-ratelimit-retry-after"));
  if (Number.isFinite(rateLimitTimestamp) && rateLimitTimestamp > 0) {
    const epochMs = rateLimitTimestamp > 10_000_000_000 ? rateLimitTimestamp : rateLimitTimestamp * 1_000;
    return Math.max(1_000, Math.min(3_600_000, epochMs - now));
  }

  const retryAfter = headers.get("retry-after");
  if (!retryAfter) return null;
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) return Math.max(1_000, Math.min(3_600_000, seconds * 1_000));
  const date = Date.parse(retryAfter);
  if (!Number.isFinite(date)) return null;
  return Math.max(1_000, Math.min(3_600_000, date - now));
}
