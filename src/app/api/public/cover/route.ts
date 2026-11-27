import { getRequestContext } from "@/lib/request-context";
import { getManga } from "@/lib/sources";
import { imageProxyUrl } from "@/lib/types";

export async function GET(request: Request) {
  const ids = [...new Set(new URL(request.url).searchParams.getAll("id"))];
  if (!ids.length || ids.length > 3 || ids.some((id) => !/^(?:(?:mangadex|otruyen|sample):)?[\w-]{1,128}$/.test(id))) {
    return Response.json({}, { status: 400 });
  }

  const { identity } = await getRequestContext();
  const covers = await Promise.all(ids.map(async (id) => {
    const manga = await getManga(id, identity);
    return [id, manga ? imageProxyUrl(manga.cover, manga.source, manga.coverProxyToken) : ""];
  }));

  return Response.json(Object.fromEntries(covers));
}
