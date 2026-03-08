

## Simplify Invoice Statuses

### New Status Flow
| Status | Meaning | Color |
|--------|---------|-------|
| `pending` | Created, delivery not yet confirmed | Yellow (warning) |
| `delivered` | Delivery OTP confirmed | Blue (primary) |
| `paid` | Fully paid | Green (success) |
| `overdue` | Past due date, not fully paid | Red (destructive) |

**Removed:** `partial` — no longer a valid status.

### Changes

**1. Database migration**
- Update existing invoices with `status = 'partial'` to `'pending'` (they have balance remaining, not yet paid in full — treat as pending)
- Keep default as `'pending'`

**2. `src/types/index.ts`**
- Change `InvoiceStatus` to `"pending" | "paid" | "overdue" | "delivered"`

**3. `src/components/shared/StatusBadges.tsx`**
- Remove `partial` entry
- Change `pending` color from blue/info to yellow/warning

**4. `src/pages/Invoices.tsx`**
- Remove `"partial"` from `statusFilters`

**5. `src/pages/Reports.tsx`**
- Remove `"Partial"` SelectItem from status filter

**6. `src/hooks/use-data.ts`**
- In `useRecordPayment`: when payment recorded but not fully paid, keep status as-is (pending/delivered) instead of setting to `"partial"`. Only update to `"paid"` when fully paid.

**7. `supabase/functions/delivery-otp/index.ts`**
- No change needed — already sets status to `"delivered"` on OTP verify.

