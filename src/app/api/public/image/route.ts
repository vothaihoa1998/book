import { type MangaSource } from "@/lib/types";

export const runtime = "nodejs";

const REFERERS: Partial<Record<MangaSource, string>> = {
  mangadex: "https://mangadex.org/",
  otruyen: "https://otruyenapi.com/",
  sample: "https://images.unsplash.com/",
};

function isBlockedHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const src = url.searchParams.get("src");
  const source = (url.searchParams.get("source") || "sample") as MangaSource;

  if (!src) return new Response("Missing src", { status: 400 });

  let target: URL;
  try {
    target = new URL(src);
  } catch {
    return new Response("Invalid src", { status: 400 });
  }

  if (!["http:", "https:"].includes(target.protocol) || isBlockedHost(target.hostname)) {
    return new Response("Blocked src", { status: 400 });
  }

  const upstream = await fetch(target, {
    headers: {
      referer: REFERERS[source] ?? target.origin,
      "user-agent": "InkRail/1.0 image proxy",
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
    next: { revalidate: 60 * 60 * 24 * 30 },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Image fetch failed", { status: upstream.status || 502 });
  }

  const headers = new Headers();
  headers.set("content-type", upstream.headers.get("content-type") || "image/jpeg");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-source-host", target.hostname);

  return new Response(upstream.body, { headers });
}
