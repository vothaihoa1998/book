import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ReaderPrefsSchema = z.object({
  theme: z.enum(["warm-light", "sepia", "graphite-dark", "pure-black"]).default("warm-light"),
  direction: z.enum(["vertical", "horizontal-ltr", "horizontal-rtl"]).default("vertical"),
  fit: z.enum(["width", "height", "original", "smart"]).default("width"),
  brightness: z.number().int().min(0).max(60).default(0),
  gap: z.number().int().min(0).max(32).default(8),
  fontSize: z.number().int().min(14).max(24).default(18),
});

const defaultPrefs = ReaderPrefsSchema.parse({});

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return Response.json({ prefs: defaultPrefs, mode: "local-only" });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return Response.json({ prefs: defaultPrefs, mode: "anonymous" });
  }

  const { data, error } = await supabase
    .from("reading_prefs")
    .select("theme, direction, fit, brightness, font_size, gap")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error || !data) {
    return Response.json({ prefs: defaultPrefs, mode: error ? "error" : "empty" });
  }

  return Response.json({
    prefs: ReaderPrefsSchema.parse({
      theme: data.theme,
      direction: data.direction,
      fit: data.fit,
      brightness: data.brightness,
      gap: data.gap,
      fontSize: data.font_size,
    }),
    mode: "synced",
  });
}

export async function PUT(request: Request) {
  const parsed = ReaderPrefsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid preferences" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return Response.json({ ok: true, mode: "local-only" });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return Response.json({ ok: true, mode: "anonymous" });
  }

  const { theme, direction, fit, brightness, gap, fontSize } = parsed.data;
  const { error } = await supabase.from("reading_prefs").upsert({
    user_id: userData.user.id,
    theme,
    direction,
    fit,
    brightness,
    gap,
    font_size: fontSize,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, mode: "synced" });
}
