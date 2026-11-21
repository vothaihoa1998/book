# MangaDex API Protection and Traffic Management

InkRail centralizes MangaDex traffic in `src/lib/upstream.ts` and `src/lib/sources/http.ts`.

## Limits

The defaults are conservative and configurable:

- MangaDex API: `MANGADEX_API_RPS=4` requests/second, shared through Redis.
- AtHome: `MANGADEX_ATHOME_LIMIT=30` requests/minute.
- Random manga: `MANGADEX_RANDOM_LIMIT=45` requests/minute.
- Authenticated or hashed-IP per-user API: `MANGADEX_USER_API_LIMIT=60`/minute.
- Per-user search: `MANGADEX_USER_SEARCH_LIMIT=20`/minute.

Code caps the API value at 20/s, endpoint/user values at 600/minute, queue size at 256, queue wait at 30 seconds, concurrency at 32, and prefetch budget at 64. Invalid or non-positive values fall back to the defaults above.

Production requires Upstash Redis. Local development may use an explicit process-local fallback for cache and limits, but production fails closed and never uses the process-local fallback for centralized MangaDex protection. Redis/cache/dedup lock failures are not allowed to become an upstream request bypass.

## Identity and proxies

Authenticated Supabase user IDs and trusted request IPs are hashed before use as rate-limit identities; raw IDs/IPs are not stored by the upstream limiter or metrics. Search and reader paths pass a server-derived identity into MangaDex adapters. Forwarding headers are ignored unless `TRUSTED_PROXY=1` is explicitly set and `TRUSTED_PROXY_IP_HEADER` names a header already verified by the deployment edge. InkRail does not rotate IP addresses.

## Queue and retries

The in-process priority queue is bounded by `MANGADEX_QUEUE_MAX=64` and has a `MANGADEX_QUEUE_WAIT_MS=5000` maximum wait. `MANGADEX_QUEUE_CONCURRENCY=8` limits concurrent upstream work. P0 is reader chapter data, P1 details/chapter lists, P2 search, P3 home/catalog, and P4 prefetch. P4 shed before the configured prefetch budget (`MANGADEX_QUEUE_PREFETCH_BUDGET=8`) is exhausted. The queue never holds the distributed cache lock while waiting.

MangaDex requests have a finite timeout and at most three attempts. 429 responses create a shared cooldown and use bounded backoff with jitter. 403 opens a shared, manual-review circuit breaker.

## Cache and removal safety

JSON cache keys normalize query parameter order. Metadata TTLs are finite and jittered. Public metadata supports a bounded SWR/stale-if-error window and fitting 404 responses may use a short 120-second negative cache. Cache entries are envelope-tagged so stale and negative records can be distinguished; stale data is only returned for public metadata and only within the configured window. AtHome responses and completed MangaDex chapter page URL payloads are not persisted in Redis or Supabase. Chapter image browser responses use `no-store`. The blocklist is queried directly for removal decisions; stale or cached content is never used to bypass a block. Supabase/Redis must be configured in production for removal enforcement and shared protection.

## Monitoring

Set `METRICS_TOKEN` and call `/api/metrics` with `Authorization: Bearer <METRICS_TOKEN>`. It reports aggregate cache/dedup, upstream, rejection, 429/403, queue, latency, breaker, and hashed active-user counters; it does not expose raw identifiers or personal data.

The endpoint returns `404` when `METRICS_TOKEN` is unset and `401` for incorrect bearer tokens. The response is `no-store`.

## Tests

`src/lib/upstream.test.ts` mocks Upstash Redis and Ratelimit classes; it does not send network traffic to MangaDex or another upstream. Coverage includes Redis production fail-closed behavior, global/AtHome/random/user limits, 429 cooldown, 403 circuit breaking, cache stampede/dedup, 404 negative cache, stale metadata, queue priority/concurrency/bounds/P4 shedding, and trusted proxy identity handling.
