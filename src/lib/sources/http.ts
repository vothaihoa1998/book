import "server-only";

import {
  assertUpstreamAvailable,
  assertMangaDexUserLimit,
  cacheUpstreamResponse,
  enqueueMangaDexRequest,
  parseRetryAfter,
  recordUpstreamResponse,
} from "../upstream";

type JsonValue = Record<string, unknown> | unknown[];

const USER_AGENT = "InkRail/0.1.0 (contact: contactinkrail@proton.me)";

function requestCacheKey(url: string, method: string | undefined, body: BodyInit | null | undefined) {
  const normalized = new URL(url);
  normalized.searchParams.sort();
  normalized.hash = "";
  let bodyKey: string;
  if (body === undefined || body === null) {
    bodyKey = "";
  } else if (typeof body === "string") {
    bodyKey = body;
  } else if (body instanceof URLSearchParams) {
    bodyKey = body.toString();
  } else if (body instanceof ArrayBuffer) {
    bodyKey = Buffer.from(body).toString("base64");
  } else if (ArrayBuffer.isView(body)) {
    bodyKey = Buffer.from(body.buffer, body.byteOffset, body.byteLength).toString("base64");
  } else {
    return null;
  }
  return JSON.stringify({ url: normalized.href, method: (method ?? "GET").toUpperCase(), body: bodyKey });
}

function cacheTtlForUrl(value: string) {
  const url = new URL(value);
  if (url.pathname.startsWith("/at-home/server/")) return 5 * 60;
  if (/\/manga\/[0-9a-f-]+\/feed$/i.test(url.pathname)) return 10 * 60;
  if (/\/manga\/[0-9a-f-]+$/i.test(url.pathname) || /\/chapter\/[0-9a-f-]+$/i.test(url.pathname)) {
    return 12 * 60 * 60;
  }
  return 5 * 60;
}

export async function fetchJson<T extends JsonValue>(
  url: string,
  init: RequestInit & {
    timeoutMs?: number;
    cacheTtlSeconds?: number;
    identity?: string;
    priority?: 0 | 1 | 2 | 3 | 4;
  } = {},
): Promise<T> {
  const { timeoutMs = 8000, cacheTtlSeconds = cacheTtlForUrl(url), headers, identity, priority, ...rest } = init;
  const upstreamUrl = new URL(url);
  const inferredPriority: 0 | 1 | 2 | 3 | 4 =
    priority ?? (/\/at-home\/server\/|\/chapter\/[^/]+/.test(upstreamUrl.pathname) ? 0
      : /^\/manga\/[^/]+$/.test(upstreamUrl.pathname) ? 1
      : upstreamUrl.pathname === "/manga/random" ? 4
      : upstreamUrl.pathname === "/manga" && upstreamUrl.searchParams.has("title") ? 2
      : upstreamUrl.pathname === "/manga" ? 3
      : 2);
  const requestHeaders = new Headers(headers);
  requestHeaders.delete("via");
  requestHeaders.set("accept", "application/json");
  requestHeaders.set("user-agent", USER_AGENT);
  const next = rest.next;
  const revalidate = typeof next?.revalidate === "number"
    ? Math.min(cacheTtlSeconds, next.revalidate)
    : cacheTtlSeconds;

  const load = async () => {
    const source = await assertUpstreamAvailable(url);
    if (source === "mangadex" && identity) {
      await assertMangaDexUserLimit(identity, url.includes("/manga?") || url.includes("title=") ? "search" : "api");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const startedAt = Date.now();
    try {
      return await enqueueMangaDexRequest(source === "mangadex" ? inferredPriority : 2, identity ?? "anonymous", async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          const response = await fetch(upstreamUrl, {
            ...rest,
            signal: controller.signal,
            headers: requestHeaders,
            next: { ...next, revalidate },
          });

          const retryAfter = await recordUpstreamResponse(source, response.status, response.headers);
          if (response.ok) return (await response.json()) as T;
          if (response.status === 403) throw new Error("Upstream access is paused for manual review.");
          if (response.status === 429 && attempt < 2) {
            const base = (retryAfter ?? 1000) * 2 ** attempt;
            const jitter = Math.floor(Math.random() * 250);
            await new Promise((resolve) => setTimeout(resolve, Math.min(5000, base + jitter)));
            continue;
          }
          const detailRetry = parseRetryAfter(response.headers);
          throw new Error(`Upstream request failed with HTTP ${response.status}${detailRetry ? `; retry after ${Math.ceil(detailRetry / 1000)} seconds` : ""}.`);
        }
        throw new Error("Upstream request exhausted bounded retries.");
      });
    } finally {
      clearTimeout(timeout);
      const duration = Date.now() - startedAt;
      void duration;
    }
  };
  const key = requestCacheKey(url, rest.method, rest.body);
  if (!key || revalidate <= 0) return load();
  const jitteredTtl = revalidate + Math.floor(Math.random() * Math.max(1, Math.floor(revalidate * 0.1)));
  return cacheUpstreamResponse(key, jitteredTtl, load);
}

export function pickLocalized(value: Record<string, string> | undefined | null) {
  if (!value) return "";
  return value.vi || value.en || value["en-us"] || Object.values(value).find(Boolean) || "";
}

export function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}
