

## Plan: Change Date Format to DD/MM/YYYY in PDF Exports

Update all PDF generation functions to use consistent `DD/MM/YYYY` date format instead of the current `toLocaleDateString("en-IN")` format.

### Files to Update

**1. `src/lib/share-utils.ts` (line 55)**
- Change "Generated on" date from `toLocaleDateString("en-IN", {...})` to `formatDisplayDate(new Date())`

**2. `src/pages/Outstanding.tsx` (line 117)**
- Same change for "Generated on" date in the PDF header

**3. `src/components/dashboard/DrillDownSheet.tsx` (line 94)**
- Same change for "Generated on" date in the PDF header

**4. `src/components/customers/CustomerLedgerSheet.tsx` (line 122)**
- Same change for "Generated on" date in the PDF header

### Implementation
Import `formatDisplayDate` from `@/lib/utils` in each file and replace:
```typescript
// Before
new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

// After
formatDisplayDate(new Date())
```

This produces `09/03/2026` instead of `09 Mar 2026`.

