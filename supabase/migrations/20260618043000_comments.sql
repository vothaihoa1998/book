create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  manga_id text not null,
  chapter_id text,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comments_manga_created_idx on public.comments (manga_id, created_at desc) where deleted_at is null;
create index if not exists comments_chapter_created_idx on public.comments (chapter_id, created_at desc) where chapter_id is not null and deleted_at is null;
create index if not exists comments_parent_idx on public.comments (parent_id) where parent_id is not null and deleted_at is null;

alter table public.comments enable row level security;

create policy "comments public read" on public.comments
  for select to anon, authenticated
  using (deleted_at is null);

create policy "comments insert own" on public.comments
  for insert to authenticated
  with check (auth.uid() is not null and auth.uid() = user_id and deleted_at is null);

create policy "comments update own" on public.comments
  for update to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "comments delete own" on public.comments
  for delete to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

grant select on public.comments to anon;
grant select, insert, update, delete on public.comments to authenticated;
grant all on public.comments to service_role;
