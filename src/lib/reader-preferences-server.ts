import "server-only";

import { z } from "zod";
import { createServerSupabaseClient } from "./supabase/server";

export const readerPreferencesSchema = z.object({
  theme: z.enum(["warm-light", "paper", "sepia", "graphite-dark", "pure-black"]).default("warm-light"),
  direction: z.enum(["vertical", "horizontal-ltr", "horizontal-rtl"]).default("horizontal-ltr"),
  layout: z.enum(["auto", "single", "double", "strip"]).optional(),
  fit: z.enum(["width", "height", "original", "smart"]).default("smart"),
  brightness: z.number().int().min(0).max(60).default(0),
  gap: z.number().int().min(0).max(32).default(8),
  fontSize: z.number().int().min(14).max(24).default(18),
  tapEdges: z.boolean().default(true),
  swipe: z.boolean().default(true),
  autoHide: z.boolean().default(true),
  hideDelay: z.number().int().min(2).max(8).default(3),
  reduceMotion: z.boolean().default(false),
  dataSaver: z.boolean().default(false),
  prefetch: z.enum(["auto", "1", "3"]).default("auto"),
});

export async function getReaderPreferences(userId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.from("reading_prefs")
    .select("theme, direction, layout, fit, brightness, font_size, gap")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;

  const parsed = readerPreferencesSchema.safeParse({
    theme: data.theme,
    direction: data.direction,
    layout: data.layout ?? undefined,
    fit: data.fit,
    brightness: data.brightness,
    gap: data.gap,
    fontSize: data.font_size,
  });
  return parsed.success ? parsed.data : null;
}
