

## Fix: Remove `assigned_to` Column References from Code

### Root Cause
The error "Could not find the 'assigned_to' column of 'customers' in the schema cache" occurs because the code references an `assigned_to` field that doesn't exist in the database `customers` table (it was previously removed per the memory note about removing the Assigned To staff field).

### Changes

#### `src/hooks/use-data.ts`

1. **`useAddCustomer`** (lines 166-175): Remove `assigned_to` from the type definition and from the row object construction.

2. **`useUpdateCustomer`** (lines 296-298): Remove `assigned_to` from the type definition. Since the update uses `...rest` spread, removing it from the type is sufficient.

### Files Changed
1. `src/hooks/use-data.ts` — Remove all `assigned_to` references from `useAddCustomer` and `useUpdateCustomer`

