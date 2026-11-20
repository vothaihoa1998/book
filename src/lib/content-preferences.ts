import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";
import { foldText } from "./sources/search-utils";
import { createServerSupabaseClient, getVerifiedUser } from "./supabase/server";
import type { Manga } from "./types";

export function contentPreferencesCookie(userId?: string) {
  return userId ? `inkrail-content-${userId}` : "inkrail-content";
}

export const contentPreferencesSchema = z.object({
  hiddenFormats: z.array(z.enum(["manga", "manhwa", "manhua"])).max(3).default([]),
  hiddenDemographics: z.array(z.enum(["shounen", "shoujo", "seinen", "josei"])).max(4).default([]),
  hiddenTags: z.array(z.string().trim().min(1).max(64)).max(16).default([]),
  hideSuggestive: z.boolean().default(false),
});

type ContentPreferences = z.infer<typeof contentPreferencesSchema>;

export async function getContentPreferences() {
  const [cookieStore, user, supabase] = await Promise.all([
    cookies(), getVerifiedUser(), createServerSupabaseClient(),
  ]);
  const device = readDevicePreferences(cookieStore.get(contentPreferencesCookie(user?.id))?.value);
  if (!user || !supabase) return device;

  const { data } = await supabase.from("reading_prefs").select("content_filters").eq("user_id", user.id).maybeSingle();
  const saved = contentPreferencesSchema.safeParse(data?.content_filters);
  return saved.success ? saved.data : device;
}

function readDevicePreferences(value: string | undefined) {
  try {
    return contentPreferencesSchema.parse(JSON.parse(value ?? "{}"));
  } catch {
    return contentPreferencesSchema.parse({});
  }
}

export function filterHomeFeed(items: Manga[], prefs: ContentPreferences) {
  const hiddenTags = new Set(prefs.hiddenTags.map(foldText));
  return items.filter((item) => {
    if (item.format && prefs.hiddenFormats.includes(item.format)) return false;
    if (prefs.hideSuggestive && item.contentRating === "suggestive") return false;
    if (prefs.hiddenDemographics.some((value) => value === item.demographic)) return false;
    return ![...item.genres, ...(item.themes ?? [])].some((tag) => hiddenTags.has(foldText(tag)));
  });
}
