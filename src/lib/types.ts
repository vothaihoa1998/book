export type MangaSource = "mangadex" | "otruyen" | "sample" | "firecrawl";

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
};

export type PageImage = {
  index: number;
  url: string;
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
};

export type MangaSearchParams = {
  q?: string;
  genres?: string[];
  status?: string;
  sort?: string;
  page?: number;
};

export type HomePayload = {
  featured: Manga;
  trending: Manga[];
  recent: Manga[];
  recommended: Manga[];
};

export function makeScopedId(source: MangaSource, id: string) {
  return `${source}:${id}`;
}

export function parseScopedId(id: string): { source: MangaSource; sourceId: string } {
  const decoded = decodeURIComponent(id);
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

export function imageProxyUrl(src: string | null | undefined, source?: MangaSource) {
  if (!src) return "";
  if (src.startsWith("/")) return src;
  const params = new URLSearchParams({ src });
  if (source) params.set("source", source);
  return `/api/public/image?${params.toString()}`;
}
