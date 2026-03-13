

## Plan: Enhance Outstanding List for Mobile

Looking at the screenshot, the current layout has issues on mobile — the customer name, amount, and Collect button compete for horizontal space, causing text overflow. The expanded invoice table also has too many columns for small screens.

### Changes in `src/pages/Outstanding.tsx`

**1. Customer card layout — mobile-optimized**
- Restructure the customer row to stack on mobile: name + area on top row, amount + Collect button on bottom row
- On mobile (`sm:` breakpoint), switch from single-line flex to a two-line layout:
  - Line 1: Chevron + customer name (truncated) 
  - Line 2: Area/invoice count + amount + Collect button (right-aligned)
- Use `flex-wrap` or nested divs with responsive classes

**2. Expanded invoice breakdown — mobile columns**
- On mobile, merge Invoice # and Date into one column (invoice number on line 1, date on line 2) — same pattern used on Invoices page
- Hide the Amount column on mobile, show only Balance (the key info for outstanding)
- Hide Status badge on mobile to save space (balance + overdue context is already implied)
- Desktop layout remains unchanged with all 5 columns

**3. Spacing and touch targets**
- Increase vertical padding on customer rows for better touch targets (`py-4` on mobile)
- Ensure Collect button has adequate tap size

### Summary of responsive visibility
| Column | Mobile | Desktop |
|--------|--------|---------|
| Invoice + Date (merged) | visible | hidden |
| Invoice | hidden | visible |
| Date | hidden | visible |
| Amount | hidden | visible |
| Balance | visible | visible |
| Status | hidden | visible |

