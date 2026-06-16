# Razorpay Subscriptions + Plan Enforcement

## Goal
Tie the `companies.plan` field to a real Razorpay subscription, billed per active user (₹299/user/month, ₹2,999/user/year). When the subscription lapses, the company is hard-locked into **read-only mode** — they can view everything but cannot create, edit, or delete any business data until they re-subscribe. Only the **Owner** sees the Billing page and can manage the subscription.

## What's already there
- `companies.plan` (`free` | `pro` | `enterprise`) and `companies.plan_expires_at` already exist.
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` secrets are configured (live keys).
- Existing onboarding sets new companies to `free`.

## What I'll build

### 1. Razorpay plans (one-time setup)
- New edge function `razorpay-bootstrap-plans` (owner-invoked once, idempotent) that calls Razorpay API to create two **per-unit** plans:
  - `Pro Monthly` — ₹299, period=monthly, interval=1
  - `Pro Yearly` — ₹2,999, period=yearly, interval=1
- Plan IDs are saved into two new secrets (`RAZORPAY_PLAN_MONTHLY_ID`, `RAZORPAY_PLAN_YEARLY_ID`) via the function so we don't hardcode them.

### 2. Database changes (one migration)
- New table `public.subscriptions` (one row per company, latest active):
  - `company_id`, `razorpay_subscription_id`, `razorpay_plan_id`, `plan_type` (`monthly`|`yearly`), `quantity` (seat count), `status` (`created`|`active`|`pending`|`halted`|`cancelled`|`completed`|`expired`), `current_period_start`, `current_period_end`, `cancel_at_period_end`, `raw` (jsonb).
  - RLS: owners of the company can read; service role writes (webhook). GRANTs included.
- Extend `companies` with:
  - `subscription_grace_until` (timestamptz, nullable) — set to NULL on hard-lock, used only for the short window between checkout and webhook arrival.
- New SECURITY DEFINER helper `public.company_has_active_plan(_company_id uuid)` → boolean. Returns true if `plan='free'` (always allowed for owner-only Free) **or** an `active` subscription exists with `current_period_end > now()`.
- New helper `public.is_company_owner(_user_id uuid, _company_id uuid)` → boolean.
- Update **write** RLS policies on `invoices`, `payments`, `customers`, `areas`, `delivery_otps` so INSERT/UPDATE/DELETE additionally require `company_has_active_plan(company_id)`. SELECT policies untouched → read-only continues to work.
- Trigger on `auth.users` is not changed; new signups stay `free`.
- Free plan seat enforcement: trigger on `user_roles` rejects INSERT when `companies.plan='free'` and the company already has 1 user.

### 3. Edge functions
All Deno + `npm:@supabase/supabase-js@2/cors`. JWT validated in code.

- `razorpay-create-subscription` (owner only)
  - Input: `{ plan_type: 'monthly'|'yearly' }`.
  - Counts current users in company → `quantity`.
  - Calls Razorpay `POST /subscriptions` with `plan_id`, `quantity`, `customer_notify=1`, `total_count` (120 for monthly = 10y, 10 for yearly).
  - Inserts row in `subscriptions` (status `created`), returns `subscription_id` + `short_url` for checkout.
- `razorpay-webhook` (verify_jwt=false — Razorpay can't sign JWTs; we verify HMAC signature with `RAZORPAY_WEBHOOK_SECRET`)
  - Handles `subscription.activated`, `subscription.charged`, `subscription.completed`, `subscription.halted`, `subscription.cancelled`, `subscription.pending`, `subscription.updated`.
  - Updates `subscriptions` row and writes `companies.plan` (`pro` on active, `free` on cancelled/halted/expired) + `plan_expires_at = current_period_end`.
- `razorpay-cancel-subscription` (owner only) → cancels at period end via Razorpay API.
- `razorpay-update-quantity` — called by a DB trigger via `pg_net`? No — simpler: call it from client whenever a teammate is invited/removed (owner action). Sends Razorpay `PATCH /subscriptions/:id` with new `quantity`, prorated.

New secret needed from user: `RAZORPAY_WEBHOOK_SECRET` (set after they create the webhook in Razorpay dashboard pointing at the function URL — I'll show them the URL).

### 4. Frontend

- `src/hooks/useSubscription.ts` — TanStack Query, returns `{ plan, status, isActive, isReadOnly, subscription, currentSeatPrice, seatCount }`.
- `src/contexts/SubscriptionContext.tsx` — wraps app, exposes `isReadOnly` + a `guardWrite()` helper.
- Global `ReadOnlyBanner` shown at top of app when `isReadOnly` (links to /settings/billing for owners, shows "Contact your owner" for others).
- New `src/pages/Billing.tsx` (owner only, route `/settings/billing`):
  - Current plan card, next renewal date, seat count + per-seat price, total monthly/yearly.
  - "Upgrade" → calls `razorpay-create-subscription`, opens Razorpay Checkout (`@razorpay/checkout` script loaded on demand) using returned `subscription_id`.
  - "Cancel at period end" button.
  - Invoice/payment history from `subscriptions.raw` + Razorpay invoices list endpoint.
- Gate write actions in UI:
  - Disable + tooltip on FAB, "Add Invoice", "Add Customer", "Record Collection", "Invite Member", bulk import, AI scan when `isReadOnly`.
  - RLS will reject anyway as defense-in-depth.
- Settings page: add Billing entry (visible to owner only).
- Update existing pricing copy on `/home` to match per-seat model (₹299/user/mo, ₹2,999/user/yr; Free = 1 user owner-only, full features).

### 5. Memory
Add `mem://billing/subscription-enforcement` describing per-seat model, hard read-only lock, owner-only billing.

## Two-phase rollout
This plan is large, so I'll ship in **two passes** within this turn:
1. Migration + edge functions + secret request for `RAZORPAY_WEBHOOK_SECRET`.
2. After the migration runs and secret is added, the frontend (Billing page, hook, gating, banner) and pricing-page copy update.

## Things I need from you after approval
1. Approve the migration.
2. Add `RAZORPAY_WEBHOOK_SECRET` when prompted (I'll give you the webhook URL to paste into Razorpay dashboard along with the events to subscribe).
3. After deploy, hit a "Create Plans in Razorpay" button once on the Billing page (calls `razorpay-bootstrap-plans`) — this populates the plan IDs.

## Technical details
- Per-seat billing uses Razorpay's native `quantity` field on subscriptions (no separate add-on plans needed).
- `total_count` set high (120/10) so the subscription effectively renews indefinitely until cancelled.
- Webhook signature verification: `crypto.subtle` HMAC-SHA256 over raw body using `RAZORPAY_WEBHOOK_SECRET`, compared to `x-razorpay-signature` header.
- All write-RLS policies updated in one migration to add `AND public.company_has_active_plan(company_id)` to existing INSERT/UPDATE/DELETE policies.
- Free → Pro upgrade allows the trigger blocking 2nd user to pass once `company_has_active_plan` is true.
- Read-only lock is enforced at DB (RLS) + UI (disabled controls + banner) so the app can't be bypassed by API calls.
