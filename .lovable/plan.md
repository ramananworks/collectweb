

## Dynamic Overdue Detection Using Due-Date Hierarchy

Currently, the due date is resolved at invoice creation time and stored. The overdue check simply compares the stored `due_date` against today. This means if customer or company default due days change after invoice creation, overdue detection won't reflect the updated terms.

### Problem
All invoices have a `due_date` (NOT NULL), but there's no way to distinguish whether it was explicitly set on the invoice or computed from customer/company defaults. We need to track the source so overdue detection can dynamically re-resolve when defaults change.

### Changes

**1. Database migration — add `due_date_source` column to `invoices`**
- Add column `due_date_source text NOT NULL DEFAULT 'company'` with values: `'invoice'`, `'customer'`, `'company'`
- Existing invoices get `'company'` as default (safe assumption)

**2. `src/components/forms/CreateInvoiceDialog.tsx`**
- Pass the resolved `source` alongside the due date when creating an invoice

**3. `src/hooks/use-data.ts`**
- `useCreateInvoice` / `useBulkImportInvoices`: accept and store `due_date_source`
- `useInvoices` overdue detection: for invoices where `due_date_source` is `'customer'` or `'company'`, re-resolve the due date using `resolveDueDate()` with current customer/company data before comparing against today. For `'invoice'` source, use the stored `due_date` as-is.
- This requires fetching customers and company data inside `useInvoices` query, or moving overdue detection to a higher-level hook that has access to all three datasets.

**4. `src/lib/due-date-resolver.ts`**
- No changes needed — already has the hierarchy logic.

### Technical detail
The overdue detection in `useInvoices` will need to join customer data. Two options:
- **Option A**: Fetch customers inside the `useInvoices` query and do a lookup map — simple, self-contained.
- **Option B**: Create a new composite hook that combines invoices + customers + company — cleaner separation.

I'll use **Option A** for simplicity: fetch customers alongside invoices in the same query function, build a map, and re-resolve due dates for non-invoice-level sources before the overdue check.

