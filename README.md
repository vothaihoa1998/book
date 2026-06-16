# InkRail

Editorial-minimal manga reader built with Next.js App Router and Supabase.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind v4
- Supabase Auth, Postgres, Storage with RLS-first migrations
- MangaDex and OTruyen source adapters with normalized `Manga`, `Chapter`, `PageImage` types
- Route Handlers for image proxy, search, reading progress, RSS
- PWA manifest and custom service worker for app shell/API/image caching

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The app runs without Supabase credentials by using public source data plus sample fallback data. Add these env vars when a Supabase project is ready:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FIRECRAWL_API_KEY=optional-firecrawl-key
```

`FIRECRAWL_API_KEY` is optional. When present, search uses Firecrawl only as a fallback to discover MangaDex title URLs after MangaDex and OTruyen return no results.

## Supabase

Migration files live in `supabase/migrations`. Apply `20260616170000_initial_schema.sql` to create:

- `profiles`, `bookmarks`, `follows`, `reading_history`, `reading_prefs`
- `manga_cache`, `chapter_cache`, `source_fetch_log`
- Storage bucket `avatars`

All public-schema tables have RLS enabled. User tables are scoped to `auth.uid()`. Cache tables allow public read while writes are reserved for the service role. Avatar storage allows public read and authenticated writes only under the user's folder.

## Verification

```bash
npm run lint
npm run test
npm run build
```

`npm audit` currently reports moderate issues from transitive packages installed by the scaffold; review before production hardening.
