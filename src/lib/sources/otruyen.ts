import "server-only";

import { type Chapter, type Manga, makeScopedId, type PageImage, slugify } from "../types";
import { fetchJson, unique } from "./http";
import { applySearchFilters, type NormalizedSearchParams } from "./search-utils";

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

export async function searchOTruyen(query: string, options: Partial<Pick<NormalizedSearchParams, "page" | "status" | "sort" | "genres" | "year">> = {}) {
  const page = options.page ?? 1;
  const response = await fetchJson<Record<string, unknown>>(
    `${API}/tim-kiem?keyword=${encodeURIComponent(query)}&page=${page}`,
  );
  return applySearchFilters(itemsFromResponse(response).map(mapManga), {
    q: query,
    source: "otruyen",
    status: options.status ?? "all",
    sort: options.sort ?? "relevance",
    year: options.year ?? "all",
    page,
    genres: options.genres ?? [],
  });
}

export async function getRecentOTruyen(limit = 24) {
  // Fetch nhiều trang song song để có feed dày hơn (VN-first content).
  const pageCount = Math.ceil(limit / 24) || 1;
  const responses = await Promise.all(
    Array.from({ length: pageCount }, (_, index) =>
      fetchJson<Record<string, unknown>>(`${API}/danh-sach/truyen-moi?page=${index + 1}`).catch(() => null),
    ),
  );
  const merged = responses
    .filter((response): response is Record<string, unknown> => Boolean(response))
    .flatMap((response) => itemsFromResponse(response));
  return merged.slice(0, limit).map(mapManga);
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
    const encoded = encodeChapterApi(api);
    const number = asString(chapter.chapter_name || chapter.chapter_title || "?");
    const titleText = asString(chapter.chapter_title);
    // Phase F2: detect từ chapter_title hoặc chapter_name — nhiều truyện VN
    // upload sẽ gắn "(Manhwa)" / "(Manhua)" / "(Webtoon)" vào title.
    let direction: Chapter["direction"];
    const lower = `${titleText} ${number}`.toLowerCase();
    if (lower.includes("manhwa") || lower.includes("manhua") || lower.includes("webtoon")) {
      direction = "horizontal-ltr";
    }
    // Embed slug vào sourceId để getOTruyenChapter có thể tra ngược mangaId
    // (OTruyen chapter API không trả comic_slug).
    const scopedSourceId = `${slug}:${encoded}`;
    return {
      id: makeScopedId("otruyen", scopedSourceId),
      mangaId: makeScopedId("otruyen", slug),
      source: "otruyen",
      sourceId: scopedSourceId,
      number,
      title: titleText || null,
      pages: [],
      language: "vi",
      updatedAt: new Date().toISOString(),
      direction,
    } satisfies Chapter;
  });
}

export async function getOTruyenChapter(scopedSourceId: string) {
  // scopedSourceId format: "<mangaSlug>:<encodedChapterApi>"
  const colonIndex = scopedSourceId.indexOf(":");
  const slug = colonIndex === -1 ? "" : scopedSourceId.slice(0, colonIndex);
  const encodedApi = colonIndex === -1 ? scopedSourceId : scopedSourceId.slice(colonIndex + 1);
  const api = decodeChapterApi(encodedApi);
  const response = await fetchJson<Record<string, unknown>>(api);
  const data = (response.data || {}) as Record<string, unknown>;
  const item = (data.item || {}) as Record<string, unknown>;
  const domain = asString(data.domain_cdn || response.domain_cdn);
  const images = ((item.chapter_image || []) as Array<Record<string, unknown>>).filter(Boolean);

  // OTruyen chapter API không trả comic_slug → dùng slug từ scopedSourceId.
  const resolvedSlug = slug || asString(item.comic_slug) || "otruyen";

  const chapterPath = asString(item.chapter_path || "");
  const fallbackPath = `uploads/${asString(item.chapter_id || "")}`;

  const pages = images.map((image, index) => {
    const imageFile = asString(image.image_file);
    // Nếu image_file là full URL → dùng luôn.
    // Nếu là relative → ghép domain + chapter_path (hoặc fallback uploads/<id>).
    const basePath = chapterPath || fallbackPath;
    const url = imageFile.startsWith("http")
      ? imageFile
      : `${domain.replace(/\/+$/, "")}/${basePath.replace(/^\/+|\/+$/g, "")}/${imageFile}`;
    return { index, url };
  });

  // Bỏ các page có URL double-slash (malformed → 404) hoặc rỗng.
  const cleanPages = pages.filter((p) => {
    if (!p.url || !p.url.startsWith("http")) return false;
    // Chỉ giữ nếu URL không có "//" ở giữa path (sau scheme).
    const path = p.url.replace(/^https?:\/\//, "");
    return !path.includes("//");
  });

  return {
    id: makeScopedId("otruyen", scopedSourceId),
    mangaId: makeScopedId("otruyen", resolvedSlug),
    source: "otruyen",
    sourceId: scopedSourceId,
    number: asString(item.chapter_name || item.name || "?"),
    title: asString(item.chapter_title) || null,
    language: "vi",
    updatedAt: new Date().toISOString(),
    pages: stripOtruyenAdPages(cleanPages),
  } satisfies Chapter;
}

/**
 * Strip trang quảng cáo do uploader gắn vào chapter OTruyen
 * (thường là page 0 với banner "TRUYENQQ.COM" hoặc tương tự).
 * Đây là heuristic tạm — detect bằng filename pattern + page index đầu.
 */
function stripOtruyenAdPages(pages: PageImage[]): PageImage[] {
  if (pages.length < 2) return pages;
  const filtered = pages.filter((page, index) => {
    if (index === 0 && pages.length >= 8) {
      // Trang đầu thường là banner ad của nhóm dịch (đặc biệt khi chapter ngắn).
      // Heuristic: nếu URL chứa "page_0" và đây là OTruyen, bỏ qua.
      const url = page.url.toLowerCase();
      if (url.includes("page_0") || url.includes("page_00")) return false;
    }
    return true;
  });
  // Re-index để reader không bị nhảy số.
  return filtered.map((page, index) => ({ ...page, index }));
}
