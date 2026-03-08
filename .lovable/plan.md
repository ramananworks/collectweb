

## Include Mock Data for Development

Since authentication is turned off for development, the database queries return empty results due to security policies. This plan adds mock/fallback data directly into the data hooks so all pages display realistic sample data.

### What will change

**1. Update `src/hooks/use-data.ts`** - Add a `DEV_MODE` flag and mock data constants

- Add a `const DEV_MODE = true;` flag at the top of the file
- Define mock data arrays matching the exact database types (`Customer`, `Invoice`, `Payment`, `Area`, `Company`, `Profile`) using the data from the existing `src/lib/mock-data.ts` as reference but conforming to the Supabase table schemas
- Update each query hook (`useCustomers`, `useInvoices`, `usePayments`, `useAreas`, `useCompany`, `useProfiles`) to return mock data immediately when `DEV_MODE` is true, skipping the database call

**2. Mock data included:**
- **6 customers** across different areas (MG Road, Station Area, Gandhi Nagar, etc.) with varying outstanding balances and credit limits
- **6 invoices** with mixed statuses (pending, partial, paid, overdue)
- **5 payments** with different modes (cash, UPI, bank transfer)
- **6 areas** matching the customer areas
- **1 company** (Sharma Traders Pvt Ltd)
- **4 profiles** (owner, manager, 2 staff members) for the assigned-to dropdown and user filter

**3. Mutation hooks** (`useAddCustomer`, `useCreateInvoice`, `useRecordPayment`, etc.) will remain unchanged -- they will still attempt real database operations. This is acceptable since mock data is only for visual development/preview.

### Technical details

Each hook will be updated like this pattern:
```typescript
export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      if (DEV_MODE) return mockCustomers;
      // ... existing Supabase query
    },
  });
}
```

The mock data UUIDs will use simple placeholder values (e.g., `"00000000-0000-0000-0000-000000000001"`) to avoid conflicts. All fields will match the exact Supabase `Row` types (including `created_at` as ISO strings, `bill_image_url`, `assigned_to`, etc.).

When you're ready to re-enable real data, simply set `DEV_MODE = false`.
