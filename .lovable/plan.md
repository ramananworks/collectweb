

## Plan: Remove Credit Limit Field and Calculations

### Changes

**1. `src/pages/Customers.tsx`** (lines 163-175)
- Remove the "Credit: ₹X" label and the "X% used" calculation
- Keep the "Terms" label row, simplify layout

**2. `src/components/forms/AddCustomerDialog.tsx`**
- Remove `credit_limit` from schema, defaultValues, and `onSubmit` payload
- Remove the `credit_limit` form field (lines 207-222)

**3. `src/components/forms/EditCustomerDialog.tsx`**
- Remove `credit_limit` from schema, defaultValues, `useEffect` reset, and `onSubmit` payload
- Remove the `credit_limit` form field (lines 136-150)

**4. `src/components/forms/BulkImportCustomersDialog.tsx`**
- Remove `credit_limit` from `ParsedCustomer` interface, CSV parsing, validation, sample CSV, column headers, and preview table

**5. `src/types/index.ts`**
- Remove `credit_limit` from `Customer` interface

**6. `src/hooks/use-data.ts`**
- Remove `credit_limit` from `useAddCustomer` and `useUpdateCustomer` mutation payloads
- Remove from `useBulkImportCustomers` if referenced

No database migration needed — the column can stay harmlessly in the DB with its default value.

