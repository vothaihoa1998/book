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
  scroll_percent: number;
  updated_at: string;
};
type HistoryInsert = {
  id?: string;
  user_id: string;
  manga_id: string;
  chapter_id: string;
  page_index?: number;
  scroll_percent?: number;
  updated_at?: string;
};
type HistoryUpdate = { page_index?: number; scroll_percent?: number; updated_at?: string };

type PrefsRow = { user_id: string; theme: string; direction: string; fit: string; brightness: number; font_size: number; gap: number; updated_at: string };
type PrefsInsert = { user_id: string; theme?: string; direction?: string; fit?: string; brightness?: number; font_size?: number; gap?: number; updated_at?: string };
type PrefsUpdate = { theme?: string; direction?: string; fit?: string; brightness?: number; font_size?: number; gap?: number; updated_at?: string };

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
