create table if not exists public.content_removal_requests (
  id uuid primary key default gen_random_uuid(),
  claimant_name text not null check (char_length(claimant_name) between 2 and 120),
  claimant_email text not null check (char_length(claimant_email) <= 254),
  claim_type text not null check (claim_type in ('scanlation_group_leader', 'rights_holder')),
  group_url text,
  content_url text not null,
  details text not null check (char_length(details) between 20 and 2000),
  status text not null default 'pending' check (status in ('pending', 'in_review', 'removed', 'rejected')),
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_removal_requests_status_created_idx
  on public.content_removal_requests (status, created_at desc);

create table if not exists public.content_removal_blocks (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('mangadex', 'otruyen')),
  scope text not null check (scope in ('manga', 'chapter', 'scanlation_group')),
  source_id text not null check (char_length(source_id) between 1 and 512),
  request_id uuid references public.content_removal_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source, scope, source_id)
);

create index if not exists content_removal_blocks_lookup_idx
  on public.content_removal_blocks (source, scope, source_id);

alter table public.content_removal_requests enable row level security;
alter table public.content_removal_blocks enable row level security;

revoke all on public.content_removal_requests, public.content_removal_blocks from public, anon, authenticated;
grant all on public.content_removal_requests, public.content_removal_blocks to service_role;
