import "server-only";

import type { Json } from "./types";
import { getSupabaseAdminClient } from "./admin";

type CacheTable = "manga_cache" | "chapter_cache";

export async function readCache<T>(table: CacheTable, cacheKey: string) {
  const result = await readCacheWithStatus<T>(table, cacheKey);
  return result.value;
}

export async function readCacheWithStatus<T>(table: CacheTable, cacheKey: string): Promise<{ value: T | null; error: string | null }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { value: null, error: null };

  const { data, error } = await supabase
    .from(table)
    .select("payload, expires_at")
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) return { value: null, error: error.message };
  if (!data) return { value: null, error: null };
  return { value: data.payload as T, error: null };
}

export async function writeCache(table: CacheTable, cacheKey: string, source: string, payload: Json, ttlSeconds: number) {
  await writeCacheWithStatus(table, cacheKey, source, payload, ttlSeconds);
}

export async function writeCacheWithStatus(table: CacheTable, cacheKey: string, source: string, payload: Json, ttlSeconds: number) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const { error } = await supabase.from(table).upsert({
    cache_key: cacheKey,
    source,
    payload,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });

  return error?.message ?? null;
}

export async function logSourceFetch(source: string, target: string, ok: boolean, durationMs: number, status?: number | null) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  await supabase.from("source_fetch_log").insert({
    source,
    target,
    ok,
    status: status ?? null,
    duration_ms: Math.max(0, Math.round(durationMs)),
  });
}
