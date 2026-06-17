import { searchMangaWithMeta } from "@/lib/sources";
import { normalizeGenres } from "@/lib/sources/search-utils";
import { type MangaSearchParams } from "@/lib/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
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

  return Response.json(payload);
}
