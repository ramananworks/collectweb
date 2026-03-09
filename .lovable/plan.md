
## Plan: Add a Global Floating Action Button (FAB)

To make core actions easily accessible from anywhere in the app, we'll create a Global Floating Action Button (FAB) that expands to show quick actions (Add Customer, Create Invoice, Record Payment) based on the user's permissions.

### 1. Create the FAB Component
We will create a new component `src/components/shared/GlobalFAB.tsx` that will:
- Sit fixed at the bottom-right corner of the screen.
- Present a primary button with a `Plus` icon.
- When tapped, expand smoothly to reveal a vertical list of quick actions.
- Respect role-based access control by using the existing `usePermissions` hook (so it only shows actions the user is allowed to perform).
- Include `hapticLight()` feedback for taps to feel native.
- Hide itself completely if the user has no permissions for any quick actions.
- Automatically close if the user taps outside the menu.
- Manage its own dialog states for `AddCustomerDialog`, `CreateInvoiceDialog`, and `RecordPaymentDialog` just like `DashboardQuickActions`.

### 2. Integrate into the App Layout
We will update `src/components/layout/AppLayout.tsx` to include the `<GlobalFAB />`. By adding it to the main layout, the FAB will be seamlessly available across all screens (Dashboard, Customers, Invoices, Outstanding, etc.) without having to add it to each page individually. 

### Files to Create/Modify
| File | Action |
|------|--------|
| `src/components/shared/GlobalFAB.tsx` | **Create** — Implement the expandable FAB menu with dialog management. |
| `src/components/layout/AppLayout.tsx` | **Modify** — Import and render `<GlobalFAB />` within the main application container. |
