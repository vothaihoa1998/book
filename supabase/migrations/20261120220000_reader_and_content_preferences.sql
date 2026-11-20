alter table public.reading_prefs
  add column if not exists layout text check (layout in ('auto', 'single', 'double', 'strip')),
  add column if not exists content_filters jsonb;

alter table public.reading_prefs alter column layout set default 'auto';

alter table public.reading_history
  add column if not exists page_offset real check (page_offset >= 0 and page_offset <= 1);
