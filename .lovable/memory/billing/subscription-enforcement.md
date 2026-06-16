---
name: Subscription enforcement
description: Per-seat Razorpay subscriptions linked to companies.plan; hard read-only lock when inactive
type: feature
---
- Pricing: ₹299/user/month and ₹2,999/user/year (Pro). Free plan = 1 owner only, all features.
- Razorpay subscriptions use native `quantity` field for per-seat billing; plans are created on demand by `razorpay-create-subscription` if missing.
- Edge functions: `razorpay-create-subscription` (owner-only), `razorpay-cancel-subscription` (owner-only, cancel at period end), `razorpay-webhook` (HMAC-SHA256 verified via `RAZORPAY_WEBHOOK_SECRET`).
- DB enforcement: `public.current_user_can_write()` is added to every INSERT/UPDATE/DELETE policy on invoices, payments, customers, areas, delivery_otps. SELECT policies untouched → read-only continues to work when inactive.
- Free seat limit: `enforce_seat_limit()` trigger on `user_roles` blocks 2nd user on Free plan unless an active subscription exists.
- Webhook syncs `companies.plan` (pro/free) and `plan_expires_at` from `subscription.activated/charged/halted/cancelled/completed` events.
- Frontend: `useSubscription()` hook mirrors the DB rule; `ReadOnlyBanner` shows in AppLayout when `isReadOnly`; `/settings/billing` (owner-only) for upgrade/cancel; Settings page has a Billing entry.
- Only the **Owner** role manages billing. Other roles see the banner with "Contact your owner".
