

## Plan: Reposition Check Circle as Large Background Watermark

Move the `CheckCircle2` icon from inline (next to Collect button) to a large, low-opacity watermark positioned at the top-right corner of the card, rendered behind the card content.

### Changes in `src/pages/Outstanding.tsx`

**1. Remove inline CheckCircle2 icons** (lines 296-298 and 316-318) — delete both mobile and desktop instances.

**2. Add watermark CheckCircle2 inside the card wrapper** (line 278 area) — render the icon as an absolutely positioned element in the top-right corner of the card, behind content:

```tsx
<div key={customer.id} className="rounded-xl border bg-card overflow-hidden relative">
  {/* Collected-today watermark */}
  {todayCollectedSet.has(customer.id) && (
    <CheckCircle2 className="absolute top-2 right-2 h-16 w-16 text-success opacity-15 pointer-events-none" />
  )}
  {/* Customer row button... */}
```

- `relative` on the card container for positioning context
- `absolute top-2 right-2` places it top-right
- `h-16 w-16` makes it roughly 1/3 of card height
- `opacity-15` keeps it subtle as a background watermark
- `pointer-events-none` ensures it doesn't block clicks on the Collect button

