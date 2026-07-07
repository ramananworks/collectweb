## Super Admin Panel

A separate `/admin` area gated by a new `super_admin` role for platform operators.

### 1. Database
- Add `super_admin` to `app_role` enum.
- New helper `public.is_super_admin(_user_id uuid)` — checks `user_roles` for the role without company scoping (`has_role` requires company match; super admins have no company).
- Add super-admin RLS policies (SELECT for all + UPDATE where relevant) on: `companies`, `subscriptions`, `profiles`, `user_roles`, `customers`, `invoices`, `payments`, `areas`.
- Small `admin_grant_complimentary_plan(_company_id uuid, _months int)` SQL function: upserts a `subscriptions` row with `status='active'`, `plan_type` (monthly/yearly), `raw={complimentary:true, granted_by:auth.uid()}`, and sets `companies.plan='pro'` + `plan_expires_at`.
- `admin_cancel_plan(_company_id uuid)`: sets latest sub `status='cancelled'`, clears `plan_expires_at`.
- `admin_extend_plan(_company_id uuid, _days int)`: bumps `current_period_end` and `plan_expires_at`.
- All three gated by `is_super_admin(auth.uid())`.

### 2. Edge function: `admin-impersonate`
- Verifies caller is `super_admin` via JWT + `is_super_admin` check.
- Uses `SUPABASE_SERVICE_ROLE_KEY` to generate a magic link (`generateLink({ type: 'magiclink', email })`) for the target user.
- Returns the link. Super admin opens it in a new tab → signed in as that user. (Cleanest path on Lovable Cloud; no persistent session hijack.)

### 3. Frontend

New route tree, hidden from normal nav:
```
/admin                    → AdminDashboard   (global metrics + companies table)
/admin/companies/:id      → AdminCompany     (plan actions, users, backup)
```

- `AdminRoute` wrapper: reads roles, redirects non-super-admins to `/dashboard`.
- `useIsSuperAdmin()` hook.

**AdminDashboard**
- Metric cards: total companies, active subscriptions, complimentary count, total invoices, total collections (₹), MRR estimate.
- Companies table: name, owner email, plan, expiry, complimentary badge, seats, created — click row → detail page. Search + status filter.

**AdminCompany**
- Header: company name, current plan, expiry, complimentary badge.
- Plan actions card: Grant complimentary (1/3/6/12 months), Extend by N days, Cancel plan.
- Users list: name, email, phone, roles; per-row "Sign in as" button → calls edge function → opens link.
- Backup card: three buttons — Export Customers / Invoices / Payments as CSV (client-side, uses super-admin RLS).

**Header entry point**: small "Admin" link in avatar dropdown, only rendered when `isSuperAdmin`.

### 4. Granting the first super admin
Migration cannot know which user is you. After the migration is approved, I will use the insert tool to add a `user_roles` row (`role='super_admin'`, `company_id=null`) for the email you specify.

### Technical details
- New files:
  - `src/hooks/useIsSuperAdmin.ts`
  - `src/components/AdminRoute.tsx`
  - `src/pages/admin/AdminDashboard.tsx`
  - `src/pages/admin/AdminCompany.tsx`
  - `src/lib/csv-export.ts`
  - `supabase/functions/admin-impersonate/index.ts`
- Edited: `src/App.tsx` (routes), `src/components/layout/AppLayout.tsx` (dropdown link).
- `user_roles.company_id` is currently NOT NULL — migration will alter it to allow NULL for super admins only, keeping existing FK.

### Confirm
1. Which email should be granted `super_admin` after the migration runs?
2. OK to alter `user_roles.company_id` to nullable (needed so super admins aren't tied to a tenant)?