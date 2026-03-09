

## Plan: Change date format to DD-MMM-YY across all reports

**Goal**: Update all date displays from `DD/MM/YYYY` to `DD-MMM-YY` (e.g., `09-Mar-26`).

### Changes

**1. `src/lib/utils.ts` — Update `formatDisplayDate`**
Change the central formatter to output `DD-MMM-YY` using short month names (Jan, Feb, etc.) and 2-digit year.

```typescript
export function formatDisplayDate(date: string | Date): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const month = months[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}
```

This single change covers **all 7 files** importing `formatDisplayDate`: Dashboard, Invoices, Outstanding, DrillDownSheet, CustomerLedgerSheet, share-utils, Collections references.

**2. Inline `format()` calls using `"dd/MM/yyyy"` — 4 files**

Replace all `format(date, "dd/MM/yyyy")` with `format(date, "dd-MMM-yy")` (date-fns format tokens):

- `src/components/customers/CustomerLedgerSheet.tsx` — PDF rows, date picker buttons, table cells (4 occurrences)
- `src/components/forms/SelectDeliveryInvoiceDialog.tsx` — invoice date display (1 occurrence)
- `src/pages/Collections.tsx` — date picker buttons (2 occurrences)

**3. `src/lib/share-utils.ts` — `toLocaleDateString` call**

Update the PDF "Generated on" line to use the same DD-MMM-YY format for consistency.

### Summary
- 1 central utility change covers most usages
- ~7 inline format string replacements across 3-4 files
- No backend or schema changes

