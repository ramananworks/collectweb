

## Plan: Add User-wise Filter to Collections Page

Add a "Collected By" dropdown filter to the Collections page, matching the pattern used in the Customers page for user filtering.

### Changes in `src/pages/Collections.tsx`

1. **Import `useProfiles`** from `use-data` hook
2. **Add state**: `const [userFilter, setUserFilter] = useState("all")`
3. **Fetch profiles**: `const { data: profiles = [] } = useProfiles()`
4. **Filter logic**: Add to `filteredPayments` filter — if `userFilter !== "all"`, match `p.collected_by` against the selected profile's name
5. **UI**: Add a `<Select>` dropdown after the Mode filter with options "All Staff" + each profile's name

### No database or backend changes needed — `collected_by` is already stored as a text name on each payment record.

