import { searchManga } from "@/lib/sources";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const page = Number(url.searchParams.get("page") ?? "1");
  const status = url.searchParams.get("status") ?? "all";
  const results = await searchManga({ q, page, status });

  return Response.json({ results });
}
