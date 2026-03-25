

## Fix: Ledger Not Scrolling to End

### Root Cause
The `ScrollArea` (line 255) has `className="flex-1"` inside a flex column container, but it lacks `min-h-0`. In CSS flexbox, flex children default to `min-height: auto`, which prevents them from shrinking below their content size — so the ScrollArea expands to fit all content instead of constraining and scrolling.

### Fix
**File: `src/components/customers/CustomerLedgerSheet.tsx`** — Line 255

Add `min-h-0` to the ScrollArea so it properly constrains within the flex layout and enables scrolling:

```tsx
// Before
<ScrollArea className="flex-1">

// After
<ScrollArea className="flex-1 min-h-0">
```

This single change fixes both the mobile Drawer and desktop Sheet since both use the same `bodyContent` variable.

