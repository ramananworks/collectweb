

## Plan: Remove "Assigned To" Field from Add Customer Form

Remove the "Assigned To" dropdown from the AddCustomerDialog form.

### Changes in `src/components/forms/AddCustomerDialog.tsx`

1. **Remove from schema** (line 32): Delete `assigned_to: z.string().optional()`
2. **Remove from default values** (line 53): Delete `assigned_to: undefined`
3. **Remove from onSubmit** (line 65): Delete `assigned_to: values.assigned_to`
4. **Remove useProfiles import** (line 13): Remove `useProfiles` from the import
5. **Remove useProfiles hook call** (line 48): Delete `const { data: profiles = [] } = useProfiles()`
6. **Remove FormField** (lines 224-239): Delete the entire "Assigned To" FormField block

