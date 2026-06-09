## Goal
Expose a stable, versioned REST API the Cursor-built Tally Prime connector can call from a customer's Windows machine to push Tally data into CollectWeb and pull back invoices/collections — authenticated via OAuth-style device pairing, hosted under `api.collectweb.in`.

## Public base URL
`https://api.collectweb.in/v1/tally/*` → routed to Supabase Edge Functions (CNAME/proxy added in domain settings later). The connector only ever sees this URL.

## Auth: device pairing (no passwords in connector)

```text
Web app (logged-in owner)                Connector (Cursor app)
        │                                          │
        │  1. POST /v1/tally/pair/start            │
        │     → { pair_code: "ABCD-1234",          │
        │         expires_at, device_token }       │
        │  shows "ABCD-1234" to user               │
        │                                          │
        │                          2. user types ABCD-1234 in connector
        │                                          │
        │       3. POST /v1/tally/pair/claim       │
        │          { pair_code, device_name }      │
        │          → { api_token, company_id }     │
        │                                          │
        │  4. webapp polls /pair/status            │
        │     shows "Paired with DESKTOP-XYZ"      │
        │                                          │
        │       5. all later calls:                │
        │          Authorization: Bearer <api_token>
```

- `api_token` is a long-lived opaque token (hashed at rest), scoped to one `company_id` + one device.
- Owner can revoke a device anytime → token instantly invalid.
- All endpoints below require `Authorization: Bearer <api_token>`; the function resolves `company_id` from the token (no client-supplied tenant id, no JWT, no Supabase client in the connector).

## Resources & endpoints (v1)

Masters & lookup
- `GET  /v1/tally/company` — name, gstin, default_due_days, upi_id, address
- `GET  /v1/tally/areas`
- `POST /v1/tally/areas` — upsert by name

Parties (customers)
- `GET  /v1/tally/parties?updated_since=&cursor=&limit=`
- `POST /v1/tally/parties` — body array, upsert by `external_ref` (Tally ledger guid) or `(name, phone)`
- `PATCH /v1/tally/parties/:id`

Invoices
- `GET  /v1/tally/invoices?updated_since=&status=&cursor=`
- `POST /v1/tally/invoices` — body array; upsert by `external_ref` (Tally voucher guid); auto-resolve customer by `external_ref` or `(name, phone)`; recompute `paid_amount` + `status` from ledger
- `PATCH /v1/tally/invoices/:id` — limited fields (due_date, description, status mark-paid blocked — must come via payments)

Collections (payments)
- `GET  /v1/tally/payments?updated_since=&cursor=`
- `POST /v1/tally/payments` — body array; each entry links to invoice via `external_ref` or `invoice_number`; idempotency via `local_id` UUID (same rule as offline queue)

Sync helpers
- `GET  /v1/tally/changes?since=<iso>&types=parties,invoices,payments` — single feed the connector polls to pull SaaS-side changes back into Tally
- `GET  /v1/tally/ping` — health + echo of paired device + server time

Conventions
- JSON only, ISO-8601 timestamps, amounts as integers in paise.
- Cursor pagination: `?cursor=<opaque>&limit=200` (max 500), responses include `next_cursor`.
- Idempotency: every write accepts `Idempotency-Key` header **or** `local_id` per row.
- Errors: `{ error: { code, message, field? } }` with HTTP 400/401/403/404/409/422/429/5xx.
- Rate limit: 60 req/min per token (in-memory token bucket), 429 with `Retry-After`.

## Data model additions

New tables (multi-tenant, RLS by `company_id`):

```text
api_devices
  id, company_id, device_name, token_hash, last_used_at,
  created_by (auth user), created_at, revoked_at

api_pair_codes
  id, company_id, code (8-char), device_token, expires_at,
  claimed_at, claimed_device_id, created_by

api_request_log     -- light audit, 30-day retention
  id, company_id, device_id, path, method, status, duration_ms, created_at
```

Existing tables get nullable columns:
- `customers.external_ref text` (Tally ledger id), unique per company
- `invoices.external_ref text` (Tally voucher id), unique per company
- `payments.external_ref text`, unique per company
- All three: `source text default 'app'` ('app' | 'tally')

Financial rules (non-negotiable, from project knowledge):
- Outstanding always derived from `payments` ledger — Tally pushes never mutate `customers.outstanding`.
- Payments are immutable via API: no `PATCH /payments/:id`, no `DELETE` — corrections go through a reversing payment.
- Every write is wrapped in a Postgres transaction.

## Edge functions

```text
supabase/functions/
  tally-pair/        POST /start, /claim, /status, /revoke
  tally-api/         everything under /v1/tally/* (single function, internal router)
```

Both deploy with `verify_jwt = false`; auth is custom (pair endpoints use the logged-in user's JWT for `/start`+`/status`+`/revoke`, the connector endpoints use the bearer api_token).

Token verification helper: hash the incoming bearer with SHA-256, look up in `api_devices` where `revoked_at is null`, set `company_id` for the request, update `last_used_at`.

## Web app changes (Settings → Integrations → Tally)

- "Connect Tally Prime" button → calls `/pair/start`, shows the pair code + expiry countdown, polls `/pair/status`.
- Paired devices list: device name, last seen, Revoke button.
- Docs link with the base URL `https://api.collectweb.in/v1/tally` and the endpoint table.
- Owner-only (RBAC).

## Custom subdomain

- User adds CNAME `api.collectweb.in` → Lovable edge (instructions surfaced when they hit the Settings page).
- Edge function router maps `/v1/tally/*` to the `tally-api` function. Until DNS is live, connector can use the raw functions URL — both will work.

## Out of scope (next iteration)
- Webhooks from SaaS → connector (poll `/changes` first).
- Stock items / GST returns sync.
- Bulk file upload of Tally XML through the API (current localhost proxy stays as-is for that).

## Build order
1. Migration: 3 new tables + 4 new columns + RLS + GRANTs.
2. `tally-pair` edge function + Settings → Integrations UI.
3. `tally-api` edge function: parties + invoices + payments + changes feed + ping.
4. Rate limiting, request log, error envelope polish.
5. Wire `api.collectweb.in` custom subdomain and update docs in the UI.
6. Save a `mem://features/tally-api` memory documenting the contract for future changes.

Confirm to switch to build mode and start with step 1.