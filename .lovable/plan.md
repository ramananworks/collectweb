

## Add Inline "Create Area" Option in Add & Edit Customer Dialogs

### Overview
Add a "+ Create New Area" option at the bottom of the area dropdown in both the Add Customer and Edit Customer dialogs. When selected, it shows an inline input field to type and save a new area name, which gets added to the database and auto-selected.

### Changes

#### `src/components/forms/AddCustomerDialog.tsx`
1. Import `useAddArea` from `use-data`
2. Add state: `isCreatingArea`, `newAreaName`
3. Replace the Area `Select` with a combined UI:
   - Show the existing Select dropdown with an extra item `+ Create New Area` at the bottom
   - When that item is clicked, toggle to an inline input + Save/Cancel buttons
   - On save, call `addArea.mutate(newAreaName)`, then set the form field value to the new area name
4. Reset `isCreatingArea` state when dialog closes

#### `src/components/forms/EditCustomerDialog.tsx`
1. Same pattern — import `useAddArea`, add `isCreatingArea`/`newAreaName` state
2. Add `+ Create New Area` option to the area Select
3. Inline input + save flow identical to AddCustomerDialog

### UX Flow
```text
Area: [Select area          ▼]
      ├─ Andheri
      ├─ Bandra
      ├─ Dadar
      └─ + Create New Area     ← special item

Click "Create New Area" →

Area: [Type area name____] [✓] [✗]
```

After saving, the new area appears in the dropdown and is auto-selected.

### Technical Details
- `useAddArea` already exists in `use-data.ts` and handles inserting into the `areas` table with company_id + cache invalidation
- The `+ Create New Area` SelectItem uses a special sentinel value (e.g. `__create_new__`) to detect selection and switch to input mode
- Duplicate check against existing `areas` array (case-insensitive) before saving

### Files Changed
1. `src/components/forms/AddCustomerDialog.tsx` — Add inline area creation
2. `src/components/forms/EditCustomerDialog.tsx` — Add inline area creation

