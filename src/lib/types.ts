export type MangaSource = "mangadex" | "otruyen" | "sample" | "firecrawl";
export type MangaFormat = "manga" | "manhwa" | "manhua";
export type ContentRating = "safe" | "suggestive";

export const mangaFormatLabels: Record<MangaFormat, string> = {
  manga: "Manga",
  manhwa: "Manhwa",
  manhua: "Manhua",
};

export type MangaStatus =
  | "ongoing"
  | "completed"
  | "hiatus"
  | "cancelled"
  | "unknown";

export type Manga = {
  id: string;
  source: MangaSource;
  sourceId: string;
  slug: string;
  title: string;
  altTitles: string[];
  cover: string | null;
  author: string | null;
  status: MangaStatus;
  genres: string[];
  description: string;
  lastChapter: string | null;
  updatedAt: string;
  rating: number | null;
  format?: MangaFormat;
  releaseYear?: number;
  languages?: string[];
  contentRating?: ContentRating;
  demographic?: string;
  themes?: string[];
  artist?: string;
  coverProxyToken?: string;
};

export type ReaderTheme = "warm-light" | "paper" | "sepia" | "graphite-dark" | "pure-black";

export type ReaderDirection = "vertical" | "horizontal-ltr" | "horizontal-rtl";
export type ReaderLayout = "auto" | "single" | "double" | "strip";

export type ReaderFit = "width" | "height" | "original" | "smart";
export type ReaderFormatProfile = "manga" | "webtoon";
export type ReaderDeviceClass = "mobile" | "desktop";
export type ReaderPrefetch = "auto" | "1" | "3";

export type ReaderPrefs = {
  theme: ReaderTheme;
  direction: ReaderDirection;
  layout?: ReaderLayout;
  fit: ReaderFit;
  /** Image dim amount, 0..35 percent. */
  brightness: number;
  fontSize: number;
  gap: number;
  tapEdges: boolean;
  swipe: boolean;
  autoHide: boolean;
  hideDelay: number;
  reduceMotion: boolean;
  dataSaver: boolean;
  prefetch: ReaderPrefetch;
};

export type PageImage = {
  index: number;
  url: string;
  proxyToken?: string;
  width?: number;
  height?: number;
};

export type Chapter = {
  id: string;
  mangaId: string;
  source: MangaSource;
  sourceId: string;
  number: string;
  title: string | null;
  pages: PageImage[];
  language: string;
  updatedAt: string;
  externalUrl?: string;
  group?: string;
  groupId?: string;
  /** Optional reading progress 0..1 for the current user. */
  progress?: number | null;
  /** Optional last read page index (0-based) for the current user. */
  lastPageIndex?: number | null;
  /** Phase F2: optional reading direction for THIS chapter. Overrides Manga.direction.
   *  Source adapters fill this from `originalLanguage` (MangaDex) or category tags
   *  (OTruyen: manhwa/manhua/webtoon → LTR). Defaults to Manga.direction at read time. */
  direction?: ReaderDirection;
  /** Optional view count for chapter list density. */
  views?: number | null;
};

export type MangaSearchParams = {
  q?: string;
  genres?: string[];
  source?: MangaSearchSource;
  status?: MangaStatus | "all";
  sort?: MangaSearchSort;
  year?: string;
  releaseYear?: string;
  language?: string;
  format?: string;
  page?: number;
  /** Hashed, server-derived identity. Never populated from a client. */
  requestIdentity?: string;
};

export type MangaSearchSource = "all" | "mangadex" | "otruyen";

export type MangaSearchSort = "relevance" | "latest" | "hot" | "popular" | "rating";

export type MangaSearchFilters = {
  q: string;
  source: MangaSearchSource;
  status: MangaStatus | "all";
  sort: MangaSearchSort;
  year: string;
  releaseYear: string;
  language: string;
  format: "all" | MangaFormat;
  page: number;
  genres: string[];
};

export type MangaSearchMeta = {
  query: string;
  source: MangaSearchSource;
  filters: MangaSearchFilters;
  sourceUsed: MangaSource[];
  fallbackUsed: boolean;
  page: number;
  hasMore: boolean;
  total?: number;
  errors: string[];
  sourceLimitations: string[];
};

export type MangaSearchResult = {
  results: Manga[];
  meta: MangaSearchMeta;
};

export type HomePayload = {
  trending: Manga[];
  recent: Manga[];
  errors?: string[];
};

export function makeScopedId(source: MangaSource, id: string) {
  return `${source}:${id}`;
}

export function parseScopedId(id: string): { source: MangaSource; sourceId: string } {
  let decoded = id;
  try {
    decoded = decodeURIComponent(id);
  } catch {
    // Route params can already contain a decoded percent sign.
  }
  const index = decoded.indexOf(":");

  if (index === -1) {
    return { source: "sample", sourceId: decoded };
  }

  const source = decoded.slice(0, index) as MangaSource;
  const sourceId = decoded.slice(index + 1);

  if (["mangadex", "otruyen", "sample", "firecrawl"].includes(source)) {
    return { source, sourceId };
  }

  return { source: "sample", sourceId: decoded };
}

export function slugify(value: string) {
  return value
    .replace(/[Đđ]/g, "d")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

export function imageProxyUrl(src: string | null | undefined, source?: MangaSource, token?: string) {
  if (!src) return "";
  if (src.startsWith("/")) return src;
  const params = new URLSearchParams({ src });
  if (source) params.set("source", source);
  if (token) params.set("token", token);
  return `/api/public/image?${params.toString()}`;
}
