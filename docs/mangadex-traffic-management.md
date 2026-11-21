# MangaDex API Protection and Traffic Management

InkRail centralizes MangaDex traffic in `src/lib/upstream.ts` and `src/lib/sources/http.ts`.

## Limits

The defaults are conservative and configurable:

- MangaDex API: `MANGADEX_API_RPS=4` requests/second, shared through Redis.
- AtHome: `MANGADEX_ATHOME_LIMIT=30` requests/minute.
- Random manga: `MANGADEX_RANDOM_LIMIT=45` requests/minute.
- Authenticated or hashed-IP per-user API: `MANGADEX_USER_API_LIMIT=60`/minute.
- Per-user search: `MANGADEX_USER_SEARCH_LIMIT=20`/minute.

Production requires Upstash Redis. Local development may use an explicit process-local fallback only; production does not bypass centralized limits.

## Identity and proxies

Authenticated Supabase user IDs and trusted request IPs are hashed before use as rate-limit identities. Forwarding headers are ignored unless `TRUSTED_PROXY=1` is explicitly set and `TRUSTED_PROXY_IP_HEADER` is configured. InkRail does not rotate IP addresses.

## Queue and retries

The in-process priority queue is bounded by `MANGADEX_QUEUE_MAX=64` and has a `MANGADEX_QUEUE_WAIT_MS=5000` maximum wait. `MANGADEX_QUEUE_CONCURRENCY=8` limits concurrent upstream work. P0 is reader chapter data, P1 details/chapter lists, P2 search, P3 home/catalog, and P4 prefetch. P4 shed before the configured prefetch budget (`MANGADEX_QUEUE_PREFETCH_BUDGET=8`) is exhausted. The queue never holds the distributed cache lock while waiting.

MangaDex requests have a finite timeout and at most three attempts. 429 responses create a shared cooldown and use bounded backoff with jitter. 403 opens a shared, manual-review circuit breaker.

## Cache and removal safety

JSON cache keys normalize query parameter order. Metadata TTLs are finite and jittered. Chapter image URLs and image responses remain nonpersistent. The blocklist is queried directly for removal decisions; stale or cached content is never used to bypass a block. Supabase/Redis must be configured in production for removal enforcement and shared protection.

## Monitoring

Set `METRICS_TOKEN` and call `/api/metrics` with `Authorization: Bearer <METRICS_TOKEN>`. It reports aggregate cache/dedup, upstream, rejection, 429/403, queue, latency, and breaker counters without raw identifiers or personal data.
