

## Make Customer Ledger Mobile Responsive

### Problems
- 5-column table (Date, Particulars, Debit, Credit, Balance) overflows on small screens
- Fixed column widths (`w-[90px]`, `w-[100px]`, `w-[110px]`) don't fit mobile viewports
- Header section with summary stats and date filters doesn't stack well

### Solution

**File: `src/components/customers/CustomerLedgerSheet.tsx`**

1. **Mobile card layout instead of table**: On mobile (`isMobile` is already available), render each ledger entry as a compact card instead of a table row:
   - Line 1: Date (left) + Balance with Dr/Cr (right, bold, colored)
   - Line 2: Particulars text (full width, truncated)
   - Line 3: Debit amount (red, left) + Credit amount (green, right)

2. **Keep desktop table as-is**: Wrap the current `<Table>` in a condition — only render on `!isMobile`.

3. **Mobile footer summary**: Show closing balance as a sticky bottom bar on mobile with Debit total, Credit total, and Balance.

4. **Header adjustments**: Reduce padding on mobile (`p-4` instead of `p-5`), ensure summary stats wrap cleanly in a grid layout on small screens.

### Technical Details

- Use the existing `isMobile` hook (already imported)
- Mobile entries: `div` with `border-b` styling, compact `py-3 px-4` padding
- Footer: sticky `bottom-0` bar with background matching card color
- No new dependencies needed

