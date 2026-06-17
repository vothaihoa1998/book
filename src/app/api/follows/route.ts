import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { type Json } from "@/lib/supabase/types";

const FollowSchema = z.object({
  mangaId: z.string().min(1),
  manga: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const parsed = FollowSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid follow" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return Response.json({ ok: true, mode: "local-only" });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return Response.json({ ok: true, mode: "anonymous" });
  }

  const { error } = await supabase.from("follows").upsert(
    {
      user_id: userData.user.id,
      manga_id: parsed.data.mangaId,
      manga: (parsed.data.manga as Json | undefined) ?? null,
    },
    { onConflict: "user_id,manga_id" },
  );

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, mode: "synced" });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const mangaId = url.searchParams.get("mangaId");
  if (!mangaId) {
    return Response.json({ ok: false, error: "Missing mangaId" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return Response.json({ ok: true, mode: "local-only" });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return Response.json({ ok: true, mode: "anonymous" });
  }

  const { error } = await supabase.from("follows").delete().eq("user_id", userData.user.id).eq("manga_id", mangaId);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, mode: "synced" });
}
