import { getReaderPreferences, readerPreferencesSchema } from "@/lib/reader-preferences-server";
import { createServerSupabaseClient, getVerifiedUser } from "@/lib/supabase/server";

const defaultPrefs = readerPreferencesSchema.parse({});

export async function GET() {
  const [supabase, user] = await Promise.all([createServerSupabaseClient(), getVerifiedUser()]);
  if (!user) return Response.json({ prefs: defaultPrefs, mode: supabase ? "anonymous" : "local-only" });
  const prefs = await getReaderPreferences(user.id);
  return Response.json({ prefs: prefs ?? defaultPrefs, mode: prefs ? "synced" : "empty" });
}

export async function PUT(request: Request) {
  const parsed = readerPreferencesSchema.safeParse(await request.json().catch(() => null));
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

  const { theme, direction, layout, fit, brightness, gap, fontSize } = parsed.data;
  const { error } = await supabase.from("reading_prefs").upsert({
    user_id: userData.user.id,
    theme,
    direction,
    ...(layout ? { layout } : {}),
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
