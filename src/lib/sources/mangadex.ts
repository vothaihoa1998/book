import "server-only";

import { type Chapter, type Manga, makeScopedId, slugify } from "../types";
import { fetchJson, pickLocalized, unique } from "./http";

const API = "https://api.mangadex.org";

type MangaDexRelationship = {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
};

type MangaDexEntity = {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: MangaDexRelationship[];
};

type MangaDexListResponse = {
  data?: MangaDexEntity[];
};

type MangaDexSingleResponse = {
  data?: MangaDexEntity;
};

type MangaDexAtHomeResponse = {
  baseUrl: string;
  chapter: {
    hash: string;
    data?: string[];
    dataSaver?: string[];
  };
};

function queryString(params: Record<string, string | number | string[] | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, item));
    } else if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });
  return search.toString();
}

function relationship(entity: MangaDexEntity, type: string) {
  return entity.relationships?.find((item) => item.type === type);
}

function titleFrom(entity: MangaDexEntity) {
  return pickLocalized(entity.attributes.title as Record<string, string>) || "Untitled manga";
}

function mapStatus(status: unknown): Manga["status"] {
  if (status === "ongoing" || status === "completed" || status === "hiatus" || status === "cancelled") {
    return status;
  }
  return "unknown";
}

function mapManga(entity: MangaDexEntity): Manga {
  const title = titleFrom(entity);
  const coverRel = relationship(entity, "cover_art");
  const coverFile = coverRel?.attributes?.fileName as string | undefined;
  const authorRel = relationship(entity, "author") || relationship(entity, "artist");
  const tags = (entity.attributes.tags as MangaDexEntity[] | undefined) ?? [];
  const altTitles = ((entity.attributes.altTitles as Array<Record<string, string>> | undefined) ?? [])
    .map((item) => pickLocalized(item))
    .filter(Boolean);

  return {
    id: makeScopedId("mangadex", entity.id),
    source: "mangadex",
    sourceId: entity.id,
    slug: slugify(title) || entity.id,
    title,
    altTitles: unique(altTitles),
    cover: coverFile ? `https://uploads.mangadex.org/covers/${entity.id}/${coverFile}.512.jpg` : null,
    author: (authorRel?.attributes?.name as string | undefined) ?? null,
    status: mapStatus(entity.attributes.status),
    genres: tags.map((tag) => pickLocalized(tag.attributes.name as Record<string, string>)).filter(Boolean),
    description:
      pickLocalized(entity.attributes.description as Record<string, string>) ||
      "Chưa có mô tả tiếng Việt cho truyện này.",
    lastChapter: (entity.attributes.lastChapter as string | null | undefined) ?? null,
    updatedAt: (entity.attributes.updatedAt as string | undefined) ?? new Date().toISOString(),
    rating: null,
  };
}

function mapChapter(entity: MangaDexEntity, mangaId: string): Chapter {
  const chapterNumber = (entity.attributes.chapter as string | undefined) ?? "?";
  return {
    id: makeScopedId("mangadex", entity.id),
    mangaId,
    source: "mangadex",
    sourceId: entity.id,
    number: chapterNumber,
    title: (entity.attributes.title as string | null | undefined) ?? null,
    pages: [],
    language: (entity.attributes.translatedLanguage as string | undefined) ?? "vi",
    updatedAt: (entity.attributes.updatedAt as string | undefined) ?? new Date().toISOString(),
  };
}

export async function getPopularMangaDex(limit = 12) {
  const qs = queryString({
    limit,
    "includes[]": ["cover_art", "author", "artist"],
    "availableTranslatedLanguage[]": "vi",
    "contentRating[]": ["safe", "suggestive"],
    "order[followedCount]": "desc",
  });
  const response = await fetchJson<MangaDexListResponse>(`${API}/manga?${qs}`);
  return (response.data ?? []).map(mapManga);
}

export async function getRecentMangaDex(limit = 12) {
  const qs = queryString({
    limit,
    "includes[]": ["cover_art", "author", "artist"],
    "availableTranslatedLanguage[]": "vi",
    "contentRating[]": ["safe", "suggestive"],
    "order[latestUploadedChapter]": "desc",
  });
  const response = await fetchJson<MangaDexListResponse>(`${API}/manga?${qs}`);
  return (response.data ?? []).map(mapManga);
}

export async function searchMangaDex(query: string, page = 1, limit = 24) {
  const qs = queryString({
    limit,
    offset: Math.max(0, page - 1) * limit,
    title: query,
    "includes[]": ["cover_art", "author", "artist"],
    "availableTranslatedLanguage[]": "vi",
    "contentRating[]": ["safe", "suggestive"],
    "order[relevance]": "desc",
  });
  const response = await fetchJson<MangaDexListResponse>(`${API}/manga?${qs}`);
  return (response.data ?? []).map(mapManga);
}

export async function getMangaDex(id: string) {
  const qs = queryString({ "includes[]": ["cover_art", "author", "artist"] });
  const response = await fetchJson<MangaDexSingleResponse>(`${API}/manga/${id}?${qs}`);
  if (!response.data) return null;
  return mapManga(response.data);
}

async function fetchMangaDexChapterFeed(mangaId: string, language: string, limit: number) {
  const qs = queryString({
    limit,
    "translatedLanguage[]": language,
    "contentRating[]": ["safe", "suggestive"],
    "order[chapter]": "desc",
  });
  const response = await fetchJson<MangaDexListResponse>(`${API}/manga/${mangaId}/feed?${qs}`);
  return (response.data ?? [])
    .filter((chapter) => Number(chapter.attributes.pages ?? 0) > 0)
    .map((chapter) => mapChapter(chapter, makeScopedId("mangadex", mangaId)));
}

export async function getMangaDexChapters(mangaId: string, limit = 80) {
  const vietnamese = await fetchMangaDexChapterFeed(mangaId, "vi", limit);
  if (vietnamese.length) return vietnamese;
  return fetchMangaDexChapterFeed(mangaId, "en", limit);
}

export async function getMangaDexChapter(chapterId: string) {
  const [chapterResponse, pagesResponse] = await Promise.all([
    fetchJson<MangaDexSingleResponse>(`${API}/chapter/${chapterId}`),
    fetchJson<MangaDexAtHomeResponse>(`${API}/at-home/server/${chapterId}`),
  ]);

  if (!chapterResponse.data) return null;
  const mangaRel = relationship(chapterResponse.data, "manga");
  const mangaId = mangaRel ? makeScopedId("mangadex", mangaRel.id) : makeScopedId("mangadex", "unknown");
  const chapter = mapChapter(chapterResponse.data, mangaId);
  const pages = pagesResponse.chapter.data ?? pagesResponse.chapter.dataSaver ?? [];

  if (!pages.length) return null;

  return {
    ...chapter,
    pages: pages.map((fileName, index) => ({
      index,
      url: `${pagesResponse.baseUrl}/data/${pagesResponse.chapter.hash}/${fileName}`,
    })),
  } satisfies Chapter;
}
