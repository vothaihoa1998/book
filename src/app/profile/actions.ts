"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ProfileSchema = z.object({
  displayName: z.string().trim().max(80, "Tên hiển thị tối đa 80 ký tự").optional(),
});

const PrefsSchema = z.object({
  theme: z.enum(["warm-light", "paper", "sepia", "graphite-dark", "pure-black"]),
  direction: z.enum(["vertical", "horizontal-ltr", "horizontal-rtl"]),
  fit: z.enum(["width", "height", "original", "smart"]),
});

export async function updateProfile(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/profile?status=supabase-env");

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const parsed = ProfileSchema.safeParse({ displayName: formData.get("displayName") });
  if (!parsed.success) redirect("/profile?status=invalid-profile");

  const metadataAvatar = userData.user.user_metadata?.avatar_url || userData.user.user_metadata?.picture;
  const avatarUrl = typeof metadataAvatar === "string" && metadataAvatar.trim() ? metadataAvatar.trim() : null;
  const displayName = parsed.data.displayName?.trim() || null;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userData.user.id,
      display_name: displayName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) redirect(`/profile?status=${encodeURIComponent(error.message)}`);

  revalidatePath("/profile");
  redirect("/profile?status=updated");
}

export async function updateProfilePrefs(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/profile?status=supabase-env");

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const parsed = PrefsSchema.safeParse({
    theme: formData.get("theme"),
    direction: formData.get("direction"),
    fit: formData.get("fit"),
  });
  if (!parsed.success) redirect("/profile?status=invalid-prefs");

  const { error } = await supabase.from("reading_prefs").upsert(
    {
      user_id: userData.user.id,
      theme: parsed.data.theme,
      direction: parsed.data.direction,
      fit: parsed.data.fit,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) redirect(`/profile?status=${encodeURIComponent(error.message)}`);

  revalidatePath("/profile");
  redirect("/profile?status=prefs-updated");
}
