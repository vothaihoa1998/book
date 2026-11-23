import { createHash } from "node:crypto";
import type { MangaSource } from "@/lib/types";
import { isAllowedImageUrl } from "@/lib/upstream-policy";
import { verifyImageProxyToken } from "@/lib/image-proxy-token";
import { isContentRemoved } from "@/lib/content-removals";
import {
  assertRateLimit,
  assertUpstreamAvailable,
  UpstreamBlockedError,
  UpstreamCooldownError,
  UpstreamRateLimitError,
  parseRetryAfter,
  recordUpstreamResponse,
  trustedRequestIp,
} from "@/lib/upstream";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"]);
const SOURCES = new Set<MangaSource>(["mangadex", "otruyen", "sample"]);

function limitedBody(body: ReadableStream<Uint8Array>, maxBytes: number, finish: () => void) {
  const reader = body.getReader();
  let total = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          finish();
          controller.close();
          return;
        }
        total += value.byteLength;
        if (total > maxBytes) {
          finish();
          await reader.cancel();
          controller.error(new Error("Image response exceeded the size limit."));
          return;
        }
        controller.enqueue(value);
      } catch (error) {
        finish();
        controller.error(error);
      }
    },
    cancel(reason) {
      finish();
      return reader.cancel(reason);
    },
  });
}

function responseHeaders() {
  return new Headers({
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "cross-origin-resource-policy": "same-site",
  });
}

function limitedResponse(retryAfterSeconds: number) {
  const headers = responseHeaders();
  headers.set("retry-after", String(retryAfterSeconds));
  return new Response("Temporarily rate limited", { status: 429, headers });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const src = url.searchParams.get("src");
  const sourceValue = url.searchParams.get("source") || "sample";

  if (!src) return new Response("Missing src", { status: 400, headers: responseHeaders() });
  if (!SOURCES.has(sourceValue as MangaSource)) {
    return new Response("Unsupported source", { status: 400, headers: responseHeaders() });
  }

  const source = sourceValue as MangaSource;
  if (!isAllowedImageUrl(src, source)) {
    return new Response("Blocked image source", { status: 400, headers: responseHeaders() });
  }
  const claims = verifyImageProxyToken(src, url.searchParams.get("token"), source);
  if (!claims) return new Response("Invalid image proxy signature", { status: 403, headers: responseHeaders() });
  if (await isContentRemoved(claims)) {
    return new Response("This content is no longer available", { status: 410, headers: responseHeaders() });
  }

  const target = new URL(src);
  const ip = trustedRequestIp(request) ?? "unknown";
  const identifier = createHash("sha256").update(ip).digest("hex");
  let upstreamSource: Awaited<ReturnType<typeof assertUpstreamAvailable>> | null = null;

  try {
    await assertRateLimit("public-image", identifier, 180, 60_000);
    if (source !== "sample") upstreamSource = await assertUpstreamAvailable(target.href);
  } catch (error) {
    if (error instanceof UpstreamRateLimitError || error instanceof UpstreamCooldownError) {
      return limitedResponse(error.retryAfterSeconds);
    }
    if (error instanceof UpstreamBlockedError) {
      return new Response("Upstream access is paused for manual review", {
        status: 503,
        headers: responseHeaders(),
      });
    }
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let streaming = false;
  try {
    const upstream = await fetch(target, {
      redirect: "error",
      signal: controller.signal,
      headers: {
        accept: "image/avif,image/webp,image/apng,image/jpeg,image/png,image/gif,*/*;q=0.5",
        "user-agent": "InkRail/0.1.0 (contact: contactinkrail@proton.me)",
      },
      next: { revalidate: 60 },
    });

    // An expired image session must not permanently disable the catalog API.
    const cooldownSeconds = upstreamSource && upstream.status !== 403
      ? await recordUpstreamResponse(upstreamSource, upstream.status, upstream.headers)
      : null;

    if (!upstream.ok || !upstream.body) {
      const retryAfter = parseRetryAfter(upstream.headers);
      if (upstream.status === 429) {
        return limitedResponse(cooldownSeconds ?? Math.max(1, Math.ceil((retryAfter ?? 1_000) / 1_000)));
      }
      if (upstream.status === 403) {
        return new Response("Upstream denied the image request", { status: 403, headers: responseHeaders() });
      }
      return new Response("Image fetch failed", {
        status: upstream.status === 404 ? 404 : 502,
        headers: responseHeaders(),
      });
    }

    const contentType = upstream.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (!contentType || !IMAGE_TYPES.has(contentType)) {
      return new Response("Unsupported image type", { status: 415, headers: responseHeaders() });
    }

    const contentLength = Number(upstream.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
      return new Response("Image is too large", { status: 413, headers: responseHeaders() });
    }

    const headers = responseHeaders();
    headers.set("content-type", contentType);
    headers.set("x-source-host", target.hostname);
    if (Number.isFinite(contentLength) && contentLength > 0) {
      headers.set("content-length", String(contentLength));
    }

    streaming = true;
    return new Response(limitedBody(upstream.body, MAX_IMAGE_BYTES, () => clearTimeout(timeout)), { headers });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return new Response("Image source timed out", { status: 504, headers: responseHeaders() });
    }
    throw error;
  } finally {
    if (!streaming) clearTimeout(timeout);
  }
}
