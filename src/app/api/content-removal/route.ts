import { z } from "zod";
import { assertRateLimit, hashIdentifier, trustedRequestIp, UpstreamRateLimitError } from "@/lib/upstream";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  claimantName: z.string().trim().min(2).max(120),
  claimantEmail: z.string().trim().email().max(254),
  claimType: z.enum(["scanlation_group_leader", "rights_holder"]),
  groupUrl: z.string().trim().max(2048).optional().default(""),
  contentUrl: z.string().trim().url().max(2048),
  details: z.string().trim().min(20).max(2000),
  confirmsAuthority: z.literal(true),
});

function isMangaDexUrl(value: string, route: "title" | "chapter" | "group") {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      ["mangadex.org", "www.mangadex.org"].includes(url.hostname.toLowerCase()) &&
      !url.username && !url.password &&
      url.pathname.startsWith(`/${route}/`);
  } catch {
    return false;
  }
}

function jsonResponse(payload: Record<string, unknown>, status: number) {
  return Response.json(payload, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

async function readLimitedBody(request: Request, maxBytes: number) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return jsonResponse({ error: "Cross-origin submissions are not accepted." }, 403);
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 8_192) {
    return jsonResponse({ error: "Request body is too large." }, 413);
  }

  const body = await readLimitedBody(request, 8_192);
  if (body === null) return jsonResponse({ error: "Request body is too large." }, 413);

  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return jsonResponse({ error: "Invalid JSON request." }, 400);
  }

  const parsed = requestSchema.safeParse(value);
  if (!parsed.success) return jsonResponse({ error: "Please check the request details." }, 400);
  const input = parsed.data;
  if (!isMangaDexUrl(input.contentUrl, "title") && !isMangaDexUrl(input.contentUrl, "chapter")) {
    return jsonResponse({ error: "Content URL must link to a MangaDex title or chapter." }, 400);
  }
  if (input.claimType === "scanlation_group_leader" && !isMangaDexUrl(input.groupUrl, "group")) {
    return jsonResponse({ error: "Group leader requests require a valid MangaDex group URL." }, 400);
  }
  if (input.groupUrl && !isMangaDexUrl(input.groupUrl, "group")) {
    return jsonResponse({ error: "Group URL must link to a MangaDex group." }, 400);
  }

  const ip = trustedRequestIp(request) ?? "unknown";
  const identifier = hashIdentifier(ip);
  try {
    await assertRateLimit("content-removal", identifier, 3, 10 * 60_000);
  } catch (error) {
    if (error instanceof UpstreamRateLimitError) {
      return Response.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "cache-control": "no-store", "retry-after": String(error.retryAfterSeconds) } },
      );
    }
    throw error;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return jsonResponse({ error: "The request intake service is not configured." }, 503);
  }

  const { data, error } = await supabase
    .from("content_removal_requests")
    .insert({
      claimant_name: input.claimantName,
      claimant_email: input.claimantEmail.toLowerCase(),
      claim_type: input.claimType,
      group_url: input.groupUrl || null,
      content_url: input.contentUrl,
      details: input.details,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Could not save a content removal request.", error?.message);
    return jsonResponse({ error: "Could not save the request. Please contact support." }, 503);
  }

  return jsonResponse({ requestId: data.id }, 201);
}
