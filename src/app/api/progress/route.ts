import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ProgressSchema = z.object({
  mangaId: z.string().min(1),
  chapterId: z.string().min(1),
  pageIndex: z.number().int().min(0).default(0),
  pageOffset: z.number().min(0).max(1).optional(),
  scrollPercent: z.number().min(0).max(100).default(0),
});

export async function POST(request: Request) {
  const parsed = ProgressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return Response.json({ ok: true, mode: "local-only" });
  }

  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) {
    return Response.json({ ok: true, mode: "anonymous" });
  }

  const { mangaId, chapterId, pageIndex, pageOffset, scrollPercent } = parsed.data;
  const { error: writeError } = await supabase.from("reading_history").upsert(
    {
      user_id: userData.user.id,
      manga_id: mangaId,
      chapter_id: chapterId,
      page_index: pageIndex,
      ...(pageOffset !== undefined ? { page_offset: pageOffset } : {}),
      scroll_percent: scrollPercent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,manga_id,chapter_id" },
  );

  if (writeError) {
    return Response.json({ ok: false, error: writeError.message }, { status: 500 });
  }

  return Response.json({ ok: true, mode: "synced" });
}
