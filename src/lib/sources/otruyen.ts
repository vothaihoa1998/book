import "server-only";

import { type Chapter, type Manga, makeScopedId, slugify } from "../types";
import { fetchJson, unique } from "./http";

const API = "https://otruyenapi.com/v1/api";
const CDN = "https://img.otruyenapi.com/uploads/comics";

type OTruyenItem = Record<string, unknown>;

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function coverUrl(item: OTruyenItem) {
  const thumb = asString(item.thumb_url || item.thumbnail || item.cover_url);
  if (!thumb) return null;
  if (thumb.startsWith("http")) return thumb;
  return `${CDN}/${thumb.replace(/^\/+/, "")}`;
}

function categories(item: OTruyenItem) {
  const raw = (item.category || item.categories || item.genre || []) as Array<Record<string, unknown>>;
  return raw
    .map((category) => asString(category.name || category.title || category.slug))
    .filter(Boolean);
}

function mapStatus(value: unknown): Manga["status"] {
  const text = asString(value).toLowerCase();
  if (text.includes("hoan") || text.includes("complete")) return "completed";
  if (text.includes("tam") || text.includes("hiatus")) return "hiatus";
  if (text.includes("drop") || text.includes("cancel")) return "cancelled";
  if (text) return "ongoing";
  return "unknown";
}

function mapManga(item: OTruyenItem): Manga {
  const slug = asString(item.slug) || slugify(asString(item.name || item.title));
  const title = asString(item.name || item.title) || slug;
  const latest = Array.isArray(item.chaptersLatest) ? item.chaptersLatest[0] as Record<string, unknown> | undefined : undefined;
  const author = Array.isArray(item.author)
    ? (item.author as unknown[]).map(asString).filter(Boolean).join(", ")
    : asString(item.author);

  return {
    id: makeScopedId("otruyen", slug),
    source: "otruyen",
    sourceId: slug,
    slug,
    title,
    altTitles: unique([asString(item.origin_name), asString(item.other_name)]),
    cover: coverUrl(item),
    author: author || null,
    status: mapStatus(item.status),
    genres: categories(item),
    description: asString(item.content || item.description).replace(/<[^>]*>/g, "").trim() || "Chưa có mô tả.",
    lastChapter: asString(latest?.chapter_name) || null,
    updatedAt: asString(item.updatedAt || item.updated_at) || new Date().toISOString(),
    rating: null,
  };
}

function encodeChapterApi(url: string) {
  return Buffer.from(url).toString("base64url");
}

function decodeChapterApi(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function itemsFromResponse(response: Record<string, unknown>) {
  const data = (response.data || {}) as Record<string, unknown>;
  return ((data.items || response.items || []) as OTruyenItem[]).filter(Boolean);
}

export async function searchOTruyen(query: string) {
  const response = await fetchJson<Record<string, unknown>>(
    `${API}/tim-kiem?keyword=${encodeURIComponent(query)}`,
  );
  return itemsFromResponse(response).map(mapManga);
}

export async function getRecentOTruyen(limit = 12) {
  const response = await fetchJson<Record<string, unknown>>(`${API}/danh-sach/truyen-moi?page=1`);
  return itemsFromResponse(response).slice(0, limit).map(mapManga);
}

export async function getOTruyenManga(slug: string) {
  const response = await fetchJson<Record<string, unknown>>(`${API}/truyen-tranh/${slug}`);
  const item = ((response.data || {}) as Record<string, unknown>).item as OTruyenItem | undefined;
  return item ? mapManga(item) : null;
}

export async function getOTruyenChapters(slug: string) {
  const response = await fetchJson<Record<string, unknown>>(`${API}/truyen-tranh/${slug}`);
  const item = ((response.data || {}) as Record<string, unknown>).item as OTruyenItem | undefined;
  const chapters = ((item?.chapters as Array<Record<string, unknown>> | undefined) ?? [])
    .flatMap((server) => (server.server_data as Array<Record<string, unknown>> | undefined) ?? [])
    .filter((chapter) => chapter.chapter_api_data);

  return chapters.map((chapter) => {
    const api = asString(chapter.chapter_api_data);
    const number = asString(chapter.chapter_name || chapter.chapter_title || "?");
    return {
      id: makeScopedId("otruyen", encodeChapterApi(api)),
      mangaId: makeScopedId("otruyen", slug),
      source: "otruyen",
      sourceId: encodeChapterApi(api),
      number,
      title: asString(chapter.chapter_title) || null,
      pages: [],
      language: "vi",
      updatedAt: new Date().toISOString(),
    } satisfies Chapter;
  });
}

export async function getOTruyenChapter(encodedApi: string) {
  const api = decodeChapterApi(encodedApi);
  const response = await fetchJson<Record<string, unknown>>(api);
  const data = (response.data || {}) as Record<string, unknown>;
  const item = (data.item || {}) as Record<string, unknown>;
  const domain = asString(data.domain_cdn || response.domain_cdn);
  const images = ((item.chapter_image || []) as Array<Record<string, unknown>>).filter(Boolean);
  const slug = asString(item.comic_slug || item.slug || "otruyen");

  return {
    id: makeScopedId("otruyen", encodedApi),
    mangaId: makeScopedId("otruyen", slug),
    source: "otruyen",
    sourceId: encodedApi,
    number: asString(item.chapter_name || item.name || "?"),
    title: asString(item.chapter_title) || null,
    language: "vi",
    updatedAt: new Date().toISOString(),
    pages: images.map((image, index) => {
      const imageFile = asString(image.image_file);
      const path = asString(image.chapter_path);
      return {
        index,
        url: imageFile.startsWith("http") ? imageFile : `${domain}/${path}/${imageFile}`,
      };
    }),
  } satisfies Chapter;
}
