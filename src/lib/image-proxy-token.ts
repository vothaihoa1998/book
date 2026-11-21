import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { parseScopedId, type Chapter, type Manga, type MangaSource, type PageImage } from "./types";

export type ImageProxyClaims = {
  source: MangaSource;
  scope: "manga" | "chapter";
  sourceId: string;
  groupId?: string;
  parentId?: string;
  url: string;
};

function getSecret() {
  const secret = process.env.IMAGE_PROXY_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return "inkrail-local-image-proxy-secret";
  throw new Error("IMAGE_PROXY_SECRET must be configured in production.");
}

export function createImageProxyToken(claims: ImageProxyClaims) {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyImageProxyToken(value: string, token: string | null, source: MangaSource): ImageProxyClaims | null {
  if (!token || token.length > 4096) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;

  const expected = createHmac("sha256", getSecret()).update(payload).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ImageProxyClaims;
    if (
      claims.source !== source ||
      claims.url !== value ||
      typeof claims.sourceId !== "string" ||
      !claims.sourceId ||
      (claims.scope !== "manga" && claims.scope !== "chapter") ||
      (claims.groupId !== undefined && typeof claims.groupId !== "string") ||
      (claims.parentId !== undefined && typeof claims.parentId !== "string")
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

export function withMangaImageToken(manga: Manga): Manga {
  if (!manga.cover) return manga;
  return {
    ...manga,
    coverProxyToken: createImageProxyToken({
      source: manga.source,
      scope: "manga",
      sourceId: manga.sourceId,
      url: manga.cover,
    }),
  };
}

export function withChapterImageTokens(chapter: Chapter): Chapter {
  return {
    ...chapter,
    pages: chapter.pages.map((page: PageImage) => ({
      ...page,
      proxyToken: createImageProxyToken({
        source: chapter.source,
        scope: "chapter",
        sourceId: chapter.sourceId,
        groupId: chapter.groupId,
        parentId: parseScopedId(chapter.mangaId).sourceId,
        url: page.url,
      }),
    })),
  };
}
