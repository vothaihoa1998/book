create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  manga_id text not null,
  manga jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, manga_id)
);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  manga_id text not null,
  manga jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, manga_id)
);

create table if not exists public.reading_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  manga_id text not null,
  chapter_id text not null,
  page_index integer not null default 0 check (page_index >= 0),
  scroll_percent numeric not null default 0 check (scroll_percent >= 0 and scroll_percent <= 100),
  updated_at timestamptz not null default now(),
  unique (user_id, manga_id, chapter_id)
);

create table if not exists public.reading_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'warm-light',
  direction text not null default 'vertical',
  fit text not null default 'width',
  brightness integer not null default 0 check (brightness >= 0 and brightness <= 60),
  font_size integer not null default 18 check (font_size >= 14 and font_size <= 24),
  gap integer not null default 8 check (gap >= 0 and gap <= 32),
  updated_at timestamptz not null default now()
);

create table if not exists public.manga_cache (
  cache_key text primary key,
  source text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.chapter_cache (
  cache_key text primary key,
  source text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.source_fetch_log (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  target text not null,
  ok boolean not null,
  status integer,
  duration_ms integer,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.bookmarks enable row level security;
alter table public.follows enable row level security;
alter table public.reading_history enable row level security;
alter table public.reading_prefs enable row level security;
alter table public.manga_cache enable row level security;
alter table public.chapter_cache enable row level security;
alter table public.source_fetch_log enable row level security;

drop policy if exists "profiles select own" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles select own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "bookmarks select own" on public.bookmarks;
drop policy if exists "bookmarks insert own" on public.bookmarks;
drop policy if exists "bookmarks update own" on public.bookmarks;
drop policy if exists "bookmarks delete own" on public.bookmarks;
create policy "bookmarks select own" on public.bookmarks for select to authenticated using (auth.uid() = user_id);
create policy "bookmarks insert own" on public.bookmarks for insert to authenticated with check (auth.uid() = user_id);
create policy "bookmarks update own" on public.bookmarks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bookmarks delete own" on public.bookmarks for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "follows select own" on public.follows;
drop policy if exists "follows insert own" on public.follows;
drop policy if exists "follows update own" on public.follows;
drop policy if exists "follows delete own" on public.follows;
create policy "follows select own" on public.follows for select to authenticated using (auth.uid() = user_id);
create policy "follows insert own" on public.follows for insert to authenticated with check (auth.uid() = user_id);
create policy "follows update own" on public.follows for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "follows delete own" on public.follows for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "history select own" on public.reading_history;
drop policy if exists "history insert own" on public.reading_history;
drop policy if exists "history update own" on public.reading_history;
drop policy if exists "history delete own" on public.reading_history;
create policy "history select own" on public.reading_history for select to authenticated using (auth.uid() = user_id);
create policy "history insert own" on public.reading_history for insert to authenticated with check (auth.uid() = user_id);
create policy "history update own" on public.reading_history for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "history delete own" on public.reading_history for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "prefs select own" on public.reading_prefs;
drop policy if exists "prefs insert own" on public.reading_prefs;
drop policy if exists "prefs update own" on public.reading_prefs;
create policy "prefs select own" on public.reading_prefs for select to authenticated using (auth.uid() = user_id);
create policy "prefs insert own" on public.reading_prefs for insert to authenticated with check (auth.uid() = user_id);
create policy "prefs update own" on public.reading_prefs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "manga cache public read" on public.manga_cache;
drop policy if exists "chapter cache public read" on public.chapter_cache;
create policy "manga cache public read" on public.manga_cache for select to anon, authenticated using (expires_at > now());
create policy "chapter cache public read" on public.chapter_cache for select to anon, authenticated using (expires_at > now());

grant usage on schema public to anon, authenticated, service_role;
grant select on public.manga_cache, public.chapter_cache to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.bookmarks, public.follows, public.reading_history, public.reading_prefs to authenticated;
grant all on public.profiles, public.bookmarks, public.follows, public.reading_history, public.reading_prefs, public.manga_cache, public.chapter_cache, public.source_fetch_log to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars public read" on storage.objects;
drop policy if exists "avatars insert own folder" on storage.objects;
drop policy if exists "avatars update own folder" on storage.objects;
drop policy if exists "avatars delete own folder" on storage.objects;
create policy "avatars public read" on storage.objects for select to anon, authenticated using (bucket_id = 'avatars');
create policy "avatars insert own folder" on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "avatars update own folder" on storage.objects for update to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "avatars delete own folder" on storage.objects for delete to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
