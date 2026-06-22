import "server-only";

import { type Chapter, type Manga, makeScopedId, slugify } from "../types";
import { fetchJson, pickLocalized, unique } from "./http";
import { type NormalizedSearchParams } from "./search-utils";

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

type MangaDexSearchOptions = Partial<Pick<NormalizedSearchParams, "page" | "status" | "sort" | "genres" | "year">> & {
  limit?: number;
};

const GENRE_TAG_IDS: Record<string, string> = {
  action: "391b0423-d847-456f-aff0-8b0cfc03066b",
  adventure: "87cc87cd-a395-47af-b27a-93258283bbc6",
  comedy: "4d32cc48-9f00-4cca-9b5a-a839f0764984",
  drama: "b9af3a63-f058-46de-a9a0-e0c13906197a",
  fantasy: "cdc58593-87dd-415e-bbc0-2ec27bf404cc",
  historical: "33771934-028e-4cb3-8744-691e866a923e",
  horror: "cdad7e68-1419-41dd-bdce-27753074a640",
  isekai: "ace04997-f6bd-436e-b261-779182193d3d",
  mecha: "50880a9d-5440-4732-9afb-8f457127e836",
  medical: "0bc90acb-ccc1-44ca-a34a-b9f3a73259d0",
  mystery: "ee968100-4191-4968-93d3-f82d72be7e46",
  psychological: "3b60b75c-a2d7-4860-ab56-05f391bb889c",
  romance: "423e2eae-a7a2-4a8b-ac03-a8351462d71d",
  school: "caaa44eb-cd40-4177-b930-79d3ef2afe87",
  "school life": "caaa44eb-cd40-4177-b930-79d3ef2afe87",
  "boys love": "5920b825-4181-4a17-beeb-9918b0ff7a30",
  bl: "5920b825-4181-4a17-beeb-9918b0ff7a30",
  "sci-fi": "256c8bd9-4904-4360-bf4f-508a76d67183",
  scifi: "256c8bd9-4904-4360-bf4f-508a76d67183",
  "slice of life": "e5301a23-ebd9-49dd-a0cb-2add944c7fe9",
  sports: "69964a64-2f90-4d33-beeb-f3ed2875eb4c",
  supernatural: "eabc5b4c-6aff-42f3-b657-3e90cbd00b75",
  thriller: "07251805-a27e-4d59-b488-f0bfbec15168",
  tragedy: "f8f62932-27da-4fe4-8ee1-6779a8c5edba",
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

function searchOrder(sort: MangaDexSearchOptions["sort"]) {
  if (sort === "latest") return { "order[latestUploadedChapter]": "desc" };
  if (sort === "hot" || sort === "popular") return { "order[followedCount]": "desc" };
  if (sort === "rating") return { "order[rating]": "desc" };
  return { "order[relevance]": "desc" };
}

function genreTags(genres: string[] | undefined) {
  return (genres ?? [])
    .map((genre) => GENRE_TAG_IDS[genre.toLowerCase()])
    .filter(Boolean);
}

function demographics(genres: string[] | undefined) {
  return (genres ?? []).filter((genre) => ["shoujo", "shounen", "seinen", "josei"].includes(genre.toLowerCase()));
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

export async function searchMangaDex(query: string, options: number | MangaDexSearchOptions = 1, limit = 24) {
  const normalized = typeof options === "number" ? { page: options, limit } : options;
  const tags = genreTags(normalized.genres);
  const demographicFilters = demographics(normalized.genres);
  const qs = queryString({
    limit: normalized.limit ?? limit,
    offset: Math.max(0, (normalized.page ?? 1) - 1) * (normalized.limit ?? limit),
    title: query,
    "includes[]": ["cover_art", "author", "artist"],
    "availableTranslatedLanguage[]": "vi",
    "contentRating[]": ["safe", "suggestive"],
    "status[]": normalized.status && normalized.status !== "all" ? normalized.status : undefined,
    "includedTags[]": tags.length ? tags : undefined,
    "publicationDemographic[]": demographicFilters.length ? demographicFilters : undefined,
    includedTagsMode: tags.length ? "AND" : undefined,
    ...searchOrder(normalized.sort),
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
    // Giữ chapter có pages > 0 HOẶC có externalUrl (bản exclusive bên thứ 3 vẫn đọc được).
    .filter((chapter) => {
      const pages = Number(chapter.attributes.pages ?? 0);
      const externalUrl = typeof chapter.attributes.externalUrl === "string" && chapter.attributes.externalUrl.length > 0;
      return pages > 0 || externalUrl;
    })
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
