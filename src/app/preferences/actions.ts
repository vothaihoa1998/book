"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { contentPreferencesCookie, contentPreferencesSchema } from "@/lib/content-preferences";
import { createServerSupabaseClient, getVerifiedUser } from "@/lib/supabase/server";

export async function saveContentPreferences(form: FormData) {
  const prefs = contentPreferencesSchema.safeParse({
    hiddenFormats: form.getAll("format"),
    hiddenDemographics: form.getAll("demographic"),
    hiddenTags: [...new Set(String(form.get("tags") ?? "").split(",").map((value) => value.trim()).filter(Boolean))],
    hideSuggestive: form.has("hideSuggestive"),
  });
  if (!prefs.success) redirect("/preferences?status=invalid");

  const [cookieStore, user, supabase] = await Promise.all([
    cookies(), getVerifiedUser(), createServerSupabaseClient(),
  ]);
  cookieStore.set(contentPreferencesCookie(user?.id), JSON.stringify(prefs.data), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
  });

  if (user && supabase) {
    const { error } = await supabase.from("reading_prefs").upsert({
      user_id: user.id, content_filters: prefs.data, updated_at: new Date().toISOString(),
    });
    if (error) redirect("/preferences?status=local");
  }

  revalidatePath("/");
  redirect("/preferences?status=saved");
}
