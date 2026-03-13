

## Plan: Add Green Check Circle for "Collected Today" Customers

Replace the text badge with a subtle green circular checkmark icon next to the Collect button for customers who have a payment recorded today.

### Changes in `src/pages/Outstanding.tsx`

1. **Import `usePayments`** and add `"payments"` to pull-to-refresh query keys.

2. **Import `CheckCircle2`** from `lucide-react` and `Badge` from UI.

3. **Compute `todayCollectedSet`** — memoized `Set<string>` of customer IDs with payments today. Map payments → invoices → customer_id.

4. **Render green check icon** — next to the Collect button (both mobile and desktop variants), show:
   ```tsx
   {todayCollectedSet.has(customer.id) && (
     <CheckCircle2 className="h-5 w-5 text-success opacity-40 shrink-0" />
   )}
   ```
   A low-opacity green check circle icon, placed right before the Collect button.

