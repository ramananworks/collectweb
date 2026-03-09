

## Plan: Audit Payment Collection Logic to Prevent Double Balance Adjustments

### Problem Identified

After auditing the codebase, there are two sources of double-counting risk:

1. **`invoices.paid_amount` is mutated directly** in `useRecordPayment` (line 260: `inv.paid_amount + values.amount`). If this runs twice (race condition, retry), `paid_amount` becomes inflated. The value should be **derived from the sum of payments**, not incremented.

2. **`customers.outstanding` is a stale static column** (always set to `0` on insert, never updated). The Customers page reads `c.outstanding` directly, showing incorrect data. This should be **computed from invoices** on the frontend.

### Changes

**1. `src/hooks/use-data.ts` — Derive `paid_amount` from payments instead of mutating**

In `useRecordPayment`, after inserting the payment, replace the direct increment logic:

```typescript
// BEFORE (buggy — races cause double-counting):
const newPaid = inv.paid_amount + values.amount;

// AFTER (derived — always correct):
const { data: totalPaid } = await supabase
  .from("payments")
  .select("amount")
  .eq("invoice_id", values.invoice_id);
const newPaid = (totalPaid || []).reduce((sum, p) => sum + Number(p.amount), 0);
```

Then update the invoice with the reconciled `paid_amount` and derived status. Also add a guard: if `newPaid > inv.amount`, cap it to prevent negative balances (don't allow overpayment unless we want credit).

**2. `src/hooks/use-data.ts` — Add a `useCustomerOutstanding` helper or enrich `useCustomers`**

Create a derived computation that replaces the stale `customers.outstanding` column:

```typescript
// In useCustomers or a new hook, compute outstanding from invoices:
const outstanding = invoices
  .filter(inv => inv.customer_id === customerId && inv.status !== "paid")
  .reduce((sum, inv) => sum + (inv.amount - inv.paid_amount), 0);
```

**3. `src/pages/Customers.tsx` — Use derived outstanding instead of `c.outstanding`**

Replace `c.outstanding` references (lines 136, 138, 156, 157) with the computed value from invoices data. Import `useInvoices` and build a `customerOutstandingMap` in a `useMemo`.

**4. Validation in `RecordPaymentDialog.tsx` — Prevent overpayment**

Add a check in the form's amount validation: the entered amount must not exceed the invoice balance (`inv.amount - actualPaidFromPayments`). This prevents negative balances at the input level.

### Files Modified
- `src/hooks/use-data.ts` — reconcile `paid_amount` from payments sum; remove direct increment
- `src/pages/Customers.tsx` — derive outstanding from invoices instead of stale column
- `src/components/forms/RecordPaymentDialog.tsx` — add overpayment guard

### No Database Changes Required
The `customers.outstanding` column can remain (harmless) but will no longer be read for display. All balances become ledger-derived.

