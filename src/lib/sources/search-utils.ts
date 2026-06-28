import { type Manga, type MangaSearchFilters, type MangaSearchParams, type MangaSearchSort, type MangaSearchSource, type MangaStatus } from "../types";

const SEARCH_SOURCES: MangaSearchSource[] = ["all", "mangadex", "otruyen"];
const SEARCH_SORTS: MangaSearchSort[] = ["relevance", "latest", "hot", "popular", "rating"];
const SEARCH_STATUSES: Array<MangaStatus | "all"> = ["all", "ongoing", "completed", "hiatus", "cancelled", "unknown"];

export const DISCOVER_GENRES = [
  { value: "action", label: "Action" },
  { value: "romance", label: "Romance" },
  { value: "fantasy", label: "Fantasy" },
  { value: "isekai", label: "Isekai" },
  { value: "comedy", label: "Comedy" },
  { value: "drama", label: "Drama" },
  { value: "horror", label: "Horror" },
  { value: "slice of life", label: "Slice of Life" },
  { value: "sports", label: "Sports" },
  { value: "school life", label: "School Life" },
  { value: "boys love", label: "BL" },
  { value: "shoujo", label: "Shoujo" },
  { value: "shounen", label: "Shounen" },
  { value: "seinen", label: "Seinen" },
] as const;

export type NormalizedSearchParams = MangaSearchFilters;

function asSearchSource(value: unknown): MangaSearchSource {
  return SEARCH_SOURCES.includes(value as MangaSearchSource) ? value as MangaSearchSource : "all";
}

function asSearchSort(value: unknown, hasQuery: boolean): MangaSearchSort {
  return SEARCH_SORTS.includes(value as MangaSearchSort) ? value as MangaSearchSort : hasQuery ? "relevance" : "hot";
}

function asSearchStatus(value: unknown): MangaStatus | "all" {
  return SEARCH_STATUSES.includes(value as MangaStatus | "all") ? value as MangaStatus | "all" : "all";
}

export function normalizeGenres(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value.flatMap((item) => String(item).split(","))
    : typeof value === "string" ? value.split(",") : [];
  return Array.from(new Set(raw.map((item) => String(item).trim().toLowerCase()).filter(Boolean))).slice(0, 8);
}

function asSearchYear(value: unknown) {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  const currentYear = new Date().getFullYear();
  if (!text || text === "all") return "all";
  if (text === "older") return "older";
  const year = Number(text);
  if (Number.isInteger(year) && year >= 1970 && year <= currentYear) return String(year);
  return "all";
}

export function normalizeSearchParams(params: MangaSearchParams = {}): NormalizedSearchParams {
  const page = Number(params.page);
  const q = params.q?.trim() ?? "";

  return {
    q,
    source: asSearchSource(params.source),
    status: asSearchStatus(params.status),
    sort: asSearchSort(params.sort, Boolean(q)),
    year: asSearchYear(params.year),
    page: Number.isInteger(page) && page > 0 ? page : 1,
    genres: normalizeGenres(params.genres),
  };
}

export function searchCacheKey(params: NormalizedSearchParams) {
  const genres = params.genres.map((genre) => genre.toLowerCase()).sort().join("+") || "all";
  return [
    "search:v3",
    params.q.toLowerCase() || "home",
    params.source,
    params.status,
    params.sort,
    params.year,
    genres,
    params.page,
  ].join(":");
}

export function selectedSearchSources(source: MangaSearchSource): Array<"mangadex" | "otruyen"> {
  if (source === "mangadex" || source === "otruyen") return [source];
  return ["mangadex", "otruyen"];
}

export function allowsSearchFallback(source: MangaSearchSource) {
  return source === "all";
}

function dedupeKey(item: Manga) {
  const normalizedTitle = item.title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 80);
  return normalizedTitle || item.id;
}

export function dedupeManga(items: Manga[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = dedupeKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function itemYear(item: Manga) {
  const year = new Date(item.updatedAt).getFullYear();
  return Number.isInteger(year) ? year : null;
}

function foldText(value: string) {
  return value
    .replace(/[Đđ]/g, "d")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const GENRE_ALIASES: Record<string, string[]> = {
  action: ["action", "hanh dong"],
  romance: ["romance", "ngon tinh", "tinh cam", "lang man"],
  fantasy: ["fantasy", "huyen huyen", "huyen ao", "phep thuat", "magic"],
  isekai: ["isekai", "chuyen sinh", "xuyen khong", "xuyen nhanh", "trong sinh"],
  comedy: ["comedy", "hai huoc"],
  drama: ["drama", "tam ly"],
  horror: ["horror", "kinh di"],
  "slice of life": ["slice of life", "doi thuong", "cuoc song doi thuong"],
  sports: ["sports", "the thao"],
  "school life": ["school life", "hoc duong"],
  "boys love": ["boys love", "boy love", "bl", "dam my"],
  shoujo: ["shoujo", "shoujo ai"],
  shounen: ["shounen"],
  seinen: ["seinen"],
};

function genreNeedles(genre: string) {
  const folded = foldText(genre);
  return GENRE_ALIASES[folded] ?? [folded];
}

function hotScore(item: Manga) {
  const updated = Date.parse(item.updatedAt);
  const ageDays = Number.isFinite(updated) ? Math.max(0, (Date.now() - updated) / 86400000) : 365;
  const recency = Math.max(0, 365 - ageDays);
  const chapter = Number.parseFloat(item.lastChapter ?? "0") || 0;
  const rating = item.rating ?? 0;
  return recency * 2 + chapter * 0.4 + rating * 20;
}

export function applySearchFilters(items: Manga[], params: NormalizedSearchParams) {
  let results = items;

  if (params.status !== "all") {
    results = results.filter((item) => item.status === params.status);
  }

  if (params.genres.length) {
    const wanted = params.genres.map(genreNeedles);
    results = results.filter((item) => {
      const haystack = item.genres.map(foldText);
      return wanted.every((aliases) => aliases.some((genre) => haystack.some((candidate) => candidate.includes(genre))));
    });
  }

  if (params.year !== "all") {
    const currentYear = new Date().getFullYear();
    const oldestQuickYear = currentYear - 5;
    results = results.filter((item) => {
      const year = itemYear(item);
      if (!year) return false;
      return params.year === "older" ? year < oldestQuickYear : year === Number(params.year);
    });
  }

  if (params.sort === "latest") {
    results = results.slice().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  if (params.sort === "hot") {
    results = results.slice().sort((a, b) => hotScore(b) - hotScore(a));
  }

  if (params.sort === "popular" || params.sort === "rating") {
    results = results.slice().sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  return results;
}

export function sourceLimitations(params: NormalizedSearchParams, sources: MangaSearchSource[] | Array<"mangadex" | "otruyen">) {
  const limitations = new Set<string>();
  if (sources.includes("otruyen") && (params.sort === "popular" || params.sort === "rating")) {
    limitations.add("OTruyen không có tín hiệu popularity/rating ổn định, kết quả được sắp theo dữ liệu normalize sau khi fetch.");
  }
  if (params.year !== "all") {
    limitations.add("Year filter dùng updatedAt/source metadata hiện có, chưa phải năm phát hành chính thức cho mọi nguồn.");
  }
  if (params.sort === "hot") {
    limitations.add("Hot là điểm best-effort từ độ mới, chapter mới và rating/follow nếu nguồn cung cấp.");
  }
  return Array.from(limitations);
}

export function uniqueSources(items: Manga[]) {
  return Array.from(new Set(items.map((item) => item.source)));
}
