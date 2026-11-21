export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type ProfileRow = { id: string; display_name: string | null; avatar_url: string | null; created_at: string; updated_at: string };
type ProfileInsert = { id: string; display_name?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string };
type ProfileUpdate = { display_name?: string | null; avatar_url?: string | null; updated_at?: string };

type BookmarkRow = { id: string; user_id: string; manga_id: string; manga: Json | null; created_at: string };
type BookmarkInsert = { id?: string; user_id: string; manga_id: string; manga?: Json | null; created_at?: string };
type BookmarkUpdate = { manga?: Json | null };

type FollowRow = BookmarkRow;
type FollowInsert = BookmarkInsert;
type FollowUpdate = BookmarkUpdate;

type HistoryRow = {
  id: string;
  user_id: string;
  manga_id: string;
  chapter_id: string;
  page_index: number;
  page_offset: number | null;
  scroll_percent: number;
  updated_at: string;
};
type HistoryInsert = {
  id?: string;
  user_id: string;
  manga_id: string;
  chapter_id: string;
  page_index?: number;
  page_offset?: number | null;
  scroll_percent?: number;
  updated_at?: string;
};
type HistoryUpdate = { page_index?: number; page_offset?: number | null; scroll_percent?: number; updated_at?: string };

type PrefsRow = { layout: string | null; content_filters: Json | null; user_id: string; theme: string; direction: string; fit: string; brightness: number; font_size: number; gap: number; updated_at: string };
type PrefsInsert = { layout?: string | null; content_filters?: Json; user_id: string; theme?: string; direction?: string; fit?: string; brightness?: number; font_size?: number; gap?: number; updated_at?: string };
type PrefsUpdate = { layout?: string | null; content_filters?: Json; theme?: string; direction?: string; fit?: string; brightness?: number; font_size?: number; gap?: number; updated_at?: string };

type CacheRow = { cache_key: string; source: string; payload: Json; expires_at: string; updated_at: string };
type CacheInsert = { cache_key: string; source: string; payload: Json; expires_at: string; updated_at?: string };
type CacheUpdate = { payload?: Json; expires_at?: string; updated_at?: string };

type FetchLogRow = { id: string; source: string; target: string; ok: boolean; status: number | null; duration_ms: number | null; created_at: string };
type FetchLogInsert = { id?: string; source: string; target: string; ok: boolean; status?: number | null; duration_ms?: number | null; created_at?: string };
type FetchLogUpdate = { ok?: boolean; status?: number | null; duration_ms?: number | null };

type CommentRow = {
  id: string;
  user_id: string;
  author_name: string | null;
  manga_id: string;
  chapter_id: string | null;
  parent_id: string | null;
  body: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};
type CommentInsert = {
  id?: string;
  user_id: string;
  author_name?: string | null;
  manga_id: string;
  chapter_id?: string | null;
  parent_id?: string | null;
  body: string;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
};
type CommentUpdate = { body?: string; author_name?: string | null; deleted_at?: string | null; updated_at?: string };

type ContentRemovalRequestRow = {
  id: string;
  claimant_name: string;
  claimant_email: string;
  claim_type: string;
  group_url: string | null;
  content_url: string;
  details: string;
  status: string;
  reviewed_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
};
type ContentRemovalRequestInsert = {
  id?: string;
  claimant_name: string;
  claimant_email: string;
  claim_type: string;
  group_url?: string | null;
  content_url: string;
  details: string;
  status?: string;
  reviewed_at?: string | null;
  resolution_note?: string | null;
  created_at?: string;
  updated_at?: string;
};
type ContentRemovalRequestUpdate = {
  status?: string;
  reviewed_at?: string | null;
  resolution_note?: string | null;
  updated_at?: string;
};
type ContentRemovalBlockRow = {
  id: string;
  source: string;
  scope: string;
  source_id: string;
  request_id: string | null;
  created_at: string;
};
type ContentRemovalBlockInsert = {
  id?: string;
  source: string;
  scope: string;
  source_id: string;
  request_id?: string | null;
  created_at?: string;
};
type ContentRemovalBlockUpdate = { request_id?: string | null };

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, ProfileInsert, ProfileUpdate>;
      bookmarks: Table<BookmarkRow, BookmarkInsert, BookmarkUpdate>;
      reading_history: Table<HistoryRow, HistoryInsert, HistoryUpdate>;
      follows: Table<FollowRow, FollowInsert, FollowUpdate>;
      reading_prefs: Table<PrefsRow, PrefsInsert, PrefsUpdate>;
      manga_cache: Table<CacheRow, CacheInsert, CacheUpdate>;
      chapter_cache: Table<CacheRow, CacheInsert, CacheUpdate>;
      source_fetch_log: Table<FetchLogRow, FetchLogInsert, FetchLogUpdate>;
      comments: Table<CommentRow, CommentInsert, CommentUpdate>;
      content_removal_requests: Table<ContentRemovalRequestRow, ContentRemovalRequestInsert, ContentRemovalRequestUpdate>;
      content_removal_blocks: Table<ContentRemovalBlockRow, ContentRemovalBlockInsert, ContentRemovalBlockUpdate>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
