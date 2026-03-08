

# Outstanding Page Plan

## What to Build
A new "Outstanding" page accessible from the sidebar that shows all customers with outstanding amounts, with expandable invoice breakdowns per customer.

## Changes

### 1. New page: `src/pages/Outstanding.tsx`
- Fetch customers (via `useCustomers`) and invoices (via `useInvoices`)
- Compute each customer's total outstanding from unpaid invoices (`amount - paid_amount` where status is not "paid")
- Show customers sorted by outstanding (highest first), with total outstanding summary at top
- Each customer row is an expandable accordion showing their unpaid invoices (invoice number, date, amount, paid, balance, status badge)
- Search filter by customer name
- Area filter dropdown
- Pull-to-refresh support

### 2. Update `src/components/layout/AppLayout.tsx`
- Add nav item: `{ to: "/outstanding", icon: IndianRupee, label: "Outstanding", roles: null }`

### 3. Update `src/App.tsx`
- Add route: `/outstanding` with `ProtectedLayout`

### Layout
```text
┌─────────────────────────────────┐
│ Outstanding (₹ total)    [filters] │
├─────────────────────────────────┤
│ ▸ Customer A    ₹50,000        │
│   ├ INV-001  ₹20,000  ₹5,000  │
│   └ INV-003  ₹30,000  ₹0      │
│ ▸ Customer B    ₹25,000        │
│   └ INV-002  ₹25,000  ₹0      │
└─────────────────────────────────┘
```

Each invoice row shows: invoice number, invoice date, total amount, paid amount, balance, and status badge. Customer rows show name, area, and total outstanding.

