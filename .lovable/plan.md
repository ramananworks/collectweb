

## Auto-Create Areas During Bulk Customer Import

### Overview
When bulk importing customers, if a CSV row contains an area name that doesn't exist in the company's areas table, automatically create it before inserting the customers.

### Changes

#### `src/hooks/use-data.ts` — `useBulkImportCustomers`
1. Before inserting customers, fetch existing areas for the company
2. Collect unique non-empty area names from the import data
3. Filter to find new areas (case-insensitive comparison against existing)
4. Insert new areas into the `areas` table
5. Invalidate the `areas` query key on success (in addition to `customers`)

```text
mutationFn flow:
  1. Fetch existing areas: SELECT name FROM areas WHERE company_id = X
  2. Collect unique area names from CSV rows (non-empty, trimmed)
  3. Filter out names already in existing areas (case-insensitive)
  4. INSERT new areas into areas table
  5. INSERT customers as before
```

### Files Changed
1. `src/hooks/use-data.ts` — Add area auto-creation logic to `useBulkImportCustomers`, invalidate `areas` query

