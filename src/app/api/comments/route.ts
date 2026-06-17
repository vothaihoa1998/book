import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const CommentQuerySchema = z.object({
  mangaId: z.string().min(1),
  chapterId: z.string().min(1).optional().nullable(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
});

const CommentBodySchema = z.object({
  mangaId: z.string().min(1),
  chapterId: z.string().min(1).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  body: z.string().trim().min(1).max(1000),
});

function displayNameFromUser(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  const metadataName = user.user_metadata?.full_name || user.user_metadata?.name;
  if (typeof metadataName === "string" && metadataName.trim()) return metadataName.trim().slice(0, 80);
  return user.email?.split("@")[0]?.slice(0, 80) || "Bạn đọc";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = CommentQuerySchema.safeParse({
    mangaId: url.searchParams.get("mangaId"),
    chapterId: url.searchParams.get("chapterId"),
    sort: url.searchParams.get("sort") ?? "newest",
  });

  if (!parsed.success) {
    return Response.json({ ok: false, comments: [], error: "Invalid query" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return Response.json({ ok: true, comments: [], mode: "local-only" });
  }

  const { mangaId, chapterId, sort } = parsed.data;
  let query = supabase
    .from("comments")
    .select("id, user_id, author_name, manga_id, chapter_id, parent_id, body, created_at, updated_at")
    .eq("manga_id", mangaId)
    .is("deleted_at", null)
    .order("created_at", { ascending: sort === "oldest" })
    .limit(80);

  if (chapterId) query = query.eq("chapter_id", chapterId);

  const { data, error } = await query;
  if (error) {
    return Response.json({ ok: false, comments: [], error: error.message }, { status: 500 });
  }

  const { data: userData } = await supabase.auth.getUser();
  return Response.json({
    ok: true,
    comments: data ?? [],
    userId: userData.user?.id ?? null,
    mode: "synced",
  });
}

export async function POST(request: Request) {
  const parsed = CommentBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Comment phải từ 1-1000 ký tự." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return Response.json({ ok: false, mode: "local-only", error: "Chưa cấu hình Supabase." }, { status: 503 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return Response.json({ ok: false, mode: "anonymous", error: "Đăng nhập để bình luận." }, { status: 401 });
  }

  const profile = await supabase.from("profiles").select("display_name").eq("id", userData.user.id).maybeSingle();
  const authorName = profile.data?.display_name?.trim() || displayNameFromUser(userData.user);
  const { mangaId, chapterId, parentId, body } = parsed.data;
  const { data, error } = await supabase
    .from("comments")
    .insert({
      user_id: userData.user.id,
      author_name: authorName,
      manga_id: mangaId,
      chapter_id: chapterId || null,
      parent_id: parentId || null,
      body,
    })
    .select("id, user_id, author_name, manga_id, chapter_id, parent_id, body, created_at, updated_at")
    .single();

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, comment: data, mode: "synced" });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ ok: false, error: "Missing id" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return Response.json({ ok: false, mode: "local-only", error: "Chưa cấu hình Supabase." }, { status: 503 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return Response.json({ ok: false, mode: "anonymous", error: "Đăng nhập để xoá bình luận." }, { status: 401 });
  }

  const { error } = await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, mode: "synced" });
}
