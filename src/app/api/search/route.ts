import { searchMangaWithMeta } from "@/lib/sources";
import { normalizeGenres } from "@/lib/sources/search-utils";
import { type MangaSearchParams } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/search — search + filter catalog
 * - q: search term
 * - limit: limit results (for instant search dropdown, max 10)
 * - source/status/sort/year/genres: filter params
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = Math.max(1, Math.min(10, Number(limitParam) || 24));

  const params: MangaSearchParams = {
    q: url.searchParams.get("q") ?? "",
    source: url.searchParams.get("source") as MangaSearchParams["source"],
    status: url.searchParams.get("status") as MangaSearchParams["status"],
    sort: url.searchParams.get("sort") as MangaSearchParams["sort"],
    year: url.searchParams.get("year") ?? "all",
    page: Number(url.searchParams.get("page") ?? "1"),
    genres: normalizeGenres(url.searchParams.getAll("genres").length ? url.searchParams.getAll("genres") : url.searchParams.get("genres")),
  };
  const payload = await searchMangaWithMeta(params);
  const limited = limit ? payload.results.slice(0, limit) : payload.results;

  return Response.json({
    results: limited,
    hasMore: payload.meta.hasMore,
    total: payload.results.length,
    query: payload.meta.query,
    source: payload.meta.source,
    sourceUsed: payload.meta.sourceUsed,
    fallbackUsed: payload.meta.fallbackUsed,
    errors: payload.meta.errors,
  });
}
