

## Plan: Add "Confirm Delivery" to FAB and Quick Actions

### Challenge
The `DeliveryConfirmDialog` requires an `invoiceId` and `customerName`, so unlike other quick actions that open a standalone form, this one needs the user to first select which pending invoice to confirm. We need an intermediate selection step.

### Approach
Create a new `SelectDeliveryInvoiceDialog` that:
1. Fetches pending (undelivered, non-OTP-verified) invoices
2. Shows a searchable list for the user to pick one
3. On selection, opens the existing `DeliveryConfirmDialog`

Then wire this into both the FAB and Dashboard Quick Actions.

### Changes

**1. New file: `src/components/forms/SelectDeliveryInvoiceDialog.tsx`**
- Dialog with a search input and scrollable list of pending invoices (filtered to `status === 'pending'` and `otp_verified !== true`)
- Uses `useInvoices()` hook to fetch data
- On selecting an invoice, closes itself and opens `DeliveryConfirmDialog` with the selected `invoiceId` and `customerName`
- Combines both dialogs internally for clean API: `open`, `onOpenChange` props only

**2. Update `src/components/shared/GlobalFAB.tsx`**
- Add `"delivery"` to `ActionKey` type
- Add delivery action entry: `{ key: "delivery", label: "Confirm Delivery", icon: Truck, gradientClass: "action-delivery" }` (using orange/amber gradient class)
- Filter by `canConfirmDelivery` permission
- Render `SelectDeliveryInvoiceDialog` for `openDialog === "delivery"`
- Add matching glow color for hover effect (amber/orange hue)

**3. Update `src/components/dashboard/DashboardQuickActions.tsx`**
- Same additions: new action key, entry, permission filter, and dialog render

**4. Update `src/index.css`** (if needed)
- Add `.action-delivery` gradient class (amber/orange theme) to match existing action gradient pattern

### Technical Notes
- Permission gated by `canConfirmDelivery` (owner, manager, delivery_staff)
- Grid changes from `grid-cols-3` to `grid-cols-4` in Quick Actions if 4 actions visible, or stays responsive
- Delivery action uses `Truck` icon from lucide-react (already imported in Invoices page)

