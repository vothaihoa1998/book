import { getUpstreamMetrics } from "@/lib/upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = process.env.METRICS_TOKEN?.trim();
  if (!token) return new Response("Metrics are disabled", { status: 404 });
  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${token}`) {
    return new Response("Unauthorized", { status: 401, headers: { "cache-control": "no-store" } });
  }
  return Response.json(getUpstreamMetrics(), {
    headers: { "cache-control": "no-store" },
  });
}
