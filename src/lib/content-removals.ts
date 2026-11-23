import "server-only";

import { createShortCache } from "./short-cache";
import type { Chapter, Manga, MangaSource } from "./types";
import type { ImageProxyClaims } from "./image-proxy-token";
import { getSupabaseAdminClient } from "./supabase/admin";

type BlockScope = "manga" | "chapter" | "scanlation_group";
type BlockRow = { scope: BlockScope; source_id: string };

// Removal changes take effect within five seconds on warm instances.
const cachedBlocks = createShortCache<BlockRow[]>(5_000);

async function findBlocks(source: MangaSource, scopes: BlockScope[], ids: string[]): Promise<BlockRow[]> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean))).sort();
  const uniqueScopes = Array.from(new Set(scopes)).sort();
  if (!uniqueIds.length) return [];

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Supabase service credentials are required to enforce content removals.");
    }
    return [];
  }

  return cachedBlocks(JSON.stringify([source, uniqueScopes, uniqueIds]), async () => {
    const { data, error } = await supabase
      .from("content_removal_blocks")
      .select("scope, source_id")
      .eq("source", source)
      .in("scope", uniqueScopes)
      .in("source_id", uniqueIds);
    if (error) throw new Error(`Could not check the content removal blocklist: ${error.message}`);
    return (data ?? []) as BlockRow[];
  });
}

export async function isContentRemoved(claims: ImageProxyClaims) {
  if (claims.source !== "mangadex" && claims.source !== "otruyen") return false;
  const scopes: BlockScope[] = claims.scope === "manga" ? ["manga"] : ["manga", "chapter", "scanlation_group"];
  const ids = claims.scope === "manga"
    ? [claims.sourceId]
    : [claims.sourceId, claims.groupId ?? "", claims.parentId ?? ""];
  const blocks = await findBlocks(claims.source, scopes, ids);
  return blocks.some((block) =>
    (claims.scope === "manga" && block.scope === "manga" && block.source_id === claims.sourceId) ||
    (claims.scope === "chapter" && block.scope === "chapter" && block.source_id === claims.sourceId) ||
    (claims.scope === "chapter" && block.scope === "scanlation_group" && block.source_id === claims.groupId) ||
    (claims.scope === "chapter" && block.scope === "manga" && block.source_id === claims.parentId),
  );
}

export async function filterRemovedManga(items: Manga[]) {
  const blocked = new Set<string>();
  for (const source of ["mangadex", "otruyen"] as const) {
    const sourceItems = items.filter((item) => item.source === source);
    const blocks = await findBlocks(source, ["manga"], sourceItems.map((item) => item.sourceId));
    blocks.forEach((block) => blocked.add(`${source}:${block.source_id}`));
  }
  return items.filter((item) => !blocked.has(`${item.source}:${item.sourceId}`));
}

export async function filterRemovedChapters(chapters: Chapter[]) {
  const blocked = new Set<string>();
  for (const source of ["mangadex", "otruyen"] as const) {
    const sourceChapters = chapters.filter((chapter) => chapter.source === source);
    const blocks = await findBlocks(source, ["manga", "chapter", "scanlation_group"], sourceChapters.flatMap((chapter) => [
      chapter.sourceId,
      chapter.groupId ?? "",
      chapter.mangaId.includes(":") ? chapter.mangaId.slice(chapter.mangaId.indexOf(":") + 1) : chapter.mangaId,
    ]));
    blocks.forEach((block) => blocked.add(`${block.scope}:${source}:${block.source_id}`));
  }
  return chapters.filter((chapter) =>
    !blocked.has(`chapter:${chapter.source}:${chapter.sourceId}`) &&
    !(chapter.groupId && blocked.has(`scanlation_group:${chapter.source}:${chapter.groupId}`)) &&
    !blocked.has(`manga:${chapter.source}:${chapter.mangaId.includes(":") ? chapter.mangaId.slice(chapter.mangaId.indexOf(":") + 1) : chapter.mangaId}`),
  );
}

export async function isMangaRemoved(manga: Manga) {
  const visible = await filterRemovedManga([manga]);
  return visible.length === 0;
}

export async function isChapterRemoved(chapter: Chapter) {
  const visible = await filterRemovedChapters([chapter]);
  return visible.length === 0;
}
