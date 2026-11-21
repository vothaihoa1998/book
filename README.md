# InkRail

Editorial-minimal manga reader built with Next.js App Router and Supabase.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind v4
- Supabase Auth, Postgres, Storage with RLS-first migrations
- MangaDex and OTruyen source adapters with normalized `Manga`, `Chapter`, `PageImage` types
- Route Handlers for image proxy, search, reading progress, RSS
- PWA manifest and custom service worker for app shell/API caching

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3100`.

The app runs without Supabase credentials by using public source data plus sample fallback data. Add these env vars when a Supabase project is ready:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3100
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FIRECRAWL_API_KEY=optional-firecrawl-key
UPSTASH_REDIS_REST_URL=your-upstash-rest-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token
IMAGE_PROXY_SECRET=at-least-32-random-bytes
MANGADEX_API_RPS=4
MANGADEX_ATHOME_LIMIT=30
MANGADEX_RANDOM_LIMIT=45
MANGADEX_USER_API_LIMIT=60
MANGADEX_USER_SEARCH_LIMIT=20
MANGADEX_QUEUE_MAX=64
MANGADEX_QUEUE_WAIT_MS=5000
MANGADEX_QUEUE_CONCURRENCY=8
MANGADEX_QUEUE_PREFETCH_BUDGET=8
TRUSTED_PROXY=0
TRUSTED_PROXY_IP_HEADER=
METRICS_TOKEN=long-random-monitoring-token
```

`FIRECRAWL_API_KEY` is optional. When present, search uses Firecrawl only as a fallback to discover MangaDex title URLs after MangaDex and OTruyen return no results.
The development server uses port `3100`. Production needs a central Upstash Redis database and an `IMAGE_PROXY_SECRET`; source requests are rate limited, cached and deduplicated through Redis. Do not commit these secrets.

Google OAuth setup lives in [docs/google-login-setup.md](docs/google-login-setup.md). Use it when configuring the real Google Client ID/Secret in Supabase Dashboard and Google Cloud Console.

MangaDex traffic protection and Redis/queue behavior are documented in [docs/mangadex-traffic-management.md](docs/mangadex-traffic-management.md).

## Supabase

Migration files live in `supabase/migrations`. Apply them in order. The latest migrations create:

- `profiles`, `bookmarks`, `follows`, `reading_history`, `reading_prefs`
- `manga_cache`, `chapter_cache`, `source_fetch_log`
- private `content_removal_requests` and `content_removal_blocks` tables
- Storage bucket `avatars`

All public-schema tables have RLS enabled. User tables are scoped to `auth.uid()`. Content removal tables have no public policies and are service-role only. Cache tables allow public read while writes are reserved for the service role. Avatar storage allows public read and authenticated writes only under the user's folder.

## Content removal operations

Requests submitted through `/content-removal` are stored privately for manual verification. After confirming the claimant's authority, add a matching row to `content_removal_blocks` using the MangaDex source ID and the appropriate `manga`, `chapter`, or `scanlation_group` scope. The reader, search results and signed image proxy reject blocked entries. The blocklist cache expires after 30 seconds. Keep claimant contact details only for the retention period the operator adopts.

## MangaDex policy

The app sends an identifying User-Agent, does not forward a `Via` header, uses server-side source requests, and applies shared limits below the documented MangaDex API and AtHome allowances. HTTP 429 responses set a shared cooldown; a MangaDex HTTP 403 opens a circuit breaker until an operator reviews and clears `inkrail:upstream:mangadex:blocked` in Redis. Chapter images are not cached by the service worker or offered for offline download. Verify current MangaDex policy and content licenses before public release.

The Terms and Privacy pages are explicitly marked as drafts with unresolved operator, jurisdiction, and retention placeholders. They are not publication-ready legal policies.

## Verification

```bash
npm run lint
npm run test
npm run build
```

`npm audit` currently reports moderate issues from transitive packages installed by the scaffold; review before production hardening.
